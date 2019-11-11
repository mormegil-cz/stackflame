import * as Definitions from './Definitions';
import ProgressMonitor from './ProgressMonitor';

export default abstract class CoreDumpAnalyzer {
    public abstract parseCoreDump(coreDump: string, settings: Definitions.AnalysisSettings, loadProgressMonitor: ProgressMonitor): Promise<Definitions.FlameGraphTree | null>;

    protected async parseStacks(stacks: Definitions.StackTrace[], loadProgressMonitor: ProgressMonitor): Promise<Definitions.FlameGraphTree> {
        loadProgressMonitor.reportPhase(Definitions.PHASE_PARSE_STACKS, stacks.length);
        const rootMap: Definitions.StackTree = {};
        for (let i = 0; i < stacks.length; ++i) {
            await loadProgressMonitor.reportProgress(i);
            const stack: Definitions.StackTrace = stacks[i];
            let curr: Definitions.StackTree = rootMap;
            for (let j = stack.stack.length - 1; j >= 0; --j) {
                const line: string = stack.stack[j];
                const next: Definitions.StackTree = (curr[line] as Definitions.StackTree) || { '#count': 0 };
                ++(next['#count'] as number);
                curr[line] = next;
                curr = next;
            }
        }

        return await this.buildFlameGraphTree("(root)", rootMap, loadProgressMonitor);
    }

    protected async buildFlameGraphTree(name: string, tree: Definitions.StackTree, loadProgressMonitor: ProgressMonitor): Promise<Definitions.FlameGraphTree> {
        const methods = Object.keys(tree);
        loadProgressMonitor.reportPhase(Definitions.PHASE_BUILD_TREE, methods.length);
        const children: Definitions.FlameGraphTree[] = [];
        let value = 0;
        for (let i = 0; i < methods.length; ++i) {
            await loadProgressMonitor.reportProgress(i);
            const method = methods[i];
            if (method === '#count') continue;
            const child = await this.buildFlameGraphTree(method, tree[method] as Definitions.StackTree, loadProgressMonitor);
            children.push(child);
            value += child.value;
        }

        return children.length ? { name: name, value: value, children: children } : { name: name, value: tree["#count"] as number };
    }
}
