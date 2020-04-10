import childProcess from 'child_process';
import util from 'util';
import { XcodeUtils } from './IOSUtils';
const exec = util.promisify(childProcess.exec);

export class IOSLauncher {
    deviceType: string;
    simulatorName: string;
    runtime: string;

    deviceList: Array<JSON>;
    currentSimulator: any[];

    constructor(simulatorName: string, deviceType: string, runtime: string) {
        this.simulatorName = simulatorName;
        this.deviceType = deviceType;
        this.runtime = runtime;
        this.deviceList = [];
        this.currentSimulator = [];
    }

    public async launchNativeBrowser(url: string): Promise<boolean> {
        const simName = this.simulatorName;
        const supportedDevices = await XcodeUtils.getSupportedDevicesThatMatch();
        const currentSimulator: any = supportedDevices.filter((entry: any) => {
            return simName == entry.name;
        });
        let deviceUDID = '';
        if (!currentSimulator || currentSimulator.length < 1) {
            deviceUDID = await XcodeUtils.createNewDevice(
                this.simulatorName,
                this.deviceType,
                this.runtime
            );
        } else {
            deviceUDID = currentSimulator[0].udid;
        }
        return XcodeUtils.openUrlInNativeBrowser(url, deviceUDID);
    }
}

// let launcher = new IOSLauncher('sfdxdevmobile1', 'iPhone-11-Pro', 'iOS-13-4');
// launcher
//     .launchNativeBrowser('http://salesforce.com')
//     .then((result) => {
//         console.log('Done!');
//     })
//     .catch((error) => {
//         console.log('Error!' + error);
//     });
