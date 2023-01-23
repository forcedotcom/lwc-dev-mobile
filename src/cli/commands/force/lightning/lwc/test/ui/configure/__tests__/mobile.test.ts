/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Config } from '@oclif/core/lib/config';
import { Options } from '@oclif/core/lib/interfaces';
import { Logger, Messages, SfError } from '@salesforce/core';
import { AndroidVirtualDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidTypes';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import { Version } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSSimulatorDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSTypes';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import { RequirementProcessor } from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import { Mobile } from '../mobile';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'test-ui-configure-mobile'
);

const passedSetupMock = jest.fn(() => {
    return Promise.resolve();
});

const failedSetupMock = jest.fn(() => {
    return Promise.reject(new SfError('Mock Failure in tests!'));
});

let isAndroidArg: boolean;
let deviceArg: AndroidVirtualDevice | IOSSimulatorDevice;
let outputArg: string;
let testFrameworkArg: string;
let bundlePathArg: string;
let appActivityArg: string;
let appPackageArg: string;
let runnerArg: string;
let portArg: string;
let baseUrlArg: string;
let injectionConfigsPathArg: string;

const executeCreateConfigFile = jest.fn(
    (
        isAndroid,
        device,
        output,
        testFramework,
        bundlePath,
        appActivity,
        appPackage,
        runner,
        port,
        baseUrl,
        injectionConfigsPath
    ) => {
        isAndroidArg = isAndroid;
        deviceArg = device;
        outputArg = output;
        testFrameworkArg = testFramework;
        bundlePathArg = bundlePath;
        appActivityArg = appActivity;
        appPackageArg = appPackage;
        runnerArg = runner;
        portArg = port;
        baseUrlArg = baseUrl;
        injectionConfigsPathArg = injectionConfigsPath;
        return Promise.resolve();
    }
);

let destArg: string;
let contentArg: string;

const createTextFile = jest.fn((dest, content) => {
    destArg = dest;
    contentArg = content;
    return Promise.resolve();
});

const iOSDevice = new IOSSimulatorDevice(
    'iPhone-8',
    'udid-iPhone-8',
    'active',
    'iOS-13',
    true
);

const androidDevice = new AndroidVirtualDevice(
    'Pixel_XL',
    'Pixel XL',
    'pixel-xl-path',
    'Google APIs',
    'Android 9',
    Version.from('28')!
);

const getSimulatorMock = jest.fn((): Promise<IOSSimulatorDevice> => {
    return Promise.resolve(iOSDevice);
});

const fetchEmulatorMock = jest.fn((): Promise<AndroidVirtualDevice> => {
    return Promise.resolve(androidDevice);
});

