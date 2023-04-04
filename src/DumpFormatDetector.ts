import ProgressMonitor from './ProgressMonitor';
import CoreDumpAnalyzer from './CoreDumpAnalyzer';
import IbmSystemOutAnalyzer from './IbmSystemOutAnalyzer';
import IbmCoreDumpAnalyzer from './IbmCoreDumpAnalyzer';
import OpenJdkThreadDumpAnalyzer from './OpenJdkThreadDumpAnalyzer';

export default async function createAnalyzer(coreDump: string, loadProgressMonitor: ProgressMonitor): Promise<CoreDumpAnalyzer | null> {
    if (coreDump.startsWith('************ Start Display Current Environment')) {
        return new IbmSystemOutAnalyzer();
    } else if (coreDump.startsWith('0SECTION')) {
        return new IbmCoreDumpAnalyzer();
    } else if (coreDump.startsWith('"') && coreDump.includes('tid=')) {
        return new OpenJdkThreadDumpAnalyzer();
    } else {
        return null;
    }
}
