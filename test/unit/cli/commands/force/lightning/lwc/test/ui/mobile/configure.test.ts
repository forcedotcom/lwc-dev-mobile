/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import sinon from 'sinon';
import { Logger, Messages } from '@salesforce/core';
import { TestContext } from '@salesforce/core/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import {
    AndroidDevice,
    AndroidDeviceManager,
    AndroidOSType,
    AppleDevice,
    AppleDeviceManager,
    AppleOSType,
    CommonUtils,
    DeviceType,
    RequirementProcessor,
    Version
} from '@salesforce/lwc-dev-mobile-core';
import { expect } from 'chai';
import { Configure } from '../../../../../../../../../../src/cli/commands/force/lightning/lwc/test/ui/mobile/configure.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

describe('Mobile UI Test Configuration Tests', () => {
    const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'test-ui-mobile-configure');
    const $$ = new TestContext();

    const androidDevice = new AndroidDevice(
        'Pixel_5_API_35',
        'Pixel 5 API 35',
        DeviceType.mobile,
        AndroidOSType.googleAPIs,
        new Version(35, 0, 0),
        false
    );

    const appleDevice = new AppleDevice(
        '3627EBD5-E9EC-4EC4-8E89-C6A0232C920D',
        'iPhone 16',
        DeviceType.mobile,
        AppleOSType.iOS,
        new Version(18, 5, 0)
    );

    let executeSetupMock: sinon.SinonStub<any[], any>;

    beforeEach(() => {
        executeSetupMock = stubMethod($$.SANDBOX, RequirementProcessor, 'execute');
        executeSetupMock.resolves(Promise.resolve());
    });

    afterEach(() => {
        $$.restore();
    });

    it('Fails if appActivity is missing when targeting Android', async () => {
        try {
            await Configure.run([
                '-p',
                'android',
                '-d',
                'Pixel 5 API 33',
                '--output',
                './wdio.conf.js',
                '--testframework',
                'jasmine',
                '--port',
                '4723',
                '--baseurl',
                'http://localhost',
                '--injectionconfigs',
                './myPageObjects.config.json',
                '--bundlepath',
                '/path/to/my.apk',
                '--apppackage',
                'com.example.android.myApp'
            ]);
        } catch (error) {
            expect(error).to.be.an('error').with.property('message', messages.getMessage('error.invalid.appActivity'));
        }
    });

    it('Fails if appPackage is missing when targeting Android', async () => {
        try {
            await Configure.run([
                '-p',
                'android',
                '-d',
                'Pixel 5 API 33',
                '--output',
                './wdio.conf.js',
                '--testframework',
                'jasmine',
                '--port',
                '4723',
                '--baseurl',
                'http://localhost',
                '--injectionconfigs',
                './myPageObjects.config.json',
                '--bundlepath',
                '/path/to/my.apk',
                '--appactivity',
                '.MainActivity'
            ]);
        } catch (error) {
            expect(error).to.be.an('error').with.property('message', messages.getMessage('error.invalid.appPackage'));
        }
    });

    it('Fails when emulator is not found when targeting Android', async () => {
        stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice').resolves(undefined);

        try {
            await Configure.run([
                '-p',
                'android',
                '-d',
                'Pixel 5 API 33',
                '--output',
                './wdio.conf.js',
                '--testframework',
                'jasmine',
                '--port',
                '4723',
                '--baseurl',
                'http://localhost',
                '--injectionconfigs',
                './myPageObjects.config.json',
                '--bundlepath',
                '/path/to/my.apk',
                '--appactivity',
                '.MainActivity',
                '--apppackage',
                'com.example.android.myApp'
            ]);
        } catch (error) {
            expect(error)
                .to.be.an('error')
                .with.property('message', messages.getMessage('error.notFound.device', ['Pixel 5 API 33']));
        }
    });

    it('Fails when simulator is not found when targeting iOS', async () => {
        stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice').resolves(undefined);

        try {
            await Configure.run([
                '-p',
                'ios',
                '-d',
                'iPhone 16',
                '--output',
                './wdio.conf.js',
                '--testframework',
                'jasmine',
                '--port',
                '4723',
                '--baseurl',
                'http://localhost',
                '--injectionconfigs',
                './myPageObjects.config.json',
                '--bundlepath',
                '/path/to/my.app'
            ]);
        } catch (error) {
            expect(error)
                .to.be.an('error')
                .with.property('message', messages.getMessage('error.notFound.device', ['iPhone 16']));
        }
    });

    it('Assigns default flag values', async () => {
        stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice').resolves(androidDevice);

        const createTextFileMock = stubMethod($$.SANDBOX, CommonUtils, 'createTextFile');
        createTextFileMock.resolves();

        await Configure.run([
            '-p',
            'android',
            '-d',
            androidDevice.name,
            '--appactivity',
            '.MainActivity',
            '--apppackage',
            'com.example.android.myApp'
        ]);

        const args = createTextFileMock.getCall(0).args;
        expect(args[0]).to.be.equal(Configure.defaultOutputFile);
        expect(args[1]).to.contain('"appium:platformName": "Android"');
        expect(args[1]).to.contain('"appium:automationName": "UiAutomator2"');
        expect(args[1]).to.contain('"appium:app": ""');
        expect(args[1]).to.contain('"appium:appActivity": ".MainActivity"');
        expect(args[1]).to.contain('"appium:appPackage": "com.example.android.myApp"');
        expect(args[1]).to.contain(`"appium:avd": "${androidDevice.name}"`);
        expect(args[1]).to.contain(`"framework": "${Configure.supportedTestFrameworks[0]}"`);
        expect(args[1]).not.to.contain('"port":');
        expect(args[1]).to.contain(`"baseUrl": "${Configure.defaultTestRunnerBaseUrl}"`);
        expect(args[1]).to.contain('"injectionConfigs": []');
    });

    it('Correct content is in config file - iOS', async () => {
        stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice').resolves(appleDevice);

        const createTextFileMock = stubMethod($$.SANDBOX, CommonUtils, 'createTextFile');
        createTextFileMock.resolves();

        await Configure.run(['-p', 'ios', '-d', appleDevice.name, '--bundlepath', '/path/to/my.app']);

        expect(executeSetupMock.called).to.be.true;

        const args = createTextFileMock.getCall(0).args;
        expect(args[0]).to.be.equal(Configure.defaultOutputFile);
        expect(args[1]).not.to.contain('"port":');
        expect(args[1]).to.contain(`"baseUrl": "${Configure.defaultTestRunnerBaseUrl}"`);
        expect(args[1]).to.contain(`"framework": "${Configure.supportedTestFrameworks[0]}"`);
        expect(args[1]).to.contain('"appium:platformName": "iOS"');
        expect(args[1]).to.contain('"appium:automationName": "XCUITest"');
        expect(args[1]).to.contain(`"appium:udid": "${appleDevice.id}"`);
        expect(args[1]).to.contain('"appium:app": "/path/to/my.app"');
    });

    it('Correct content is in config file - Android', async () => {
        stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice').resolves(androidDevice);

        const createTextFileMock = stubMethod($$.SANDBOX, CommonUtils, 'createTextFile');
        createTextFileMock.resolves();

        await Configure.run([
            '-p',
            'android',
            '-d',
            androidDevice.name,
            '--bundlepath',
            '/path/to/my.apk',
            '--appactivity',
            '.MainActivity',
            '--apppackage',
            'com.example.android.myApp'
        ]);

        expect(executeSetupMock.called).to.be.true;

        const args = createTextFileMock.getCall(0).args;
        expect(args[0]).to.be.equal(Configure.defaultOutputFile);
        expect(args[1]).not.to.contain('"port":');
        expect(args[1]).to.contain(`"baseUrl": "${Configure.defaultTestRunnerBaseUrl}"`);
        expect(args[1]).to.contain(`"framework": "${Configure.supportedTestFrameworks[0]}"`);
        expect(args[1]).to.contain('"appium:platformName": "Android"');
        expect(args[1]).to.contain('"appium:automationName": "UiAutomator2"');
        expect(args[1]).to.contain(`"appium:avd": "${androidDevice.name}"`);
        expect(args[1]).to.contain('"appium:app": "/path/to/my.apk"');
        expect(args[1]).to.contain('"appium:appActivity": ".MainActivity"');
        expect(args[1]).to.contain('"appium:appPackage": "com.example.android.myApp"');
    });

    it('Logger must be initialized and invoked', async () => {
        const loggerMock = stubMethod($$.SANDBOX, Logger.prototype, 'info');
        stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice').resolves(androidDevice);
        stubMethod($$.SANDBOX, CommonUtils, 'createTextFile').resolves();
        await Configure.run(['-p', 'ios', '-d', 'iPhone 16']);
        expect(loggerMock.called).to.be.true;
    });

    it('Messages folder should be loaded', async () => {
        expect(!Configure.summary).to.be.false;
    });
});
