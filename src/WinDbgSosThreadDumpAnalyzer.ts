import * as Definitions from './Definitions';
import ProgressMonitor from './ProgressMonitor';
import CoreDumpAnalyzer from './CoreDumpAnalyzer';

export default class WinDbgSosThreadDumpAnalyzer extends CoreDumpAnalyzer {
    public async parseCoreDump(coreDump: string, settings: Definitions.AnalysisSettings, loadProgressMonitor: ProgressMonitor): Promise<Definitions.FlameGraphTree | null> {
        loadProgressMonitor.reportPhase(Definitions.PHASE_SPLIT, 1);
        const lines = coreDump.split(/\r?\n/);
        loadProgressMonitor.reportPhase(Definitions.PHASE_PARSE_TEXT, lines.length);

        let stacks: Definitions.StackTrace[] = [];
        let currentThread: string = null;
        let currentStack: string[] = [];
        for (let i = 0; i < lines.length; ++i) {
            await loadProgressMonitor.reportProgress(i);
            const line = lines[i].trim();
            if (!line.length) continue;

            if (line.startsWith('---')) {
                if (currentStack.length) {
                    stacks.push({thread: currentThread, stack: currentStack});
                }
                currentThread = null;
                currentStack = [];
            } else if (line.startsWith('Thread ')) {
                currentThread = line.substring(7).trim();
            } else if ((line[0] >= '0' && line[0] <= '9') || (line[0] >= 'a' && line[0] <= 'f')) {
                const columns = line.split(/ /);
                currentStack.push(WinDbgSosThreadDumpAnalyzer.parseMethodInfo(columns.slice(2)));
            } else if (line.startsWith('Current frame:') || line.startsWith('Child-SP')) {
                continue;
            } else {
                console.warn("Invalid/unsupported format", line);
            }
        }

        if (currentStack.length) {
            stacks.push({thread: currentThread, stack: currentStack});
        }

        if (!stacks.length) {
            return null;
        }

        return await this.parseStacks(stacks, loadProgressMonitor);
    }

    private static parseMethodInfo(columns: string[]): string {
        const methodInfo = columns[0] === '(MethodDesc' ? columns[3] : columns[0];
        const plus = methodInfo.indexOf('+');
        return plus < 0 ? methodInfo.replace(',', '') : methodInfo.substring(0, plus);
    }
}
