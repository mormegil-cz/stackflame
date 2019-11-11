import * as Definitions from './Definitions';
import ProgressMonitor from './ProgressMonitor';
import CoreDumpAnalyzer from './CoreDumpAnalyzer';

export default class IbmCoreDumpAnalyzer extends CoreDumpAnalyzer {
    public async parseCoreDump(coreDump: string, settings: Definitions.AnalysisSettings, loadProgressMonitor: ProgressMonitor): Promise<Definitions.FlameGraphTree | null> {
        loadProgressMonitor.reportPhase(Definitions.PHASE_SPLIT, 1);
        const lines = coreDump.split(/\r?\n/);
        loadProgressMonitor.reportPhase(Definitions.PHASE_PARSE_TEXT, lines.length);

        let stacks: Definitions.StackTrace[] = [];
        let currentThread: string = null;
        let currentStack: string[] = [];
        for (let i = 0; i < lines.length; ++i) {
            await loadProgressMonitor.reportProgress(i);
            const line = lines[i];
            if (line.startsWith('3XMTHREADINFO ')) {
                if (currentStack.length) {
                    stacks.push({ thread: currentThread, stack: currentStack });
                    currentThread = line;
                    currentStack = [];
                }
            } else if (line.startsWith('4XESTACKTRACE ')) {
                const parsed = line.match(/^4XESTACKTRACE\s*at ([^(]+)/);
                const methodName = parsed[1];
                currentStack.push(methodName.replace(/\//g, '.'));
            } else if (line.startsWith('3XMTHREADBLOCK ')) {
                if (settings.showWaitingOn) {
                    const parsed = line.match(/^[0-9A-Z]*\s*\(?(.+)\)?$/);
                    const text = parsed[1];
                    currentStack.push('> ' + text);
                }
            } else if (line.startsWith('5XESTACKTRACE ')) {
                if (settings.showEnteredLock) {
                    const parsed = line.match(/^[0-9A-Z]*\s*\(?(.+)\)?$/);
                    const text = parsed[1];
                    currentStack.push('> ' + text);
                }
            }

            // 3XMJAVALTHREAD
            // 3XMTHREADINFO1
            // 3XMTHREADINFO2
            // 3XMCPUTIME
            // 3XMHEAPALLOC
        }

        if (currentStack.length) {
            stacks.push({ thread: currentThread, stack: currentStack });
        }

        if (!stacks.length) {
            return null;
        }

        return await this.parseStacks(stacks, loadProgressMonitor);
    }
}
