import ProgressMonitor from './ProgressMonitor';
import CoreDumpAnalyzer from './CoreDumpAnalyzer';
import IbmSystemOutAnalyzer from './IbmSystemOutAnalyzer';
import IbmCoreDumpAnalyzer from './IbmCoreDumpAnalyzer';
import OpenJdkThreadDumpAnalyzer from './OpenJdkThreadDumpAnalyzer';
import WinDbgSosThreadDumpAnalyzer from './WinDbgSosThreadDumpAnalyzer';
import ClrStackAnalyzer from "./ClrStackAnalyzer";

export default async function createAnalyzer(coreDump: string, loadProgressMonitor: ProgressMonitor): Promise<CoreDumpAnalyzer | null> {
    if (coreDump.startsWith('************ Start Display Current Environment')) {
        return new IbmSystemOutAnalyzer();
    } else if (coreDump.startsWith('0SECTION')) {
        return new IbmCoreDumpAnalyzer();
    } else if ((coreDump.startsWith('"') && coreDump.includes('tid=')) || (coreDump.substring(0, 100).includes('Full thread dump OpenJDK'))) {
        return new OpenJdkThreadDumpAnalyzer();
    } else if (coreDump.startsWith('OS Thread Id: ')) {
        return new ClrStackAnalyzer();
    } else if (coreDump.startsWith('---') && coreDump.includes('Child-SP')) {
        return new WinDbgSosThreadDumpAnalyzer();
    } else {
        return null;
    }
}
