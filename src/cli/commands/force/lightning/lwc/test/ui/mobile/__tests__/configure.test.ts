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
import { Configure } from '../configure';
import util from 'util';

Messages.importMessagesDirectory(__dirname);

describe('Mobile UI Test Configuration Tests', () => {
    const messages = Messages.loadMessages(
        '@salesforce/lwc-dev-mobile',
        'test-ui-mobile-configure'
    );
    const coreMessages = Messages.loadMessages(
        '@salesforce/lwc-dev-mobile-core',
        'common'
    );

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

    let destArg: string;
    let contentArg: string;

    let passedSetupMock: jest.Mock<any, [], any>;
    let failedSetupMock: jest.Mock<any, [], any>;
    let createTextFile: jest.Mock<any, [any, any], any>;
    let getSimulatorMock: jest.Mock<any, [], any>;
    let fetchEmulatorMock: jest.Mock<any, [], any>;

    beforeEach(() => {
        passedSetupMock = jest.fn(() => {
            return Promise.resolve();
        });

        failedSetupMock = jest.fn(() => {
            return Promise.reject(new SfError('Mock Failure in tests!'));
        });

        createTextFile = jest.fn((dest, content) => {
            destArg = dest;
            contentArg = content;
            return Promise.resolve();
        });

        getSimulatorMock = jest.fn((): Promise<IOSSimulatorDevice> => {
            return Promise.resolve(iOSDevice);
        });

        fetchEmulatorMock = jest.fn((): Promise<AndroidVirtualDevice> => {
            return Promise.resolve(androidDevice);
        });

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
            expect((error as SfError).message).toContain(
                util.format(
                    coreMessages.getMessage('error:invalidFlagValue'),
                    'blah'
                )
            );
        }

        const cmd2 = createCommand({ platform: ' ' });
        try {
            await cmd2.init();
            await cmd2.run();
        } catch (error) {
            expect((error as SfError).message).toContain(
                util.format(
                    coreMessages.getMessage('error:invalidFlagValue'),
                    ' '
                )
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
            expect((error as any).message).toContain(
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
            expect((error as any).message).toContain(
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
            expect((error as any).message).toContain(
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

        await cmd.init();
        await cmd.run();

        expect(destArg).toBe(Configure.defaultOutputFile);
        expect(contentArg).toContain('"appium:platformName": "Android"');
        expect(contentArg).toContain('"appium:automationName": "UiAutomator2"');
        expect(contentArg).toContain('"appium:app": ""');
        expect(contentArg).toContain('"appium:appActivity": ".MainActivity"');
        expect(contentArg).toContain(
            '"appium:appPackage": "com.example.android.myApp"'
        );
        expect(contentArg).toContain(`"appium:avd": "${androidDevice.name}"`);
        expect(contentArg).toContain(
            `"framework": "${Configure.supportedTestFrameworks[0]}"`
        );
        expect(contentArg).not.toContain('"port":');
        expect(contentArg).toContain(
            `"baseUrl": "${Configure.defaultTestRunnerBaseUrl}"`
        );
        expect(contentArg).toContain('"injectionConfigs": []');
    });

    test('Checks that setup is invoked', async () => {
        const cmd = createCommand({
            platform: 'ios',
            deviceName: 'iPhone 8'
        });

        await cmd.init();
        await cmd.run();
        expect(passedSetupMock).toHaveBeenCalled();

        expect(destArg).toBe(Configure.defaultOutputFile);
        expect(contentArg).toContain('"appium:platformName": "iOS"');
        expect(contentArg).toContain('"appium:automationName": "XCUITest"');
        expect(contentArg).toContain('"appium:app": ""');
        expect(contentArg).toContain(`"appium:udid": "${iOSDevice.udid}"`);
        expect(contentArg).toContain(
            `"framework": "${Configure.supportedTestFrameworks[0]}"`
        );
        expect(contentArg).not.toContain('"port":');
        expect(contentArg).toContain(
            `"baseUrl": "${Configure.defaultTestRunnerBaseUrl}"`
        );
        expect(contentArg).toContain('"injectionConfigs": []');
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

        expect(destArg).toBe(Configure.defaultOutputFile);
        expect(contentArg).not.toContain(`"port": `);
        expect(contentArg).toContain(
            `"baseUrl": "${Configure.defaultTestRunnerBaseUrl}"`
        );
        expect(contentArg).toContain(
            `"framework": "${Configure.supportedTestFrameworks[0]}"`
        );
        expect(contentArg).toContain(`"appium:platformName": "iOS"`);
        expect(contentArg).toContain(`"appium:automationName": "XCUITest"`);
        expect(contentArg).toContain(`"appium:udid": "udid-iPhone-8"`);
        expect(contentArg).toContain(`"appium:app": "/path/to/my.app"`);
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

        expect(destArg).toBe(Configure.defaultOutputFile);
        expect(contentArg).not.toContain(`port: `);
        expect(contentArg).toContain(
            `"baseUrl": "${Configure.defaultTestRunnerBaseUrl}"`
        );
        expect(contentArg).toContain(
            `"framework": "${Configure.supportedTestFrameworks[0]}"`
        );
        expect(contentArg).toContain(`"appium:platformName": "Android"`);
        expect(contentArg).toContain(`"appium:automationName": "UiAutomator2"`);
        expect(contentArg).toContain(`"appium:avd": "Pixel_XL"`);
        expect(contentArg).toContain(`"appium:app": "/path/to/my.apk"`);
        expect(contentArg).toContain(`"appium:appActivity": ".MainActivity"`);
        expect(contentArg).toContain(
            `"appium:appPackage": "com.example.android.myApp"`
        );
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
        expect(Configure.description !== null).toBeTruthy();
    });

    function createCommand({
        platform,
        deviceName,
        output,
        testFramework,
        bundlePath,
        appActivity,
        appPackage,
        port,
        baseurl,
        injectionconfigs
    }: NamedParameters): Configure {
        const args = [];

        if (platform && platform.length > 0) {
            args.push('-p');
            args.push(platform);
        }

        if (deviceName && deviceName.length > 0) {
            args.push('-d');
            args.push(deviceName);
        }

        if (output && output.length > 0) {
            args.push('--output');
            args.push(output);
        }

        if (testFramework && testFramework.length > 0) {
            args.push('--testframework');
            args.push(testFramework);
        }

        if (bundlePath && bundlePath.length > 0) {
            args.push('--bundlepath');
            args.push(bundlePath);
        }

        if (appActivity && appActivity.length > 0) {
            args.push('--appactivity');
            args.push(appActivity);
        }

        if (appPackage && appPackage.length > 0) {
            args.push('--apppackage');
            args.push(appPackage);
        }

        if (port && port.length > 0) {
            args.push('--port');
            args.push(port);
        }

        if (baseurl && baseurl.length > 0) {
            args.push('--baseurl');
            args.push(baseurl);
        }

        if (injectionconfigs && injectionconfigs.length > 0) {
            args.push('--injectionconfigs');
            args.push(injectionconfigs);
        }

        const cmd = new Configure(args, new Config({} as Options));

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
    port?: string;
    baseurl?: string;
    injectionconfigs?: string;
}
