/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import sinon from 'sinon';
import { Logger } from '@salesforce/core';
import { TestContext } from '@salesforce/core/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import {
    AndroidPackage,
    AndroidUtils,
    AppleDeviceManager,
    AppleRuntime,
    IOSUtils,
    RequirementProcessor,
    Version
} from '@salesforce/lwc-dev-mobile-core';
import { expect } from 'chai';
import { Create } from '../../../../../../../../src/cli/commands/force/lightning/local/device/create.js';

describe('Device Create Tests', () => {
    const $$ = new TestContext();

    const deviceName = 'MyDeviceName';
    const iOSDeviceType = 'iPhone-16';
    const androidDeviceType = 'pixel_xl';
    const androidApi = 'android-35';
    const androidImage = 'google_apis';
    const androidABI = 'x86_64';

    let executeSetupMock: sinon.SinonStub<any[], any>;

    beforeEach(() => {
        executeSetupMock = stubMethod($$.SANDBOX, RequirementProcessor, 'execute');
        executeSetupMock.resolves(Promise.resolve());
    });

    afterEach(() => {
        $$.restore();
    });

    it('Creates new Android emulator', async () => {
        const emulatorImagesMock = stubMethod($$.SANDBOX, AndroidUtils, 'fetchSupportedEmulatorImagePackage');
        emulatorImagesMock.resolves(
            new AndroidPackage(
                `${androidApi};${androidImage};${androidABI}`,
                new Version(35, 0, 0),
                'Google APIs Intel x86 Atom_64 System Image',
                `system-images/${androidApi}/${androidImage}/${androidABI}/`
            )
        );

        const createAvdMock = stubMethod($$.SANDBOX, AndroidUtils, 'createNewVirtualDevice');
        createAvdMock.resolves();

        await Create.run(['-p', 'android', '-n', deviceName, '-d', androidDeviceType]);

        expect(executeSetupMock.called).to.be.true;
        expect(emulatorImagesMock.called).to.be.true;
        expect(
            createAvdMock.calledWith(
                deviceName,
                androidImage,
                androidApi,
                androidDeviceType,
                androidABI,
                sinon.match.any
            )
        ).to.be.true;
    });

    it('Creates new iOS simulator', async () => {
        const runtimesMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'enumerateRuntimes');
        runtimesMock.resolves([
            {
                bundlePath:
                    '/Library/Developer/CoreSimulator/Volumes/iOS_21F79/Library/Developer/CoreSimulator/Profiles/Runtimes/iOS 18.5.simruntime',
                identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-18-5',
                isAvailable: true,
                isInternal: false,
                name: 'iOS 18.5',
                runtimeName: 'iOS-18-5',
                platform: 'iOS',
                runtimeRoot:
                    '/Library/Developer/CoreSimulator/Volumes/iOS_21F79/Library/Developer/CoreSimulator/Profiles/Runtimes/iOS 18.5.simruntime/Contents/Resources/RuntimeRoot',
                version: '18.5',
                buildversion: '21F79',
                supportedArchitectures: ['x86_64', 'arm64'],
                supportedDeviceTypes: [
                    {
                        bundlePath: '/Library/Developer/CoreSimulator/Profiles/DeviceTypes/iPhone 16.simdevicetype',
                        identifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-16',
                        name: 'iPhone 16',
                        productFamily: 'iPhone',
                        typeName: 'iPhone-16'
                    }
                ]
            } as AppleRuntime
        ]);

        const createSimMock = stubMethod($$.SANDBOX, IOSUtils, 'createNewDevice');
        createSimMock.resolves('TestUDID');

        await Create.run(['-p', 'ios', '-n', deviceName, '-d', iOSDeviceType]);

        expect(executeSetupMock.called).to.be.true;
        expect(runtimesMock.called).to.be.true;
        expect(createSimMock.calledWith(deviceName, iOSDeviceType, 'iOS-18-5', sinon.match.any)).to.be.true;
    });

    it('Logger must be initialized and invoked', async () => {
        const loggerMock = stubMethod($$.SANDBOX, Logger.prototype, 'info');
        stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'enumerateRuntimes').resolves([]);
        stubMethod($$.SANDBOX, IOSUtils, 'createNewDevice').resolves('TestUDID');
        await Create.run(['-p', 'ios', '-n', 'MyNewVirtualDevice', '-d', 'iPhone-8']);
        expect(loggerMock.called).to.be.true;
    });

    it('Messages folder should be loaded', async () => {
        expect(!Create.summary).to.be.false;
    });
});
