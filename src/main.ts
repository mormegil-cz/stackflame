import * as d3 from 'd3';
import {flamegraph as fg} from 'd3-flame-graph';

namespace StackFlame {
    const $: (id: string) => HTMLElement = document.getElementById.bind(document);
    const eHomeLink = $('homeLink');
    const eUploadForm = $('uploadForm');
    const eUploadBtn = $('uploadBtn');
    const eFileElem = $('fileElem') as HTMLInputElement;
    const eUploadSpinner = $('uploadSpinner');
    const eUploadCaption = $('uploadCaption');
    const eLoadedContainer = $('loadedContainer');
    const eLoadedCaption = $('loadedCaption');
    const eGraph = $('graph');
    const eGraphDetail = $('graphDetail');

    let loading = false;

    export function init() {
        eHomeLink.addEventListener('click', onHomeClick);
        eUploadBtn.addEventListener('click', onUploadBtnClick, false);
        eFileElem.addEventListener('change', onFilesUploaded);
    }

    function onHomeClick(event: Event) {
        event.preventDefault();
        resetEverything();
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
        eUploadSpinner.style.removeProperty('display');
        eUploadCaption.textContent = 'Loading…';
        eUploadBtn.setAttribute('disabled', '');

        const files = eFileElem.files;

        if (!files.length) {
            resetEverything();
            return;
        }

        const file = files[0];

        const reader = new FileReader();
        reader.onload = evt => {
            displayCoreDumpGraph(file.name, parseCoreDump(evt.target.result as string));
            eUploadForm.style.display = 'none';
            eLoadedContainer.style.removeProperty('display');
            eUploadBtn.setAttribute('href', '');
            loading = false;
        };
        reader.readAsText(file);
    }

    function resetEverything() {
        eUploadBtn.setAttribute('href', '#');
        eUploadBtn.removeAttribute('disabled');
        eLoadedContainer.style.display = 'none';
        eUploadSpinner.style.display = 'none';
        eUploadCaption.textContent = 'Load file';
        eUploadForm.style.removeProperty('display');
        loading = false;
    }

    function parseCoreDump(coreDump: string) {
        const lines = coreDump.split(/\r?\n/);
        let stacks: StackTrace[] = [];
        let currentThread: string = null;
        let currentStack: string[] = [];
        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i];
            if (line.startsWith('3XMTHREADINFO')) {
                if (currentStack.length) {
                    stacks.push({ thread: currentThread, stack: currentStack });
                    currentThread = line;
                    currentStack = [];
                }
            } else if (line.startsWith('4XESTACKTRACE')) {
                const parsed = line.match(/^4XESTACKTRACE\s*at ([^(]+)/);
                const methodName = parsed[1];
                currentStack.push(methodName.replace(/\//g, '.'));
            }

            // 3XMJAVALTHREAD
            // 3XMTHREADINFO1
            // 3XMTHREADINFO2
            // 3XMCPUTIME
            // 3XMHEAPALLOC
            // 5XESTACKTRACE (entered lock:
        }

        if (currentStack.length) {
            stacks.push({ thread: currentThread, stack: currentStack });
        }

        return parseStacks(stacks);
    }

    function parseStacks(stacks: StackTrace[]): FlameGraphTree {
        const rootMap: StackTree = {};
        for (let i = 0; i < stacks.length; ++i) {
            const stack: StackTrace = stacks[i];
            let curr: StackTree = rootMap;
            for (let j = stack.stack.length - 1; j >= 0; --j) {
                const line: string = stack.stack[j];
                const next: StackTree = curr[line] || {};
                curr[line] = next;
                curr = next;
            }
        }

        return buildFlameGraphTree("(root)", rootMap);
    }

    function buildFlameGraphTree(name: string, tree: StackTree): FlameGraphTree {
        let children: FlameGraphTree[] = [];
        let value = 0;
        for (const method in tree) {
            if (!tree.hasOwnProperty(method)) continue;

            const child = buildFlameGraphTree(method, tree[method]);
            children.push(child);
            value += child.value;
        }

        return children.length ? { name: name, value: value, children: children } : { name: name, value: 1 };
    }

    function displayCoreDumpGraph(title: string, graphData: FlameGraphTree) {
        let flameGraph = d3.flamegraph()
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
        [key: string]: StackTree;
    }

    interface FlameGraphTree {
        name: string;
        value: number;
        children?: FlameGraphTree[];
    }
}

StackFlame.init();
