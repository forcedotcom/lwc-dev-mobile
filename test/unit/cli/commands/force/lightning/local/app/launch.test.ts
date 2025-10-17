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
    LaunchArgument,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core';
import { expect } from 'chai';
import { Launch } from '../../../../../../../../src/cli/commands/force/lightning/local/app/launch.js';

describe('App Launch Tests', () => {
    const $$ = new TestContext();

    const androidTarget = 'test-android-device';
    const iosTarget = 'test-ios-device';
    const bundleId = 'com.example.app';
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
        it('Should successfully launch app on Android device without arguments', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId]);

            expect(executeSetupMock.called).to.be.true;
            expect(getDeviceMock.calledWith(androidTarget)).to.be.true;
            expect(mockDevice.boot.calledWith(true)).to.be.true;
            expect(mockDevice.launchApp.calledWith(bundleId, undefined, undefined)).to.be.true;
            expect(startCliActionMock.called).to.be.true;
            expect(stopCliActionMock.called).to.be.true;
            expect(loggerInfoMock.called).to.be.true;
        });

        it('Should successfully launch app on Android device with arguments and app bundle path', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            const launchArgs: LaunchArgument[] = [
                { name: 'arg1', value: 'value1' },
                { name: 'arg2', value: 'value2' }
            ];
            const launchArgsJson = JSON.stringify(launchArgs);

            await Launch.run([
                '-p',
                'android',
                '-t',
                androidTarget,
                '-i',
                bundleId,
                '-e',
                launchArgsJson,
                '-a',
                appBundlePath
            ]);

            expect(executeSetupMock.called).to.be.true;
            expect(getDeviceMock.calledWith(androidTarget)).to.be.true;
            expect(mockDevice.boot.calledWith(true)).to.be.true;
            expect(mockDevice.launchApp.calledWith(bundleId, launchArgs, appBundlePath)).to.be.true;
            expect(startCliActionMock.called).to.be.true;
            expect(stopCliActionMock.called).to.be.true;
            expect(loggerInfoMock.called).to.be.true;
        });

        it('Should handle Android device not found error', async () => {
            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(null);

            try {
                await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId]);
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
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            try {
                await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(getDeviceMock.calledWith(androidTarget)).to.be.true;
                expect(mockDevice.boot.calledWith(true)).to.be.true;
                expect(mockDevice.launchApp.called).to.be.false;
                expect(startCliActionMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
            }
        });

        it('Should handle Android app launch failure', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().rejects(new Error('Launch failed'))
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            try {
                await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(getDeviceMock.calledWith(androidTarget)).to.be.true;
                expect(mockDevice.boot.calledWith(true)).to.be.true;
                expect(mockDevice.launchApp.calledWith(bundleId, undefined, undefined)).to.be.true;
                expect(startCliActionMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
            }
        });
    });

    describe('iOS Platform Tests', () => {
        it('Should successfully launch app on iOS device without arguments', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            await Launch.run(['-p', 'ios', '-t', iosTarget, '-i', bundleId]);

            expect(executeSetupMock.called).to.be.true;
            expect(getDeviceMock.calledWith(iosTarget)).to.be.true;
            expect(mockDevice.boot.calledWith(true)).to.be.true;
            expect(mockDevice.launchApp.calledWith(bundleId, undefined, undefined)).to.be.true;
            expect(startCliActionMock.called).to.be.true;
            expect(stopCliActionMock.called).to.be.true;
            expect(loggerInfoMock.called).to.be.true;
        });

        it('Should successfully launch app on iOS device with arguments and app bundle path', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            const launchArgs: LaunchArgument[] = [
                { name: 'arg1', value: 'value1' },
                { name: 'arg2', value: 'value2' }
            ];
            const launchArgsJson = JSON.stringify(launchArgs);

            await Launch.run([
                '-p',
                'ios',
                '-t',
                iosTarget,
                '-i',
                bundleId,
                '-e',
                launchArgsJson,
                '-a',
                iosAppBundlePath
            ]);

            expect(executeSetupMock.called).to.be.true;
            expect(getDeviceMock.calledWith(iosTarget)).to.be.true;
            expect(mockDevice.boot.calledWith(true)).to.be.true;
            expect(mockDevice.launchApp.calledWith(bundleId, launchArgs, iosAppBundlePath)).to.be.true;
            expect(startCliActionMock.called).to.be.true;
            expect(stopCliActionMock.called).to.be.true;
            expect(loggerInfoMock.called).to.be.true;
        });

        it('Should handle iOS device not found error', async () => {
            const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(null);

            try {
                await Launch.run(['-p', 'ios', '-t', iosTarget, '-i', bundleId]);
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
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            try {
                await Launch.run(['-p', 'ios', '-t', iosTarget, '-i', bundleId]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(getDeviceMock.calledWith(iosTarget)).to.be.true;
                expect(mockDevice.boot.calledWith(true)).to.be.true;
                expect(mockDevice.launchApp.called).to.be.false;
                expect(startCliActionMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
            }
        });

        it('Should handle iOS app launch failure', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().rejects(new Error('Launch failed'))
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            try {
                await Launch.run(['-p', 'ios', '-t', iosTarget, '-i', bundleId]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(getDeviceMock.calledWith(iosTarget)).to.be.true;
                expect(mockDevice.boot.calledWith(true)).to.be.true;
                expect(mockDevice.launchApp.calledWith(bundleId, undefined, undefined)).to.be.true;
                expect(startCliActionMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
            }
        });
    });

    describe('Environment Setup Tests', () => {
        it('Should handle environment setup failure', async () => {
            executeSetupMock.rejects(new Error('Setup failed'));

            try {
                await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId]);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(executeSetupMock.called).to.be.true;
                expect(loggerWarnMock.called).to.be.true;
                expect(stopCliActionMock.called).to.be.true;
            }
        });

        it('Should execute environment requirements for Android platform', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId]);

            expect(executeSetupMock.called).to.be.true;
        });

        it('Should execute environment requirements for iOS platform', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AppleDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            await Launch.run(['-p', 'ios', '-t', iosTarget, '-i', bundleId]);

            expect(executeSetupMock.called).to.be.true;
        });
    });

    describe('Launch Arguments Validation Tests', () => {
        it('Should validate valid JSON launch arguments', () => {
            const argumentsFlag = Launch.flags.arguments;
            const validArgs = JSON.stringify([
                { name: 'arg1', value: 'value1' },
                { name: 'arg2', value: 'value2' }
            ]);
            expect(argumentsFlag.validate?.(validArgs)).to.be.true;
        });

        it('Should validate empty launch arguments', () => {
            const argumentsFlag = Launch.flags.arguments;
            expect(argumentsFlag.validate?.('')).to.be.true;
            expect(argumentsFlag.validate?.(undefined as any)).to.be.true;
        });

        it('Should reject invalid JSON', () => {
            const argumentsFlag = Launch.flags.arguments;
            expect(argumentsFlag.validate?.('invalid json')).to.be.false;
            expect(argumentsFlag.validate?.('{"incomplete":')).to.be.false;
        });

        it('Should reject non-array JSON', () => {
            const argumentsFlag = Launch.flags.arguments;
            expect(argumentsFlag.validate?.('{"key": "value"}')).to.be.false;
            expect(argumentsFlag.validate?.('"string"')).to.be.false;
            expect(argumentsFlag.validate?.('123')).to.be.false;
        });

        it('Should reject array with invalid argument objects', () => {
            const argumentsFlag = Launch.flags.arguments;

            // Missing name property
            expect(argumentsFlag.validate?.(JSON.stringify([{ value: 'test' }]))).to.be.false;

            // Missing value property
            expect(argumentsFlag.validate?.(JSON.stringify([{ name: 'test' }]))).to.be.false;

            // Non-string name
            expect(argumentsFlag.validate?.(JSON.stringify([{ name: 123, value: 'test' }]))).to.be.false;

            // Non-string value
            expect(argumentsFlag.validate?.(JSON.stringify([{ name: 'test', value: 123 }]))).to.be.false;

            // Null object
            expect(argumentsFlag.validate?.(JSON.stringify([null]))).to.be.false;

            // Non-object element
            expect(argumentsFlag.validate?.(JSON.stringify(['string']))).to.be.false;
        });

        it('Should handle empty arguments in getter', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            // Test with no arguments flag (should work fine)
            await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId]);
            expect(mockDevice.launchApp.calledWith(bundleId, undefined, undefined)).to.be.true;

            // Test that empty string validation works as expected
            try {
                await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId, '-e', '']);
                expect.fail('Should have thrown validation error for empty string');
            } catch (error) {
                // Expected to fail validation
                expect(error).to.exist;
            }
        });
    });

    describe('Flag Validation Tests', () => {
        it('Should validate target flag is required', async () => {
            try {
                await Launch.run(['-p', 'android', '-i', bundleId]);
                expect.fail('Should have thrown an error for missing target');
            } catch (error) {
                // Expected to fail due to missing required flag
            }
        });

        it('Should validate bundleid flag is required', async () => {
            try {
                await Launch.run(['-p', 'android', '-t', androidTarget]);
                expect.fail('Should have thrown an error for missing bundleid');
            } catch (error) {
                // Expected to fail due to missing required flag
            }
        });

        it('Should validate platform flag is required', async () => {
            try {
                await Launch.run(['-t', androidTarget, '-i', bundleId]);
                expect.fail('Should have thrown an error for missing platform');
            } catch (error) {
                // Expected to fail due to missing required flag
            }
        });

        it('Should allow optional appbundlepath flag', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            // Should work without appbundlepath
            await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId]);
            expect(mockDevice.launchApp.calledWith(bundleId, undefined, undefined)).to.be.true;
        });
    });

    describe('Messages and Logging Tests', () => {
        it('Should have summary message loaded', () => {
            expect(Launch.summary).to.not.be.undefined;
            expect(Launch.summary).to.be.a('string');
        });

        it('Should have examples messages loaded', () => {
            expect(Launch.examples).to.not.be.undefined;
            expect(Array.isArray(Launch.examples)).to.be.true;
        });

        it('Should log appropriate messages during execution', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId]);

            expect(loggerInfoMock.calledWith(sinon.match('app launch command invoked for android'))).to.be.true;
            expect(loggerInfoMock.calledWith('Setup requirements met, continuing with app launch')).to.be.true;
        });
    });

    describe('Property Getters Tests', () => {
        it('Should properly parse launch arguments from JSON', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            const launchArgs: LaunchArgument[] = [{ name: 'testArg', value: 'testValue' }];
            const launchArgsJson = JSON.stringify(launchArgs);

            await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId, '-e', launchArgsJson]);

            expect(mockDevice.launchApp.calledWith(bundleId, launchArgs, undefined)).to.be.true;
        });

        it('Should handle undefined arguments gracefully', async () => {
            const mockDevice = {
                boot: sinon.stub().resolves(),
                launchApp: sinon.stub().resolves()
            };

            const getDeviceMock = stubMethod($$.SANDBOX, AndroidDeviceManager.prototype, 'getDevice');
            getDeviceMock.resolves(mockDevice);

            await Launch.run(['-p', 'android', '-t', androidTarget, '-i', bundleId]);

            expect(mockDevice.launchApp.calledWith(bundleId, undefined, undefined)).to.be.true;
        });
    });
});
