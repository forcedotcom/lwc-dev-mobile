import androidConfig from '../config/androidconfig.json';
import { AndroidSDKUtils } from './AndroidUtils';
import util from 'util';

export class AndroidLauncher {
    emulatorName: string;

    constructor(emulatorName: string) {
        this.emulatorName = emulatorName;
    }

    public async launchNativeBrowser(url: string): Promise<boolean> {
        const preferredPack = await AndroidSDKUtils.findRequiredEmulatorImages();
        const emuImage = preferredPack.platformEmulatorImage || 'default';
        const androidApi = preferredPack.platformAPI;
        const device = androidConfig.supportedDevices[0];
        const timeout = androidConfig.deviceBootReadinessWaitTime;
        const noOfRetries = androidConfig.deviceBootStatusPollRetries;
        let port = await AndroidSDKUtils.getNextAndroidAdbPort();
        // need to incr by 2, one for console port and next for adb
        port =
            port < androidConfig.defaultAdbPort
                ? androidConfig.defaultAdbPort
                : port + 2;
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
//         console.log(`uh oh! ${error}`);
//     });
