import { AndroidSDKUtils } from './AndroidUtils';
import util from 'util';

export class AndroidLauncher {
    emulatorName: string;

    constructor(emulatorName: string) {
        this.emulatorName = emulatorName;
    }

    public async launchNativeBrowser(url: string): Promise<boolean> {
        const preferredPack = await AndroidSDKUtils.findRequiredEmulatorImages();
        const emuImage = 'default';
        const androidApi = preferredPack.platformAPI;
        const device = 'pixel';
        const port = 5580;
        const timeout = 3000;
        const noOfRetries = 10;
        const emuName = this.emulatorName;
        return AndroidSDKUtils.hasEmulator(emuName)
            .then((result) => {
                if (!result) {
                    return AndroidSDKUtils.createNewVirtualDevice(
                        emuName,
                        emuImage,
                        androidApi,
                        device
                    ).then((resolve) => true);
                }
                return true;
            })
            .then((resolve) => AndroidSDKUtils.startEmulator(emuName, port))
            .then((resolve) =>
                AndroidSDKUtils.pollDeviceStatus(port, noOfRetries, timeout)
            )
            .then((resolve) => AndroidSDKUtils.launchURLIntent(url, port));
    }
}

// let launcher = new AndroidLauncher('testemu7');
// launcher
//     .launchNativeBrowser('http://salesforce.com/')
//     .then((result) => {
//         console.log('Its all cool!');
//     })
//     .catch((error) => {
//         console.log(`Uh oh wtf ${error}`);
//     });
