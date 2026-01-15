/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

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
    CommonUtils,
    DeviceType,
    IOSUtils,
    PlatformConfig,
    Version
} from '@salesforce/lwc-dev-mobile-core';
import { expect } from 'chai';
import { List } from '../../../../../../../../src/cli/commands/force/lightning/local/device/list.js';

describe('Device List Tests', () => {
    const $$ = new TestContext();

    const androidDeviceGoogleApi = new AndroidDevice(
        'Pixel_5_API_35',
        'Pixel 5 API 35',
        DeviceType.mobile,
        AndroidOSType.googleAPIs,
        new Version(35, 0, 0),
        false
    );

    const androidDeviceDefault = new AndroidDevice(
        'Pixel_Default',
        'Pixel Default',
        DeviceType.mobile,
        'default',
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

    let startCliActionMock: sinon.SinonStub<any[], any>;
    let stopCliActionMock: sinon.SinonStub<any[], any>;

    beforeEach(() => {
        startCliActionMock = stubMethod($$.SANDBOX, CommonUtils, 'startCliAction');
        stopCliActionMock = stubMethod($$.SANDBOX, CommonUtils, 'stopCliAction');
    });

    afterEach(() => {
        startCliActionMock.resetHistory();
        stopCliActionMock.resetHistory();
        $$.restore();
    });

    it('Lists Android emulators for cli mode', async () => {
        const enumerateMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'enumerateDevices').resolves([
            androidDeviceGoogleApi
        ]);
        await List.run(['-p', 'android']);

        expect(enumerateMock.called).to.be.true;
        expect(startCliActionMock.called).to.be.true;
        expect(stopCliActionMock.called).to.be.true;

        expect(enumerateMock.calledWith()).to.be.true;
    });

    it('Lists Android emulators with ostype flag set to default for cli mode', async () => {
        const enumerateMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'enumerateDevices').resolves([
            androidDeviceDefault,
            androidDeviceGoogleApi
        ]);
        await List.run(['-p', 'android', '--ostype', 'default']);

        expect(enumerateMock.called).to.be.true;
        expect(startCliActionMock.called).to.be.true;
        expect(stopCliActionMock.called).to.be.true;

        expect(
            enumerateMock.calledWith([
                {
                    osType: 'default',
                    minOSVersion: Version.from(PlatformConfig.androidConfig().minSupportedRuntime)!
                }
            ])
        ).to.be.true;
    });

    it('Lists Android emulators with ostype flag set to all for cli mode', async () => {
        const enumerateMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'enumerateDevices').resolves([
            androidDeviceDefault,
            androidDeviceGoogleApi
        ]);
        await List.run(['-p', 'android', '--ostype', 'all']);

        expect(enumerateMock.called).to.be.true;
        expect(startCliActionMock.called).to.be.true;
        expect(stopCliActionMock.called).to.be.true;

        expect(enumerateMock.calledWith(null)).to.be.true;
    });

    it('Lists Android emulators for json mode', async () => {
        const enumerateMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'enumerateDevices').resolves([
            androidDeviceGoogleApi
        ]);
        await List.run(['-p', 'android', '--json']);

        expect(enumerateMock.called).to.be.true;
        expect(startCliActionMock.called).to.be.false;
        expect(stopCliActionMock.called).to.be.false;
    });

    it('Lists iOS simulators for cli mode', async () => {
        const enumerateMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'enumerateDevices').resolves([
            appleDevice
        ]);
        await List.run(['-p', 'ios']);

        expect(enumerateMock.called).to.be.true;
        expect(startCliActionMock.called).to.be.true;
        expect(stopCliActionMock.called).to.be.true;
    });

    it('Lists iOS simulators for json mode', async () => {
        const enumerateMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'enumerateDevices').resolves([
            appleDevice
        ]);
        await List.run(['-p', 'ios', '-f', 'api']);

        expect(enumerateMock.called).to.be.true;
        expect(startCliActionMock.called).to.be.false;
        expect(stopCliActionMock.called).to.be.false;
    });

    it('Logger must be initialized and invoked', async () => {
        const loggerMock = stubMethod($$.SANDBOX, Logger.prototype, 'info');
        stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'enumerateRuntimes').resolves([]);
        stubMethod($$.SANDBOX, IOSUtils, 'createNewDevice').resolves('TestUDID');
        await List.run(['-p', 'ios']);
        expect(loggerMock.called).to.be.true;
    });

    it('Messages folder should be loaded', async () => {
        expect(!List.summary).to.be.false;
    });
});
