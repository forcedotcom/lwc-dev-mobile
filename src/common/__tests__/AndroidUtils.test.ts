/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
const ORIG_ANDROID_HOME = process.env.ANDROID_HOME;
const MOCK_ANDROID_HOME = '/mock-android-home';
process.env.ANDROID_HOME = MOCK_ANDROID_HOME;
import fs from 'fs';
import { AndroidSDKUtils } from '../AndroidUtils';
import { AndroidMockData } from './AndroidMockData';

const myGenericVersionsCommandBlockMock = jest.fn((): string => {
    return 'mock version 1.0';
});

const myGenericVersionsCommandBlockMockThrows = jest.fn((): string => {
    throw new Error('Command not found!');
});

const myCommandBlockMock = jest.fn((): string => {
    return AndroidMockData.mockRawPacakgesString;
});

const badBlockMock = jest.fn((): string => {
    return AndroidMockData.badMockRawPacakagesString;
});

const throwMock = jest.fn((): void => {
    throw new Error('test error');
});

let readFileSpy: jest.SpyInstance<any>;
let writeFileSpy: jest.SpyInstance<any>;

describe('Android utils', () => {
    beforeEach(() => {
        myCommandBlockMock.mockClear();
        badBlockMock.mockClear();
        AndroidSDKUtils.clearCaches();
        throwMock.mockClear();
        readFileSpy = jest.spyOn(fs, 'readFileSync');
        writeFileSpy = jest
            .spyOn(fs, 'writeFileSync')
            .mockImplementation(jest.fn());
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Should attempt to verify Android SDK prerequisites are met', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myGenericVersionsCommandBlockMock
        );
        await AndroidSDKUtils.androidSDKPrerequisitesCheck();
        expect(
            myGenericVersionsCommandBlockMock
        ).toHaveBeenCalledWith(
            MOCK_ANDROID_HOME + '/tools/bin/sdkmanager --version',
            ['ignore', 'pipe', 'pipe']
        );
    });

    test('Should attempt to look for android sdk tools (sdkmanager)', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myGenericVersionsCommandBlockMock
        );
        await AndroidSDKUtils.fetchAndroidSDKToolsLocation();
        expect(
            myGenericVersionsCommandBlockMock
        ).toHaveBeenCalledWith(
            MOCK_ANDROID_HOME + '/tools/bin/sdkmanager --version',
            ['ignore', 'pipe', 'ignore']
        );
    });

    test('Should attempt to look for android sdk tools (sdkmanager)', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myGenericVersionsCommandBlockMockThrows
        );
        AndroidSDKUtils.fetchAndroidSDKToolsLocation().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should attempt to look for android sdk platform tools', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myGenericVersionsCommandBlockMock
        );
        await AndroidSDKUtils.fetchAndroidSDKPlatformToolsLocation();
        expect(myGenericVersionsCommandBlockMock).toHaveBeenCalledWith(
            MOCK_ANDROID_HOME + '/platform-tools/adb --version'
        );
    });

    test('Should attempt to look for android sdk platform tools', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myGenericVersionsCommandBlockMockThrows
        );
        AndroidSDKUtils.fetchAndroidSDKPlatformToolsLocation().catch(
            (error) => {
                expect(error).toBeTruthy();
            }
        );
    });

    test('Should attempt to invoke the sdkmanager for installed packages', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        await AndroidSDKUtils.fetchInstalledPackages();
        expect(myCommandBlockMock).toHaveBeenCalledWith(
            MOCK_ANDROID_HOME + '/tools/bin/sdkmanager --list'
        );
    });

    test('Should attempt to invoke the sdkmanager and get installed packages', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        const packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(packages.size === AndroidMockData.mockRawStringPackageLength);
    });

    test('Should attempt to invoke the sdkmanager and retrieve an empty list for a bad sdkmanager list', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            badBlockMock
        );
        const packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(packages.size !== 0);
    });

    test('Should have no cache before first list packages call', async () => {
        expect(AndroidSDKUtils.isCached()).toBeFalsy();
    });

    test('Should establish cache on first call', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        const packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(AndroidSDKUtils.isCached()).toBeTruthy();
    });

    test('Should utilize cache for subsequent calls', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        let packages = await AndroidSDKUtils.fetchInstalledPackages();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(myCommandBlockMock).toHaveBeenCalledTimes(1);
    });

    test('Should rebuild cache after clear in subsequent calls', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        let packages = await AndroidSDKUtils.fetchInstalledPackages();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        AndroidSDKUtils.clearCaches();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(myCommandBlockMock).toHaveBeenCalledTimes(2);
    });

    test('Should rebuild cache after clear in subsequent calls', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        let packages = await AndroidSDKUtils.fetchInstalledPackages();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        AndroidSDKUtils.clearCaches();
        packages = await AndroidSDKUtils.fetchInstalledPackages();
        expect(myCommandBlockMock).toHaveBeenCalledTimes(2);
    });

    test('Should Find a preferred Android package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        const apiPackage = await AndroidSDKUtils.findRequiredAndroidAPIPackage();
        expect(apiPackage !== null && apiPackage.description !== null);
    });

    test('Should not find a preferred Android package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            badBlockMock
        );
        AndroidSDKUtils.findRequiredAndroidAPIPackage().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should Find a preferred Android build tools package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        const apiPackage = await AndroidSDKUtils.findRequiredBuildToolsPackage();
        expect(apiPackage !== null && apiPackage.description !== null);
    });

    test('Should not find a preferred Android build tools package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            badBlockMock
        );
        AndroidSDKUtils.findRequiredBuildToolsPackage().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should Find a preferred Android emulator package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myCommandBlockMock
        );
        const apiPackage = await AndroidSDKUtils.findRequiredEmulatorImages();
        expect(apiPackage !== null && apiPackage.description !== null);
    });

    test('Should not find a preferred Android build tools package', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            badBlockMock
        );
        AndroidSDKUtils.findRequiredEmulatorImages().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    // Original Pixel/Pixel XL is a special case for skin path.
    test('Should update Pixel config with skin', async () => {
        const avdName = 'configTest';
        const testConfig = 'hw.device.name=pixel\n';
        const expectedConfig =
            'hw.device.name=pixel\n' +
            'hw.keyboard=yes\n' +
            'hw.gpu.mode=auto\n' +
            'hw.gpu.enabled=yes\n' +
            'skin.name=pixel_silver\n' +
            `skin.path=${MOCK_ANDROID_HOME}/skins/pixel_silver\n` +
            'skin.dynamic=yes\n' +
            'showDeviceFrame=yes\n';

        readFileSpy.mockReturnValue(testConfig);
        await AndroidSDKUtils.updateEmulatorConfig(avdName);

        expect(readFileSpy).toHaveBeenCalled();
        expect(writeFileSpy).toHaveBeenCalledWith(
            AndroidSDKUtils.USER_HOME +
                `/.android/avd/${avdName}.avd/config.ini`,
            expectedConfig,
            'utf8'
        );
    });

    test('Should update Pixel 3 config with skin', async () => {
        const avdName = 'configTest';
        const testConfig = 'hw.device.name=pixel_3\n';
        const expectedConfig =
            'hw.device.name=pixel_3\n' +
            'hw.keyboard=yes\n' +
            'hw.gpu.mode=auto\n' +
            'hw.gpu.enabled=yes\n' +
            'skin.name=pixel_3\n' +
            `skin.path=${MOCK_ANDROID_HOME}/skins/pixel_3\n` +
            'skin.dynamic=yes\n' +
            'showDeviceFrame=yes\n';

        readFileSpy.mockReturnValue(testConfig);
        await AndroidSDKUtils.updateEmulatorConfig(avdName);

        expect(readFileSpy).toHaveBeenCalled();
        expect(writeFileSpy).toHaveBeenCalledWith(
            AndroidSDKUtils.USER_HOME +
                `/.android/avd/${avdName}.avd/config.ini`,
            expectedConfig,
            'utf8'
        );
    });

    test('Should update unknown device config without skin', async () => {
        const avdName = 'configTest';
        const testConfig = 'hw.device.manufacture=Google\n';
        const expectedConfig =
            'hw.device.manufacture=Google\n' +
            'hw.keyboard=yes\n' +
            'hw.gpu.mode=auto\n' +
            'hw.gpu.enabled=yes\n';

        readFileSpy.mockReturnValue(testConfig);
        await AndroidSDKUtils.updateEmulatorConfig(avdName);

        expect(readFileSpy).toHaveBeenCalled();
        expect(writeFileSpy).toHaveBeenCalledWith(
            AndroidSDKUtils.USER_HOME +
                `/.android/avd/${avdName}.avd/config.ini`,
            expectedConfig,
            'utf8'
        );
    });

    test('Should not write config if size is 0', async () => {
        const avdName = 'configTest';
        const testConfig = '';

        readFileSpy.mockReturnValue(testConfig);
        await AndroidSDKUtils.updateEmulatorConfig(avdName);

        expect(readFileSpy).toHaveBeenCalled();
        expect(writeFileSpy).toHaveBeenCalledTimes(0);
    });

    test('Should not write config on read error', async () => {
        const avdName = 'configTest';

        readFileSpy.mockImplementation(throwMock);
        await AndroidSDKUtils.updateEmulatorConfig(avdName);

        expect(readFileSpy).toHaveBeenCalled();
        expect(writeFileSpy).toHaveBeenCalledTimes(0);
    });
});
