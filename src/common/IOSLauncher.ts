import childProcess from 'child_process';
import util from 'util';
import { XcodeUtils } from './IOSUtils';
const exec = util.promisify(childProcess.exec);

export class IOSLauncher {
    simulatorName: string;

    constructor(simulatorName: string) {
        this.simulatorName = simulatorName;
    }

    public async launchNativeBrowser(url: string): Promise<boolean> {
        const simName = this.simulatorName;
        const availableDevices: string[] = await XcodeUtils.getSupportedDevices();
        const supportedRuntimes: string[] = await XcodeUtils.getSupportedRuntimes();
        const currentSimulator: any = availableDevices.filter((entry: any) => {
            return simName == entry.name;
        });
        let deviceUDID = '';
        if (!currentSimulator || currentSimulator.length == 0) {
            deviceUDID = await XcodeUtils.createNewDevice(
                this.simulatorName,
                availableDevices[0],
                supportedRuntimes[0]
            );
        } else {
            deviceUDID = currentSimulator[0].udid;
        }
        return XcodeUtils.openUrlInNativeBrowser(url, deviceUDID);
    }
}

// let launcher = new IOSLauncher('sfdxdevmobile1');
// launcher
//     .launchNativeBrowser('http://salesforce.com')
//     .then((result) => {
//         console.log('Done!');
//     })
//     .catch((error) => {
//         console.log('Error!' + error);
//     });
