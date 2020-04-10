import childProcess from 'child_process';
import util from 'util';
import { XcodeUtils } from './IOSUtils';
const exec = util.promisify(childProcess.exec);

export class IOSLauncher {
    simulatorName: string;

    constructor(simulatorName: string) {
        this.simulatorName = simulatorName;
    }

    private typeFromIdentifier(name: string): string {
        if (name && name.length > 0) {
            const tokens = name.split('.');
            if (tokens.length > 4) {
                return tokens[4];
            }
        }
        return '';
    }

    public async launchNativeBrowser(url: string): Promise<boolean> {
        const simName = this.simulatorName;
        const supportedDevices: any = await XcodeUtils.getSupportedDevicesThatMatch();
        const currentSimulator: any = supportedDevices.filter((entry: any) => {
            return simName == entry.name;
        });
        let deviceUDID = '';
        if (!currentSimulator || currentSimulator.length < 1) {
            const deviceType = this.typeFromIdentifier(
                supportedDevices[0].deviceTypeIdentifier
            );
            const runtimeType = this.typeFromIdentifier(
                supportedDevices[0].runtimeTypeIdentifier
            );
            deviceUDID = await XcodeUtils.createNewDevice(
                this.simulatorName,
                deviceType,
                runtimeType
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
