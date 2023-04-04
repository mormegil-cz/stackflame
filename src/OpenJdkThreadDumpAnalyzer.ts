import * as Definitions from './Definitions';
import ProgressMonitor from './ProgressMonitor';
import CoreDumpAnalyzer from './CoreDumpAnalyzer';

enum State {
    BETWEEN,
    THREAD_STATE,
    CALLSTACK
}

export default class IbmCoreDumpAnalyzer extends CoreDumpAnalyzer {
    public async parseCoreDump(coreDump: string, settings: Definitions.AnalysisSettings, loadProgressMonitor: ProgressMonitor): Promise<Definitions.FlameGraphTree | null> {
        loadProgressMonitor.reportPhase(Definitions.PHASE_SPLIT, 1);
        const lines = coreDump.split(/\r?\n/);
        loadProgressMonitor.reportPhase(Definitions.PHASE_PARSE_TEXT, lines.length);

        let state: State = State.BETWEEN;
        let stacks: Definitions.StackTrace[] = [];
        let currentThread: string = null;
        let currentStack: string[] = [];
        for (let i = 0; i < lines.length; ++i) {
            await loadProgressMonitor.reportProgress(i);
            const line = lines[i].trim();

            switch (state) {
                case State.BETWEEN:
                    if (line.startsWith('"')) {
                        const endQuote = line.indexOf('"', 1);
                        currentThread = line.substring(1, endQuote);
                        state = State.THREAD_STATE;
                    } else if (line) {
                        // ??
                        console.warn("Invalid/unsupported format");
                    }
                    break;

                case State.THREAD_STATE:
                    // ...
                    state = State.CALLSTACK;
                    break;

                case State.CALLSTACK:
                    if (line) {
                        if (line === '(in native)') {
                            currentStack.push('[native code]');
                        } else if (line.startsWith('on ')) {
                            if (settings.showWaitingOn) {
                                currentStack.push('> ' + line.substring(3));
                            }
                        } else if (line.startsWith('at ')) {
                            currentStack.push(line.substring(3));
                        } else {
                            // ?
                            console.warn("Unexpected format");
                        }
                    } else {
                        state = State.BETWEEN;
                        stacks.push({ thread: currentThread, stack: currentStack });
                        currentThread = null;
                        currentStack = [];
                    }
                    break;
            }
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
