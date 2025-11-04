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
    AppleDevice,
    AppleDeviceManager,
    AppleOSType,
    BootMode,
    CommonUtils,
    DeviceType,
    RequirementProcessor,
    Version
} from '@salesforce/lwc-dev-mobile-core';
import { expect } from 'chai';
import { Start } from '../../../../../../../../src/cli/commands/force/lightning/local/device/start.js';

describe('Device Start Tests', () => {
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

    it('Starts up Android emulator for cli mode', async () => {
        const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice').resolves(
            androidDevice
        );
        const bootMock = stubMethod($$.SANDBOX, AndroidDevice.prototype, 'boot').resolves();
        const result = await Start.run(['-p', 'android', '-t', androidDevice.name, '-w']);

        expect(result).to.be.undefined;
        expect(executeSetupMock.called).to.be.true;
        expect(getDeviceMock.called).to.be.true;
        expect(bootMock.calledWith(true, BootMode.systemWritableMandatory)).to.be.true;
        expect(startCliActionMock.calledOnce).to.be.true;
        expect(stopCliActionMock.calledOnce).to.be.true;
    });

    it('Starts up Android emulator for json mode', async () => {
        const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice').resolves(
            androidDevice
        );
        const bootMock = stubMethod($$.SANDBOX, AndroidDevice.prototype, 'boot').resolves();
        const result = await Start.run(['-p', 'android', '-t', androidDevice.name, '-w', '--json']);

        expect(result).to.have.property('success', true);
        expect(result).to.have.property('device');
        expect(result).to.have.property('message');
        expect(executeSetupMock.called).to.be.false;
        expect(getDeviceMock.called).to.be.true;
        expect(bootMock.calledWith(true, BootMode.systemWritableMandatory)).to.be.true;
        expect(startCliActionMock.called).to.be.false;
        expect(stopCliActionMock.called).to.be.false;
    });

    it('Starts up iOS simulator for cli mode', async () => {
        const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice').resolves(appleDevice);
        const bootMock = stubMethod($$.SANDBOX, AppleDevice.prototype, 'boot').resolves();
        const result = await Start.run(['-p', 'ios', '-t', appleDevice.name]);

        expect(result).to.be.undefined;
        expect(executeSetupMock.called).to.be.true;
        expect(getDeviceMock.called).to.be.true;
        expect(bootMock.calledWith(true)).to.be.true;
        expect(startCliActionMock.calledOnce).to.be.true;
        expect(stopCliActionMock.calledOnce).to.be.true;
    });

    it('Starts up iOS simulator for json mode', async () => {
        const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice').resolves(appleDevice);
        const bootMock = stubMethod($$.SANDBOX, AppleDevice.prototype, 'boot').resolves();
        const result = await Start.run(['-p', 'ios', '-t', appleDevice.name, '-f', 'api']);

        expect(result).to.have.property('success', true);
        expect(result).to.have.property('device');
        expect(result).to.have.property('message');
        expect(executeSetupMock.called).to.be.false;
        expect(getDeviceMock.called).to.be.true;
        expect(bootMock.calledWith(true)).to.be.true;
        expect(startCliActionMock.called).to.be.false;
        expect(stopCliActionMock.called).to.be.false;
    });

    it('Logger must be initialized and invoked', async () => {
        const loggerMock = stubMethod($$.SANDBOX, Logger.prototype, 'info');
        stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice').resolves(appleDevice);
        stubMethod($$.SANDBOX, AppleDevice.prototype, 'boot').resolves();
        await Start.run(['-p', 'ios', '-t', appleDevice.name]);
        expect(loggerMock.called).to.be.true;
    });

    it('Messages folder should be loaded', async () => {
        expect(!Start.summary).to.be.false;
    });
});
