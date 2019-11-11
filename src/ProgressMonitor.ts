export default class ProgressMonitor {
    private currentPhase: number;
    private phaseSize: number;
    private lastUpdate: number;

    public constructor(private phaseCount: number, private eProgress: HTMLElement) {
        this.currentPhase = 0;
        this.phaseSize = 1;
        this.lastUpdate = 0;
    }

    public reportPhase(phase: number, size: number): void {
        this.currentPhase = phase;
        this.phaseSize = size;
        this.lastUpdate = 0;
        this.reportProgress(0);
    }

    public async reportProgress(progress: number): Promise<void> {
        const now = Date.now();
        if (now - this.lastUpdate > 800) {
            this.lastUpdate = now;
            const totalProgress = (this.currentPhase + progress / this.phaseSize) / this.phaseCount;
            this.eProgress.style.width = Math.round(totalProgress * 100) + '%';
            await ProgressMonitor.sleep(30);
            this.lastUpdate = now;
        }
    }

    static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
