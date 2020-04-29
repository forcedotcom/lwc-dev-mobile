export class IOSMockData {
    static mockRuntimes = {
        runtimes: [
            {
                version: '13.4',
                bundlePath: 'mockruntime',
                isAvailable: true,
                name: 'iOS 13.4',
                identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-13-4',
                buildversion: '17C49'
            },
            {
                version: '13.3',
                bundlePath: 'mockruntime',
                isAvailable: true,
                name: 'iOS 13.3',
                identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-13-3',
                buildversion: '17C48'
            },
            {
                version: '13.2',
                bundlePath: 'mockruntime',
                isAvailable: true,
                name: 'iOS 13.2',
                identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-13-2',
                buildversion: '17C46'
            },
            {
                version: '13.1',
                bundlePath: 'mockruntime',
                isAvailable: true,
                name: 'iOS 13.1',
                identifier: 'com.apple.CoreSimulator.SimRuntime.tvOS-13-1',
                buildversion: '17K43'
            }
        ]
    };

    static mockRuntimeDevices = {
        devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-13-4': [
                {
                    dataPath: 'mockPath',
                    logPath: 'mockLogPath',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CE49F8D6C166',
                    isAvailable: true,
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-11-Pro-Max',
                    state: 'Shutdown',
                    name: 'iPhone-11 Pro Max'
                }
            ],

            'com.apple.CoreSimulator.SimRuntime.iOS-13-2': [
                {
                    dataPath: 'mockPath',
                    logPath: 'mockLogPath',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CE49F8D6C167',
                    isAvailable: true,
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-11',
                    state: 'Shutdown',
                    name: 'iPhone-11'
                }
            ],

            'com.apple.CoreSimulator.SimRuntime.iOS-13-3': [
                {
                    dataPath: 'mockPath',
                    logPath: 'mockLogPath',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CE49F8D6C178',
                    isAvailable: true,
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-11-Pro',
                    state: 'Shutdown',
                    name: 'iPhone 11 Pro '
                }
            ],

            'com.apple.CoreSimulator.SimRuntime.iOS-13-1': [
                {
                    dataPath: 'mockPath',
                    logPath: 'mockLogPath',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CE49F8D6C168',
                    isAvailable: false,
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-X',
                    state: 'Shutdown',
                    name: 'iPhone iPhone X'
                },
                {
                    dataPath: 'mockPath',
                    logPath: 'mockLogPath',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CE49F8D6C169',
                    isAvailable: true,
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-XS-Max',
                    state: 'Shutdown',
                    name: 'iPhone XS Max'
                },
                {
                    dataPath: 'mockPath',
                    logPath: 'mockLogPath',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CF49F8D6D168',
                    isAvailable: false,
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-XS',
                    state: 'Shutdown',
                    name: 'iPhone Xs'
                }
            ]
        }
    };

    static mockRuntimeDeviceTypes = {
        devicetypes: [
            {
                minRuntimeVersion: 327680,
                bundlePath:
                    '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone 4s.simdevicetype',
                maxRuntimeVersion: 655359,
                name: 'iPhone 4s',
                identifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-4s',
                productFamily: 'iPhone'
            },
            {
                minRuntimeVersion: 720896,
                bundlePath:
                    '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone 8.simdevicetype',
                maxRuntimeVersion: 4294967295,
                name: 'iPhone 8',
                identifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-8',
                productFamily: 'iPhone'
            },
            {
                minRuntimeVersion: 720896,
                bundlePath:
                    '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone 8 Plus.simdevicetype',
                maxRuntimeVersion: 4294967295,
                name: 'iPhone 8 Plus',
                identifier:
                    'com.apple.CoreSimulator.SimDeviceType.iPhone-8-Plus',
                productFamily: 'iPhone'
            },
            {
                minRuntimeVersion: 720896,
                bundlePath:
                    '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone X.simdevicetype',
                maxRuntimeVersion: 4294967295,
                name: 'iPhone X',
                identifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-X',
                productFamily: 'iPhone'
            },
            {
                minRuntimeVersion: 786432,
                bundlePath:
                    '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone Xs.simdevicetype',
                maxRuntimeVersion: 4294967295,
                name: 'iPhone Xs',
                identifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-XS',
                productFamily: 'iPhone'
            },
            {
                minRuntimeVersion: 786432,
                bundlePath: 'mock-device-path',
                maxRuntimeVersion: 4294967295,
                name: 'iPhone Xs Max',
                identifier:
                    'com.apple.CoreSimulator.SimDeviceType.iPhone-XS-Max',
                productFamily: 'iPhone'
            }
        ]
    };
}
