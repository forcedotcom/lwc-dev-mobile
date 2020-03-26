export interface SfdxLwcMobileBaseConfig {
    supportedRuntimes: string[];
    supportedDevices: string[];
    sfdxSimulatorName: string;
}

export interface SfdxLwcIOSSimulatorConfig extends SfdxLwcMobileBaseConfig {
    // could be more iOS specific attributes
}

export interface SfdxLwcAndroidEmulatorConfig extends SfdxLwcMobileBaseConfig {
    supportedBuildTools: string[];
    supportedImages: string[];
    architectures: string[];
}

export interface SfdxLwcMobileConfig {
    ios: SfdxLwcIOSSimulatorConfig;
    android: SfdxLwcAndroidEmulatorConfig;
}

let DefaultLWCMobileConfig: SfdxLwcMobileConfig = {
    ios: {
        supportedRuntimes: ['iOS-13'],
        supportedDevices: ['iPhone-11-Pro', 'iPhone-X', 'iPad-Pro--10-5-inch'],
        sfdxSimulatorName: 'SFDXSimulator'
    },
    android: {
        supportedRuntimes: [
            'android-29',
            'android-28',
            'android-27',
            'android-26',
            'android-25',
            'android-24',
            'android-23'
        ],
        supportedBuildTools: ['29', '28', '27', '26'],
        supportedImages: ['default', 'google-api'],
        architectures: ['x86_64'],
        supportedDevices: ['pixel', 'pixel_xl'],
        sfdxSimulatorName: 'SFDXEmulator'
    }
};

export { DefaultLWCMobileConfig };
