import * as Definitions from './Definitions';
import ProgressMonitor from './ProgressMonitor';
import CoreDumpAnalyzer from './CoreDumpAnalyzer';

export default class IbmSystemOutAnalyzer extends CoreDumpAnalyzer {
    public async parseCoreDump(coreDump: string, settings: Definitions.AnalysisSettings, loadProgressMonitor: ProgressMonitor): Promise<Definitions.FlameGraphTree | null> {
        loadProgressMonitor.reportPhase(Definitions.PHASE_SPLIT, 1);
        const lines = coreDump.split(/\r?\n/);
        loadProgressMonitor.reportPhase(Definitions.PHASE_PARSE_TEXT, lines.length);

        let stacks: Definitions.StackTrace[] = [];
        let currentThread: string = null;
        let currentStack: string[] = [];
        let insideHungStack = false;
        for (let i = 0; i < lines.length; ++i) {
            await loadProgressMonitor.reportProgress(i);
            const line = lines[i];

            const parsed = line.match(/ThreadMonitor W   WSVR0605W: Thread "[^"]+" \([0-9a-z]+\) has been active for [0-9]+ milliseconds and may be hung/);
            if (parsed) {
                if (insideHungStack) {
                    stacks.push({ thread: currentThread, stack: currentStack });
                    currentThread = line;
                    currentStack = [];
                }
                insideHungStack = true;
            } else if (insideHungStack) {
                if (line.startsWith('\tat')) {
                    const parsed = line.match(/\s*at ([^(]+)/);
                    const methodName = parsed[1];
                    currentStack.push(methodName.replace(/\//g, '.'));
                } else {
                    stacks.push({ thread: currentThread, stack: currentStack });
                    currentThread = line;
                    currentStack = [];
                    insideHungStack = false;
                }
            }
        }

        if (insideHungStack) {
            stacks.push({ thread: currentThread, stack: currentStack });
        }

        if (!stacks.length) {
            return null;
        }

        return await this.parseStacks(stacks, loadProgressMonitor);
    }
}
