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
        const availableDevices: string[] = await XcodeUtils.getSupportedDevices();
        const supportedRuntimes: string[] = await XcodeUtils.getSupportedRuntimes();
        const currentSimulatorUDID: string = await XcodeUtils.getSimulator(
            this.simulatorName
        );
        let deviceUDID = '';
        if (!currentSimulatorUDID || currentSimulatorUDID.length == 0) {
            deviceUDID = await XcodeUtils.createNewDevice(
                this.simulatorName,
                availableDevices[0],
                supportedRuntimes[0]
            );
        } else {
            deviceUDID = currentSimulatorUDID;
        }
        return XcodeUtils.openUrlInNativeBrowser(url, deviceUDID);
    }
}

// let launcher = new IOSLauncher('sfdxdevmobile-101');
// launcher
//     .launchNativeBrowser('http://salesforce.com')
//     .then((result) => {
//         console.log('Done!');
//     })
//     .catch((error) => {
//         console.log('Error!' + error);
//     });
