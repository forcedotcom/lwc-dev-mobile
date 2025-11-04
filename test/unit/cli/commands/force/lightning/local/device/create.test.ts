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
    AndroidDevice,
    AndroidDeviceManager,
    AndroidOSType,
    AndroidPackage,
    AndroidUtils,
    AppleDevice,
    AppleDeviceManager,
    AppleOSType,
    AppleRuntime,
    CommonUtils,
    DeviceType,
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

    const androidPackage = new AndroidPackage(
        `${androidApi};${androidImage};${androidABI}`,
        new Version(35, 0, 0),
        'Google APIs Intel x86 Atom_64 System Image',
        `system-images/${androidApi}/${androidImage}/${androidABI}/`
    );

    const iosRuntimeList = [
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
    ];

    let executeSetupMock: sinon.SinonStub<any[], any>;
    let startCliActionMock: sinon.SinonStub<any[], any>;
    let stopCliActionMock: sinon.SinonStub<any[], any>;

    beforeEach(() => {
        executeSetupMock = stubMethod($$.SANDBOX, RequirementProcessor, 'execute');
        executeSetupMock.resolves(Promise.resolve());
        startCliActionMock = stubMethod($$.SANDBOX, CommonUtils, 'startCliAction');
        stopCliActionMock = stubMethod($$.SANDBOX, CommonUtils, 'stopCliAction');
    });

    afterEach(() => {
        executeSetupMock.resetHistory();
        startCliActionMock.resetHistory();
        stopCliActionMock.resetHistory();
        $$.restore();
    });

    it('Creates new Android emulator for cli mode', async () => {
        const emulatorImagesMock = stubMethod($$.SANDBOX, AndroidUtils, 'fetchSupportedEmulatorImagePackage');
        emulatorImagesMock.resolves(androidPackage);

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
        expect(startCliActionMock.called).to.be.true;
        expect(stopCliActionMock.called).to.be.true;
    });

    it('Creates new Android emulator for json mode', async () => {
        const androidDevice = new AndroidDevice(
            deviceName,
            deviceName,
            DeviceType.mobile,
            AndroidOSType.googleAPIs,
            new Version(35, 0, 0),
            false
        );

        const emulatorImagesMock = stubMethod($$.SANDBOX, AndroidUtils, 'fetchSupportedEmulatorImagePackage');
        emulatorImagesMock.resolves(androidPackage);

        const createAvdMock = stubMethod($$.SANDBOX, AndroidUtils, 'createNewVirtualDevice');
        createAvdMock.resolves();

        const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice').resolves(
            androidDevice
        );

        const result = await Create.run(['-p', 'android', '-n', deviceName, '-d', androidDeviceType, '--json']);

        expect(result).to.have.property('success', true);
        expect(result).to.have.property('device');
        expect(result).to.have.property('message');
        expect(executeSetupMock.called).to.be.false;
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
        expect(getDeviceMock.called).to.be.true;
        expect(startCliActionMock.called).to.be.false;
        expect(stopCliActionMock.called).to.be.false;
    });

    it('Creates new iOS simulator for cli mode', async () => {
        const runtimesMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'enumerateRuntimes');
        runtimesMock.resolves(iosRuntimeList);

        const createSimMock = stubMethod($$.SANDBOX, IOSUtils, 'createNewDevice');
        createSimMock.resolves('TestUDID');

        await Create.run(['-p', 'ios', '-n', deviceName, '-d', iOSDeviceType]);

        expect(executeSetupMock.called).to.be.true;
        expect(runtimesMock.called).to.be.true;
        expect(createSimMock.calledWith(deviceName, iOSDeviceType, 'iOS-18-5', sinon.match.any)).to.be.true;
        expect(startCliActionMock.called).to.be.true;
        expect(stopCliActionMock.called).to.be.true;
    });

    it('Creates new iOS simulator for json mode', async () => {
        const appleDevice = new AppleDevice(
            '3627EBD5-E9EC-4EC4-8E89-C6A0232C920D',
            deviceName,
            DeviceType.mobile,
            AppleOSType.iOS,
            new Version(18, 5, 0)
        );

        const runtimesMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'enumerateRuntimes');
        runtimesMock.resolves(iosRuntimeList);

        const createSimMock = stubMethod($$.SANDBOX, IOSUtils, 'createNewDevice');
        createSimMock.resolves('TestUDID');

        const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice').resolves(appleDevice);

        const result = await Create.run(['-p', 'ios', '-n', deviceName, '-d', iOSDeviceType, '--json']);

        expect(result).to.have.property('success', true);
        expect(result).to.have.property('device');
        expect(result).to.have.property('message');
        expect(executeSetupMock.called).to.be.false;
        expect(runtimesMock.called).to.be.true;
        expect(createSimMock.calledWith(deviceName, iOSDeviceType, 'iOS-18-5', sinon.match.any)).to.be.true;
        expect(getDeviceMock.called).to.be.true;
        expect(startCliActionMock.called).to.be.false;
        expect(stopCliActionMock.called).to.be.false;
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
