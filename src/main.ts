import * as d3 from 'd3';
import { flamegraph as fg } from 'd3-flame-graph';

namespace StackFlame {
    const $: (id: string) => HTMLElement = document.getElementById.bind(document);
    const eHomeLink = $('homeLink');
    const eResetZoom = $('resetZoom');
    const eSearchBox = $('searchBox') as HTMLInputElement;
    const eUploadForm = $('uploadForm');
    const eUploadBtn = $('uploadBtn');
    const eWaitingOnCB = $('waitingOnCB') as HTMLInputElement;
    const eEnteredLockCB = $('enteredLockCB') as HTMLInputElement;
    const eFileElem = $('fileElem') as HTMLInputElement;
    const eUploadSpinner = $('uploadSpinner');
    const eUploadProgressWrapper = $('uploadProgressWrapper');
    const eUploadProgress = $('uploadProgress');
    const eUploadCaption = $('uploadCaption');
    const eLoadedContainer = $('loadedContainer');
    const eGraph = $('graph');
    const eGraphDetail = $('graphDetail');

    const PHASE_UPLOAD = 0;
    const PHASE_SPLIT = 1;
    const PHASE_PARSE_TEXT = 2;
    const PHASE_PARSE_STACKS = 3;
    const PHASE_BUILD_TREE = 4;
    const PHASE_COUNT = 5;

    let showWaitingOn = false;
    let showEnteredLock = false;
    let loading = false;
    let flameGraph: d3.Flamegraph | null;

    export function init() {
        eHomeLink.addEventListener('click', onHomeClick);
        eResetZoom.addEventListener('click', onResetZoomClick);
        eSearchBox.addEventListener('input', onSearchBoxChange);
        eUploadBtn.addEventListener('click', onUploadBtnClick, false);
        eFileElem.addEventListener('change', onFilesUploaded);
    }

    function onHomeClick(event: Event) {
        event.preventDefault();
        resetEverything();
    }

    function onResetZoomClick(event: Event) {
        event.preventDefault();
        if (flameGraph) flameGraph.resetZoom();
    }

    function onSearchBoxChange() {
        if (flameGraph) {
            d3.arc()
            const term = eSearchBox.value;
            if (term) flameGraph.search(term);
            else flameGraph.clear();
        }
    }

    function onUploadBtnClick(event: Event) {
        event.preventDefault();
        if (loading) return;

        // FIXME! BOOO! Ugly
        (d3 as any).flamegraph = fg;
        eFileElem.click();
    }

    function onFilesUploaded(event: Event) {
        loading = true;
        loadProgressMonitor.reportPhase(PHASE_UPLOAD, 1);
        eUploadSpinner.style.removeProperty('display');
        eUploadProgressWrapper.style.removeProperty('display');
        eUploadCaption.textContent = 'Loading…';
        eUploadBtn.setAttribute('disabled', '');

        showWaitingOn = eWaitingOnCB.checked;
        showEnteredLock = eEnteredLockCB.checked;

        const files = eFileElem.files;

        if (!files.length) {
            resetEverything();
            return;
        }

        const file = files[0];

        const reader = new FileReader();
        reader.onload = async evt => {
            const tree = await parseCoreDump(evt.target.result as string);
            if (!tree) {
                alert('No usable data found in the file');
                resetEverything();
                return;
            }
            displayCoreDumpGraph(file.name, tree);
            eUploadForm.style.display = 'none';
            eLoadedContainer.style.removeProperty('display');
            eUploadBtn.setAttribute('href', '');
            loading = false;
        };
        reader.readAsText(file);
    }

    function resetEverything() {
        flameGraph = null;
        eSearchBox.value = '';
        eUploadBtn.setAttribute('href', '#');
        eUploadBtn.removeAttribute('disabled');
        eLoadedContainer.style.display = 'none';
        eGraph.innerHTML = '';
        eGraphDetail.innerHTML = '';
        eUploadSpinner.style.display = 'none';
        eUploadProgressWrapper.style.display = 'none';
        eUploadCaption.textContent = 'Load file';
        eUploadForm.style.removeProperty('display');
        loading = false;
    }

    async function parseCoreDump(coreDump: string): Promise<FlameGraphTree | null> {
        loadProgressMonitor.reportPhase(PHASE_SPLIT, 1);
        const lines = coreDump.split(/\r?\n/);
        loadProgressMonitor.reportPhase(PHASE_PARSE_TEXT, lines.length);

        let stacks: StackTrace[] = [];
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
                if (showWaitingOn) {
                    const parsed = line.match(/^[0-9A-Z]*\s*\(?(.+)\)?$/);
                    const text = parsed[1];
                    currentStack.push('> ' + text);
                }
            } else if (line.startsWith('5XESTACKTRACE ')) {
                if (showEnteredLock) {
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

        return await parseStacks(stacks);
    }

    async function parseStacks(stacks: StackTrace[]): Promise<FlameGraphTree> {
        loadProgressMonitor.reportPhase(PHASE_PARSE_STACKS, stacks.length);
        const rootMap: StackTree = {};
        for (let i = 0; i < stacks.length; ++i) {
            await loadProgressMonitor.reportProgress(i);
            const stack: StackTrace = stacks[i];
            let curr: StackTree = rootMap;
            for (let j = stack.stack.length - 1; j >= 0; --j) {
                const line: string = stack.stack[j];
                const next: StackTree = (curr[line] as StackTree) || { '#count': 0 };
                ++(next['#count'] as number);
                curr[line] = next;
                curr = next;
            }
        }

        return await buildFlameGraphTree("(root)", rootMap);
    }

    async function buildFlameGraphTree(name: string, tree: StackTree): Promise<FlameGraphTree> {
        const methods = Object.keys(tree);
        loadProgressMonitor.reportPhase(PHASE_BUILD_TREE, methods.length);
        const children: FlameGraphTree[] = [];
        let value = 0;
        for (let i = 0; i < methods.length; ++i) {
            await loadProgressMonitor.reportProgress(i);
            const method = methods[i];
            if (method === '#count') continue;
            const child = await buildFlameGraphTree(method, tree[method] as StackTree);
            children.push(child);
            value += child.value;
        }

        return children.length ? { name: name, value: value, children: children } : { name: name, value: tree["#count"] as number };
    }

    function displayCoreDumpGraph(title: string, graphData: FlameGraphTree) {
        flameGraph = d3.flamegraph()
            .width(1800)
            .cellHeight(18)
            .transitionDuration(750)
            .minFrameSize(0)
            .transitionEase(d3.easeCubic)
            .sort(true)
            .title(title)
            .onClick(onGraphClick)
            .setDetailsElement(eGraphDetail);

        d3.select('#graph')
            .datum(graphData)
            // FIXME: Typing
            .call(flameGraph as any);

        /*
        document.getElementById("form").addEventListener("submit", function (event) {
            event.preventDefault();
            search();
        });

        function search() {
            var term = document.getElementById("term").value;
            flameGraph.search(term);
        }

        function clear() {
            document.getElementById('term').value = '';
            flameGraph.clear();
        }

        function resetZoom() {
            flameGraph.resetZoom();
        }
        */
    }

    function onGraphClick() {
        console.log(arguments);
    }

    interface StackTrace {
        thread: string;
        stack: string[];
    }

    interface StackTree {
        [key: string]: StackTree | number;
    }

    interface FlameGraphTree {
        name: string;
        value: number;
        children?: FlameGraphTree[];
    }

    class ProgressMonitor {
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

    const loadProgressMonitor = new ProgressMonitor(PHASE_COUNT, eUploadProgress);
}

StackFlame.init();