describe('Mobile UI Test Configuration Tests', () => {
    beforeEach(() => {
        jest.spyOn(RequirementProcessor, 'execute').mockImplementation(
            passedSetupMock
        );

        jest.spyOn(AndroidUtils, 'fetchEmulator').mockImplementation(
            fetchEmulatorMock
        );

        jest.spyOn(IOSUtils, 'getSimulator').mockImplementation(
            getSimulatorMock
        );

        jest.spyOn(CommonUtils, 'createTextFile').mockImplementation(
            createTextFile
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Validates platform flag', async () => {
        const cmd1 = createCommand({ platform: 'blah' });
        try {
            await cmd1.init();
            await cmd1.run();
        } catch (error) {
            expect((error as any).message).toBe(
                messages.getMessage('error:invalidPlatformFlagsDescription')
            );
        }

        const cmd2 = createCommand({ platform: ' ' });
        try {
            await cmd2.init();
            await cmd2.run();
        } catch (error) {
            expect((error as any).message).toBe(
                messages.getMessage('error:invalidPlatformFlagsDescription')
            );
        }
    });

    test('Validates deviceName flag', async () => {
        const cmd = createCommand({
            platform: 'android',
            deviceName: ' '
        });
        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            expect((error as any).message).toBe(
                messages.getMessage('error:invalidDeviceNameFlagsDescription')
            );
        }
    });

    test('Validates appActivity flag', async () => {
        const cmd = createCommand({
            platform: 'android',
            deviceName: 'my_device'
        });
        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            expect((error as any).message).toBe(
                messages.getMessage('error:invalidAppActivityFlagsDescription')
            );
        }
    });

    test('Validates appPackage flag', async () => {
        const cmd = createCommand({
            platform: 'android',
            deviceName: 'my_device',
            appActivity: '.MainActivity'
        });
        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            expect((error as any).message).toBe(
                messages.getMessage('error:invalidAppPackageFlagsDescription')
            );
        }
    });

    test('Assigns default flag values', async () => {
        const cmd = createCommand({
            platform: 'android',
            deviceName: 'my_device',
            appActivity: '.MainActivity',
            appPackage: 'com.example.android.myApp'
        });

        jest.spyOn(
            Mobile.prototype,
            'executeCreateConfigFile'
        ).mockImplementation(executeCreateConfigFile);

        await cmd.init();
        await cmd.run();

        expect(isAndroidArg).toBe(true);
        expect(deviceArg).toBeTruthy();
        expect(outputArg).toBe(Mobile.defaultOutputFile);
        expect(testFrameworkArg).toBe(Mobile.supportedTestFrameworks[0]);
        expect(bundlePathArg).toBe('');
        expect(appActivityArg).toBe('.MainActivity');
        expect(appPackageArg).toBe('com.example.android.myApp');
        expect(runnerArg).toBe(Mobile.supportedTestRunners[0]);
        expect(portArg).toBe('');
        expect(baseUrlArg).toBe(Mobile.defaultTestRunnerBaseUrl);
        expect(injectionConfigsPathArg).toBe('');
    });

    test('Checks that setup is invoked', async () => {
        const cmd = createCommand({
            platform: 'ios',
            deviceName: 'iPhone 8'
        });

        jest.spyOn(
            Mobile.prototype,
            'executeCreateConfigFile'
        ).mockImplementation(executeCreateConfigFile);

        await cmd.init();
        await cmd.run();
        expect(passedSetupMock).toHaveBeenCalled();
        expect(executeCreateConfigFile).toHaveBeenCalled();
    });

    test('Should throw an error if setup fails', async () => {
        const cmd = createCommand({
            platform: 'ios',
            deviceName: 'iPhone 8'
        });

        jest.spyOn(RequirementProcessor, 'execute').mockImplementationOnce(
            failedSetupMock
        );

        try {
            await cmd.init();
            await cmd.run();
        } catch (error) {
            expect(error instanceof SfError).toBeTruthy();
        }

        expect(failedSetupMock).toHaveBeenCalled();
    });

    test('Correct content is in config file - iOS', async () => {
        const cmd = createCommand({
            platform: 'ios',
            deviceName: 'iPhone 8',
            bundlePath: '/path/to/my.app'
        });

        await cmd.init();
        await cmd.run();
        expect(passedSetupMock).toHaveBeenCalled();
        expect(createTextFile).toHaveBeenCalled();

        expect(destArg).toBe(Mobile.defaultOutputFile);
        expect(
            contentArg.includes(`runner: '${Mobile.supportedTestRunners[0]}',`)
        ).toBe(true);
        expect(contentArg.includes(`port: `)).toBe(false);
        expect(
            contentArg.includes(
                `baseUrl: '${Mobile.defaultTestRunnerBaseUrl}',`
            )
        ).toBe(true);
        expect(
            contentArg.includes(
                `framework: '${Mobile.supportedTestFrameworks[0]}',`
            )
        ).toBe(true);
        expect(contentArg.includes(`'appium:platformName': 'iOS',`)).toBe(true);
        expect(
            contentArg.includes(`'appium:automationName': 'XCUITest',`)
        ).toBe(true);
        expect(contentArg.includes(`'appium:deviceName': 'iPhone-8',`)).toBe(
            true
        );
        expect(contentArg.includes(`'appium:platformVersion': '13',`)).toBe(
            true
        );
        expect(contentArg.includes(`'appium:app': '/path/to/my.app',`)).toBe(
            true
        );
    });

    test('Correct content is in config file - Android', async () => {
        const cmd = createCommand({
            platform: 'android',
            deviceName: 'Pixel XL',
            bundlePath: '/path/to/my.apk',
            appActivity: '.MainActivity',
            appPackage: 'com.example.android.myApp'
        });

        await cmd.init();
        await cmd.run();
        expect(passedSetupMock).toHaveBeenCalled();
        expect(createTextFile).toHaveBeenCalled();

        expect(destArg).toBe(Mobile.defaultOutputFile);
        expect(
            contentArg.includes(`runner: '${Mobile.supportedTestRunners[0]}',`)
        ).toBe(true);
        expect(contentArg.includes(`port: `)).toBe(false);
        expect(
            contentArg.includes(
                `baseUrl: '${Mobile.defaultTestRunnerBaseUrl}',`
            )
        ).toBe(true);
        expect(
            contentArg.includes(
                `framework: '${Mobile.supportedTestFrameworks[0]}',`
            )
        ).toBe(true);
        expect(contentArg.includes(`'appium:platformName': 'Android',`)).toBe(
            true
        );
        expect(
            contentArg.includes(`'appium:automationName': 'UiAutomator2',`)
        ).toBe(true);
        expect(contentArg.includes(`'appium:avd': 'Pixel_XL',`)).toBe(true);
        expect(contentArg.includes(`'appium:app': '/path/to/my.apk',`)).toBe(
            true
        );
        expect(
            contentArg.includes(`'appium:appActivity': '.MainActivity',`)
        ).toBe(true);
        expect(
            contentArg.includes(
                `'appium:appPackage': 'com.example.android.myApp',`
            )
        ).toBe(true);
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-logger');
        const loggerSpy = jest.spyOn(logger, 'info');
        jest.spyOn(Logger, 'child').mockReturnValue(Promise.resolve(logger));

        const cmd = createCommand({
            platform: 'ios',
            deviceName: 'iPhone 8'
        });

        await cmd.init();
        await cmd.run();
        expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        expect(Mobile.description !== null).toBeTruthy();
    });

    function createCommand({
        platform,
        deviceName,
        output,
        testFramework,
        bundlePath,
        appActivity,
        appPackage,
        runner,
        port,
        baseurl,
        injectionconfigs
    }: NamedParameters): Mobile {
        const args = []; //['-n', componentName, '-p', platform, '-t', target];

        if (platform && platform.length > 0) {
            args.push('-p');
            args.push(platform);
        }

        if (deviceName && deviceName.length > 0) {
            args.push('-d');
            args.push(deviceName);
        }

        if (output && output.length > 0) {
            args.push('-o');
            args.push(output);
        }

        if (testFramework && testFramework.length > 0) {
            args.push('-f');
            args.push(testFramework);
        }

        if (bundlePath && bundlePath.length > 0) {
            args.push('-b');
            args.push(bundlePath);
        }

        if (appActivity && appActivity.length > 0) {
            args.push('-a');
            args.push(appActivity);
        }

        if (appPackage && appPackage.length > 0) {
            args.push('-k');
            args.push(appPackage);
        }

        if (runner && runner.length > 0) {
            args.push('-r');
            args.push(runner);
        }

        if (port && port.length > 0) {
            args.push('-t');
            args.push(port);
        }

        if (baseurl && baseurl.length > 0) {
            args.push('-u');
            args.push(baseurl);
        }

        if (injectionconfigs && injectionconfigs.length > 0) {
            args.push('-i');
            args.push(injectionconfigs);
        }

        const cmd = new Mobile(args, new Config({} as Options));

        return cmd;
    }
});

interface NamedParameters {
    platform?: string;
    deviceName?: string;
    output?: string;
    testFramework?: string;
    bundlePath?: string;
    appActivity?: string;
    appPackage?: string;
    runner?: string;
    port?: string;
    baseurl?: string;
    injectionconfigs?: string;
}
