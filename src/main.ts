import * as d3 from 'd3';
import { flamegraph as d3flamegraph } from 'd3-flame-graph';

import * as Definitions from './Definitions';
import ProgressMonitor from './ProgressMonitor';
import createAnalyzer from './DumpFormatDetector';

namespace StackFlameMain {
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

    let settings = new Definitions.AnalysisSettings(false, false);
    let loading = false;
    let flameGraph: d3.Flamegraph | null;

    export function init() {
        console.debug(d3.flamegraph);
        console.debug(d3flamegraph);
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
        //(d3 as any).flamegraph = fg;
        (d3 as any).flamegraph = d3flamegraph;
        eFileElem.click();
    }

    function onFilesUploaded(event: Event) {
        loading = true;
        loadProgressMonitor.reportPhase(Definitions.PHASE_UPLOAD, 1);
        eUploadSpinner.style.removeProperty('display');
        eUploadProgressWrapper.style.removeProperty('display');
        eUploadCaption.textContent = 'Loading…';
        eUploadBtn.setAttribute('disabled', '');

        settings.showWaitingOn = eWaitingOnCB.checked;
        settings.showEnteredLock = eEnteredLockCB.checked;

        const files = eFileElem.files;

        if (!files.length) {
            resetEverything();
            return;
        }

        const file = files[0];

        const reader = new FileReader();
        reader.onload = async evt => {
            const coreDump = evt.target.result as string;
            const analyzer = await createAnalyzer(coreDump, loadProgressMonitor);
            if (!analyzer) {
                alert('Invalid or unsupported core dump format');
                resetEverything();
                return;
            }
            const tree = await analyzer.parseCoreDump(coreDump, settings, loadProgressMonitor);
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

    function displayCoreDumpGraph(title: string, graphData: Definitions.FlameGraphTree) {
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

    const loadProgressMonitor = new ProgressMonitor(Definitions.PHASE_COUNT, eUploadProgress);
}

StackFlameMain.init();
