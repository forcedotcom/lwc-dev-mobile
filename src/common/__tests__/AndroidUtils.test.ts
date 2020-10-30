/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
const MOCK_ANDROID_HOME = '/mock-android-home';
process.env.ANDROID_HOME = MOCK_ANDROID_HOME;
import fs from 'fs';
import path from 'path';
import { AndroidSDKUtils } from '../AndroidUtils';
import { PreviewUtils } from '../PreviewUtils';
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

const launchCommandMock = jest.fn((): string => {
    return '';
});

const launchCommandThrowsMock = jest.fn((): string => {
    throw new Error(' Mock Error');
});

const sdkCommand = path.normalize(MOCK_ANDROID_HOME + '/tools/bin/sdkmanager');
const adbCommand = path.normalize(MOCK_ANDROID_HOME + '/platform-tools/adb');

let readFileSpy: jest.SpyInstance<any>;
let writeFileSpy: jest.SpyInstance<any>;

describe('Android utils', () => {
    beforeEach(() => {
        myCommandBlockMock.mockClear();
        badBlockMock.mockClear();
        AndroidSDKUtils.clearCaches();
        throwMock.mockClear();
        launchCommandMock.mockClear();
        launchCommandThrowsMock.mockClear();
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
        ).toHaveBeenCalledWith(`${sdkCommand} --version`, [
            'ignore',
            'pipe',
            'pipe'
        ]);
    });

    test('Should attempt to look for android sdk tools (sdkmanager)', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            myGenericVersionsCommandBlockMock
        );
        await AndroidSDKUtils.fetchAndroidSDKToolsLocation();
        expect(
            myGenericVersionsCommandBlockMock
        ).toHaveBeenCalledWith(`${sdkCommand} --version`, [
            'ignore',
            'pipe',
            'ignore'
        ]);
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
            `${adbCommand} --version`
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
        expect(myCommandBlockMock).toHaveBeenCalledWith(`${sdkCommand} --list`);
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

    test('Should attempt to launch url and resolve.', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            launchCommandMock
        );
        const url = 'mock.url';
        const port = 1234;
        const expectedCommand = `${AndroidSDKUtils.ADB_SHELL_COMMAND} -s emulator-${port} shell am start -a android.intent.action.VIEW -d ${url}`;
        await AndroidSDKUtils.launchURLIntent(url, port);
        expect(launchCommandMock).toHaveBeenCalledWith(expectedCommand);
    });

    test('Should attempt to launch url and reject if error is encountered.', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsMock
        );
        const url = 'mock.url';
        const port = 1234;
        return AndroidSDKUtils.launchURLIntent(url, port).catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should attempt to launch native app and resolve.', async () => {
        const compName = 'mock.compName';
        const projectDir = '/mock/path';
        const targetApp = 'com.mock.app';
        const targetActivity = '.MainActivity';
        const targetAppArgs = [
            { name: 'arg1', value: 'val1' },
            { name: 'arg2', value: 'val2' }
        ];
        const port = 1234;
        const launchArgs =
            `--es "${PreviewUtils.COMPONENT_NAME_ARG_PREFIX}" "${compName}"` +
            ` --es "${PreviewUtils.PROJECT_DIR_ARG_PREFIX}" "${projectDir}"` +
            ` --es "arg1" "val1" --es "arg2" "val2"`;

        const mockCmd = jest.fn((): string => {
            return `${targetApp}/.MainActivity`;
        });

        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            mockCmd
        );

        await AndroidSDKUtils.launchNativeApp(
            compName,
            projectDir,
            undefined,
            targetApp,
            targetAppArgs,
            targetActivity,
            port
        );

        expect(mockCmd).toBeCalledTimes(1);
        expect(mockCmd).nthCalledWith(
            1,
            `${AndroidSDKUtils.ADB_SHELL_COMMAND} -s emulator-${port}` +
                ` shell am start -S -n "${targetApp}/${targetActivity}"` +
                ' -a android.intent.action.MAIN' +
                ' -c android.intent.category.LAUNCHER' +
                ` ${launchArgs}`
        );
    });

    test('Should attempt to launch native app and reject if error is encountered.', async () => {
        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            launchCommandThrowsMock
        );
        const compName = 'mock.compName';
        const projectDir = '/mock/path';
        const targetApp = 'com.mock.app';
        const targetActivity = '.MainActivity';
        const targetAppArgs = [
            { name: 'arg1', value: 'val1' },
            { name: 'arg2', value: 'val2' }
        ];
        const port = 1234;
        return AndroidSDKUtils.launchNativeApp(
            compName,
            projectDir,
            undefined,
            targetApp,
            targetAppArgs,
            targetActivity,
            port
        ).catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    test('Should attempt to install native app then launch it.', async () => {
        const compName = 'mock.compName';
        const projectDir = '/mock/path';
        const appBundlePath = '/mock/path/MyTestApp.apk';
        const targetApp = 'com.mock.app';
        const targetActivity = '.MainActivity';
        const targetAppArgs = [
            { name: 'arg1', value: 'val1' },
            { name: 'arg2', value: 'val2' }
        ];
        const port = 1234;
        const launchArgs =
            `--es "${PreviewUtils.COMPONENT_NAME_ARG_PREFIX}" "${compName}"` +
            ` --es "${PreviewUtils.PROJECT_DIR_ARG_PREFIX}" "${projectDir}"` +
            ` --es "arg1" "val1" --es "arg2" "val2"`;

        const mockCmd = jest.fn((): string => {
            return `${targetApp}/.MainActivity`;
        });

        jest.spyOn(AndroidSDKUtils, 'executeCommand').mockImplementation(
            mockCmd
        );

        await AndroidSDKUtils.launchNativeApp(
            compName,
            projectDir,
            appBundlePath,
            targetApp,
            targetAppArgs,
            targetActivity,
            port
        );

        expect(mockCmd).toBeCalledTimes(2);
        expect(mockCmd).nthCalledWith(
            1,
            `${
                AndroidSDKUtils.ADB_SHELL_COMMAND
            } -s emulator-${port} install -r -t '${appBundlePath.trim()}'`
        );
        expect(mockCmd).nthCalledWith(
            2,
            `${AndroidSDKUtils.ADB_SHELL_COMMAND} -s emulator-${port}` +
                ` shell am start -S -n "${targetApp}/${targetActivity}"` +
                ' -a android.intent.action.MAIN' +
                ' -c android.intent.category.LAUNCHER' +
                ` ${launchArgs}`
        );
    });
});
