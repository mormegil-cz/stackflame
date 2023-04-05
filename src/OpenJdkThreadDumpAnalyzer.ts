import * as Definitions from './Definitions';
import ProgressMonitor from './ProgressMonitor';
import CoreDumpAnalyzer from './CoreDumpAnalyzer';

enum State {
    START,
    BETWEEN,
    THREAD_STATE,
    CALLSTACK,
    LOCKS
}

export default class OpenJdkThreadDumpAnalyzer extends CoreDumpAnalyzer {
    public async parseCoreDump(coreDump: string, settings: Definitions.AnalysisSettings, loadProgressMonitor: ProgressMonitor): Promise<Definitions.FlameGraphTree | null> {
        loadProgressMonitor.reportPhase(Definitions.PHASE_SPLIT, 1);
        const lines = coreDump.split(/\r?\n/);
        loadProgressMonitor.reportPhase(Definitions.PHASE_PARSE_TEXT, lines.length);

        let state: State = State.START;
        let stacks: Definitions.StackTrace[] = [];
        let currentThread: string = null;
        let currentStack: string[] = [];

        for (let i = 0; i < lines.length; ++i) {
            await loadProgressMonitor.reportProgress(i);
            const line = lines[i].trim();

            function stateStart(): State {
                if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(line)) return State.START;
                if (/^Full thread dump /.test(line)) return State.START;
                return stateBetween();
            }

            function stateBetween(): State {
                if (line.startsWith('"')) {
                    if (currentThread) {
                        stacks.push({ thread: currentThread, stack: currentStack });
                        currentStack = [];
                    }
                    const endQuote = line.indexOf('"', 1);
                    currentThread = line.substring(1, endQuote);
                    return State.THREAD_STATE;
                } else if (line.startsWith('JNI global references:')) {
                    return State.BETWEEN;
                } else if (line) {
                    // ??
                    console.warn("Invalid/unsupported format", line);
                    return State.BETWEEN;
                } else {
                    return State.BETWEEN;
                }
            }

            function stateThreadState(): State {
                // ...
                return State.CALLSTACK;
            }

            function stateCallstack(): State {
                if (!line) return State.CALLSTACK;

                if (line.startsWith('"')) {
                    return stateBetween();
                } else if (line === '(in native)') {
                    currentStack.push('[native code]');
                } else if (line.startsWith('on ')) {
                    if (settings.showWaitingOn) {
                        currentStack.push('> ' + line.substring(3));
                    }
                } else if (line.startsWith('at ')) {
                    currentStack.push(line.substring(3));
                } else if (line.startsWith('- locked')) {
                    if (settings.showEnteredLock) {
                        currentStack.push('>' + line.substring(2));
                    }
                } else if (line.startsWith('- parking') || line.startsWith('- waiting')) {
                    if (settings.showWaitingOn) {
                        currentStack.push('>' + line.substring(2));
                    }
                } else if (line === 'Locked ownable synchronizers:') {
                    return State.LOCKS;
                } else if (line.startsWith('JNI global references:')) {
                    return State.BETWEEN;
                } else {
                    // ?
                    console.warn("Invalid/unsupported format", line);
                }

                return State.CALLSTACK;
            }

            function stateLocks(): State {
                if (!line) return stateBetween();

                // trim bullet
                const resource = line.substring(1).trim();

                if (resource !== 'None' && settings.showEnteredLock) {
                    currentStack.push('> ' + resource);
                }

                return State.LOCKS;
            }

            function runState(s: State): State {
                switch (s) {
                    case State.START:
                        return stateStart();

                    case State.BETWEEN:
                        return stateBetween();

                    case State.THREAD_STATE:
                        return stateThreadState();

                    case State.CALLSTACK:
                        return stateCallstack();

                    case State.LOCKS:
                        return stateLocks();

                    default:
                        throw new Error('Unexpected state ' + s);
                }
            }

            state = runState(state);
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
