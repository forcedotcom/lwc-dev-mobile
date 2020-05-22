/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
export class IOSMockData {
    protected static mockRuntimes = {
        runtimes: [
            {
                buildversion: '17C49',
                bundlePath: 'mockruntime',
                identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-13-4',
                isAvailable: true,
                name: 'iOS 13.4',
                version: '13.4'
            },
            {
                buildversion: '17C48',
                bundlePath: 'mockruntime',
                identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-13-3',
                isAvailable: true,
                name: 'iOS 13.3',
                version: '13.3'
            },
            {
                buildversion: '17C46',
                bundlePath: 'mockruntime',
                identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-13-2',
                isAvailable: true,
                name: 'iOS 13.2',
                version: '13.2'
            },
            {
                buildversion: '17K43',
                bundlePath: 'mockruntime',
                identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-13-1',
                isAvailable: true,
                name: 'iOS 13.1',
                version: '13.1'
            }
        ]
    };

    protected static mockRuntimeDevices = {
        devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-13-4': [
                {
                    dataPath: 'mockPath',
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-11-Pro-Max',
                    isAvailable: true,
                    logPath: 'mockLogPath',
                    name: 'iPhone-11 Pro Max',
                    state: 'Shutdown',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CE49F8D6C166'
                }
            ],

            'com.apple.CoreSimulator.SimRuntime.iOS-13-2': [
                {
                    dataPath: 'mockPath',
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-11',
                    isAvailable: true,
                    logPath: 'mockLogPath',
                    name: 'iPhone-11',
                    state: 'Shutdown',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CE49F8D6C167'
                }
            ],

            'com.apple.CoreSimulator.SimRuntime.iOS-13-3': [
                {
                    dataPath: 'mockPath',
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-11-Pro',
                    isAvailable: true,
                    logPath: 'mockLogPath',
                    name: 'iPhone 11 Pro ',
                    state: 'Shutdown',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CE49F8D6C178'
                }
            ],

            'com.apple.CoreSimulator.SimRuntime.iOS-13-1': [
                {
                    dataPath: 'mockPath',
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-X',
                    isAvailable: true,
                    logPath: 'mockLogPath',
                    name: 'iPhone iPhone X',
                    state: 'Shutdown',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CE49F8D6C168'
                },
                {
                    dataPath: 'mockPath',
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-XS-Max',
                    isAvailable: true,
                    logPath: 'mockLogPath',
                    name: 'iPhone XS Max',
                    state: 'Shutdown',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CE49F8D6C169'
                },
                {
                    dataPath: 'mockPath',
                    deviceTypeIdentifier:
                        'com.apple.CoreSimulator.SimDeviceType.iPhone-XS',
                    isAvailable: true,
                    logPath: 'mockLogPath',
                    name: 'iPhone Xs',
                    state: 'Shutdown',
                    udid: 'F2B4097F-F33E-4D8A-8FFF-CF49F8D6D168'
                }
            ]
        }
    };

    protected static mockRuntimeDeviceTypes = {
        devicetypes: [
            {
                bundlePath:
                    '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone 4s.simdevicetype',
                identifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-4s',
                maxRuntimeVersion: 655359,
                minRuntimeVersion: 327680,
                name: 'iPhone 4s',
                productFamily: 'iPhone'
            },
            {
                bundlePath:
                    '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone 8.simdevicetype',
                identifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-8',
                maxRuntimeVersion: 4294967295,
                minRuntimeVersion: 720896,
                name: 'iPhone 8',
                productFamily: 'iPhone'
            },
            {
                bundlePath:
                    '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone 8 Plus.simdevicetype',
                identifier:
                    'com.apple.CoreSimulator.SimDeviceType.iPhone-8-Plus',
                maxRuntimeVersion: 4294967295,
                minRuntimeVersion: 720896,
                name: 'iPhone 8 Plus',
                productFamily: 'iPhone'
            },
            {
                bundlePath:
                    '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone X.simdevicetype',
                identifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-X',
                maxRuntimeVersion: 4294967295,
                minRuntimeVersion: 720896,
                name: 'iPhone X',
                productFamily: 'iPhone'
            },
            {
                bundlePath:
                    '/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone Xs.simdevicetype',
                identifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-XS',
                maxRuntimeVersion: 4294967295,
                minRuntimeVersion: 786432,
                name: 'iPhone Xs',
                productFamily: 'iPhone'
            },
            {
                bundlePath: 'mock-device-path',
                identifier:
                    'com.apple.CoreSimulator.SimDeviceType.iPhone-XS-Max',
                maxRuntimeVersion: 4294967295,
                minRuntimeVersion: 786432,
                name: 'iPhone Xs Max',
                productFamily: 'iPhone'
            }
        ]
    };
}
