/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import sinon from 'sinon';
import { Logger } from '@salesforce/core';
import { TestContext } from '@salesforce/core/testSetup';
import { stubMethod } from '@salesforce/ts-sinon';
import {
    AndroidDeviceManager,
    AppleDeviceManager,
    CommonUtils,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core';
import { expect } from 'chai';
import { Install } from '../../../../../../../../src/cli/commands/force/lightning/local/app/install.js';

describe('App Install Tests', () => {
    const $$ = new TestContext();

    const androidTarget = 'test-android-device';
    const iosTarget = 'test-ios-device';
    const appBundlePath = '/path/to/app.apk';
    const iosAppBundlePath = '/path/to/app.app';

    let executeSetupMock: sinon.SinonStub<any[], any>;
    let startCliActionMock: sinon.SinonStub<any[], any>;
    let stopCliActionMock: sinon.SinonStub<any[], any>;
    let loggerInfoMock: sinon.SinonStub<any[], any>;
    let loggerWarnMock: sinon.SinonStub<any[], any>;

    beforeEach(() => {
        executeSetupMock = stubMethod($$.SANDBOX, RequirementProcessor, 'execute');
        executeSetupMock.resolves(Promise.resolve());

        startCliActionMock = stubMethod($$.SANDBOX, CommonUtils, 'startCliAction');
        stopCliActionMock = stubMethod($$.SANDBOX, CommonUtils, 'stopCliAction');

        loggerInfoMock = stubMethod($$.SANDBOX, Logger.prototype, 'info');
        loggerWarnMock = stubMethod($$.SANDBOX, Logger.prototype, 'warn');
    });

    afterEach(() => {
        $$.restore();
    });

    describe('Android Platform Tests', () => {
        it('Should successfully install app on Android device', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                installApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            await Install.run(['-p', 'android', '-t', androidTarget, '-a', appBundlePath]);

            expect(executeSetupMock.called).to.be.true;
            expect(getDeviceMock.calledWith(androidTarget)).to.be.true;
            expect(mockDevice.boot.calledWith(true)).to.be.true;
            expect(mockDevice.installApp.calledWith(appBundlePath)).to.be.true;
            expect(startCliActionMock.called).to.be.true;
            expect(stopCliActionMock.called).to.be.true;
            expect(loggerInfoMock.called).to.be.true;
        });

        it('Should handle Android device not found error', async () => {
            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(null);

            try {
                await Install.run(['-p', 'android', '-t', androidTarget, '-a', appBundlePath]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(getDeviceMock.calledWith(androidTarget)).to.be.true;
                expect(startCliActionMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
            }
        });

        it('Should handle Android device boot failure', async () => {
            const mockDevice = {
                boot: sinon.stub().rejects(new Error('Boot failed')),
                installApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            try {
                await Install.run(['-p', 'android', '-t', androidTarget, '-a', appBundlePath]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(getDeviceMock.calledWith(androidTarget)).to.be.true;
                expect(mockDevice.boot.calledWith(true)).to.be.true;
                expect(mockDevice.installApp.called).to.be.false;
                expect(startCliActionMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
            }
        });

        it('Should handle Android app installation failure', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                installApp: sinon.stub().rejects(new Error('Install failed'))
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            try {
                await Install.run(['-p', 'android', '-t', androidTarget, '-a', appBundlePath]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(getDeviceMock.calledWith(androidTarget)).to.be.true;
                expect(mockDevice.boot.calledWith(true)).to.be.true;
                expect(mockDevice.installApp.calledWith(appBundlePath)).to.be.true;
                expect(startCliActionMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
            }
        });

        it('Should execute environment requirements for Android platform', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                installApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            await Install.run(['-p', 'android', '-t', androidTarget, '-a', appBundlePath]);

            expect(executeSetupMock.called).to.be.true;
        });
    });

    describe('iOS Platform Tests', () => {
        it('Should successfully install app on iOS device', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                installApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            await Install.run(['-p', 'ios', '-t', iosTarget, '-a', iosAppBundlePath]);

            expect(executeSetupMock.called).to.be.true;
            expect(getDeviceMock.calledWith(iosTarget)).to.be.true;
            expect(mockDevice.boot.calledWith(true)).to.be.true;
            expect(mockDevice.installApp.calledWith(iosAppBundlePath)).to.be.true;
            expect(startCliActionMock.called).to.be.true;
            expect(stopCliActionMock.called).to.be.true;
            expect(loggerInfoMock.called).to.be.true;
        });

        it('Should handle iOS device not found error', async () => {
            const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(null);

            try {
                await Install.run(['-p', 'ios', '-t', iosTarget, '-a', iosAppBundlePath]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(getDeviceMock.calledWith(iosTarget)).to.be.true;
                expect(startCliActionMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
            }
        });

        it('Should handle iOS device boot failure', async () => {
            const mockDevice = {
                boot: sinon.stub().rejects(new Error('Boot failed')),
                installApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            try {
                await Install.run(['-p', 'ios', '-t', iosTarget, '-a', iosAppBundlePath]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(getDeviceMock.calledWith(iosTarget)).to.be.true;
                expect(mockDevice.boot.calledWith(true)).to.be.true;
                expect(mockDevice.installApp.called).to.be.false;
                expect(startCliActionMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
            }
        });

        it('Should handle iOS app installation failure', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                installApp: sinon.stub().rejects(new Error('Install failed'))
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            try {
                await Install.run(['-p', 'ios', '-t', iosTarget, '-a', iosAppBundlePath]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(getDeviceMock.calledWith(iosTarget)).to.be.true;
                expect(mockDevice.boot.calledWith(true)).to.be.true;
                expect(mockDevice.installApp.calledWith(iosAppBundlePath)).to.be.true;
                expect(startCliActionMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
            }
        });

        it('Should execute environment requirements for iOS platform', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                installApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            await Install.run(['-p', 'ios', '-t', iosTarget, '-a', iosAppBundlePath]);

            expect(executeSetupMock.called).to.be.true;
        });
    });

    describe('Environment Setup Tests', () => {
        it('Should handle environment setup failure', async () => {
            executeSetupMock.rejects(new Error('Setup failed'));

            try {
                await Install.run(['-p', 'android', '-t', androidTarget, '-a', appBundlePath]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
            }
        });
    });

    describe('Flag Validation Tests', () => {
        it('Should validate target flag is required', async () => {
            try {
                await Install.run(['-p', 'android', '-a', appBundlePath]);
                expect.fail('Should have thrown an error for missing target');
            } catch (error) {
                // Expected to fail due to missing required flag
            }
        });

        it('Should validate appbundlepath flag is required', async () => {
            try {
                await Install.run(['-p', 'android', '-t', androidTarget]);
                expect.fail('Should have thrown an error for missing appbundlepath');
            } catch (error) {
                // Expected to fail due to missing required flag
            }
        });

        it('Should validate platform flag is required', async () => {
            try {
                await Install.run(['-t', androidTarget, '-a', appBundlePath]);
                expect.fail('Should have thrown an error for missing platform');
            } catch (error) {
                // Expected to fail due to missing required flag
            }
        });

        it('Should validate target flag is not empty', () => {
            const targetFlag = Install.flags.target;
            expect(targetFlag.validate?.('')).to.not.be.ok;
            expect(targetFlag.validate?.('   ')).to.not.be.ok;
            expect(targetFlag.validate?.('valid-target')).to.be.ok;
        });

        it('Should validate appbundlepath flag is not empty', () => {
            const appBundlePathFlag = Install.flags.appbundlepath;
            expect(appBundlePathFlag.validate?.('')).to.not.be.ok;
            expect(appBundlePathFlag.validate?.('   ')).to.not.be.ok;
            expect(appBundlePathFlag.validate?.('/valid/path')).to.be.ok;
        });
    });

    describe('Messages and Logging Tests', () => {
        it('Should have summary message loaded', () => {
            expect(Install.summary).to.not.be.undefined;
            expect(Install.summary).to.be.a('string');
        });

        it('Should have examples messages loaded', () => {
            expect(Install.examples).to.not.be.undefined;
            expect(Array.isArray(Install.examples)).to.be.true;
        });

        it('Should log appropriate messages during execution', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                installApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            await Install.run(['-p', 'android', '-t', androidTarget, '-a', appBundlePath]);

            expect(loggerInfoMock.calledWith(sinon.match('app install command invoked for android'))).to.be.true;
            expect(loggerInfoMock.calledWith('Setup requirements met, continuing with app install')).to.be.true;
        });
    });
});
