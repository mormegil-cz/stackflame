import * as Definitions from './Definitions';
import ProgressMonitor from './ProgressMonitor';
import CoreDumpAnalyzer from './CoreDumpAnalyzer';

// format for `clrstack -all -n`
export default class ClrStackAnalyzer extends CoreDumpAnalyzer {
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
            } else if (line.startsWith('OS Thread Id: ')) {
                if (currentStack.length) {
                    stacks.push({thread: currentThread, stack: currentStack});
                }
                currentStack = [];
                currentThread = line.substring(14).trim();
            } else if ((line[0] >= '0' && line[0] <= '9') || (line[0] >= 'a' && line[0] <= 'f')) {
                const columns = line.split(/ /);
                currentStack.push(ClrStackAnalyzer.processMethodInfo(columns.slice(2).join(' ')));
            } else if (line.startsWith('Child SP')) {
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

    private static processMethodInfo(info: string): string {
        if (!info.startsWith('[')) return info;

        const end = info.indexOf(']');
        const flag = info.substring(1, end);
        const colon = flag.indexOf(':');
        return colon < 0 ? '[' + flag + '] ' + info.substring(end + 1) : '[' + flag.substring(0, colon) + '] ' + info.substring(end + 1);
    }
}
