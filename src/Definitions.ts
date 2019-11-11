export const PHASE_UPLOAD = 0;
export const PHASE_SPLIT = 1;
export const PHASE_PARSE_TEXT = 2;
export const PHASE_PARSE_STACKS = 3;
export const PHASE_BUILD_TREE = 4;
export const PHASE_COUNT = 5;

export class AnalysisSettings {
    constructor(
        public showWaitingOn: boolean,
        public showEnteredLock: boolean) {
    }
}

export interface FlameGraphTree {
    name: string;
    value: number;
    children?: FlameGraphTree[];
}

export interface StackTrace {
    thread: string;
    stack: string[];
}

export interface StackTree {
    [key: string]: StackTree | number;
}
