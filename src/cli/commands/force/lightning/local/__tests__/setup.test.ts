/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as Config from '@oclif/config';
import Setup from '../setup';
import {
    BaseSetup,
    SetupTestResult
} from '../../../../../../common/Requirements';
import { Messages, Logger, LoggerLevel } from '@salesforce/core';
import { IOSEnvironmentSetup } from '../../../../../../common/IOSEnvironmentSetup';
import { AndroidEnvironmentSetup } from '../../../../../../common/AndroidEnvironmentSetup';
enum PlatformType {
    android = 'android',
    ios = 'ios'
}

describe('Setup Tests', () => {
    let setup: Setup;

    afterEach(() => {});

    beforeEach(() => {
        setup = new Setup([], new Config.Config(<Config.Options>{}));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
    test('Checks that flags are passed correctly', async () => {
        let logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags(PlatformType.ios);
        setupMockExecIOS(PlatformType.ios);
        const mockCall = jest.fn((value) => {
            return true;
        });
        setup.validatePlatformValue = mockCall;
        await setup.run();
        return expect(mockCall).toHaveBeenCalledWith('ios');
    });

    test('Logger must be initialized and invoked', async () => {
        let logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags(PlatformType.ios);
        setupMockExecIOS(PlatformType.ios);
        let loggerSpy = jest.spyOn(logger, 'info');
        await setup.run();
        return expect(loggerSpy).toHaveBeenCalled();
    });

    test('Checks that Setup is initialized correctly for iOS', async () => {
        let myExecImpl = setupMockExecIOS(PlatformType.ios);
        let logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags(PlatformType.ios);
        await setup.run();
        expect(myExecImpl).toHaveBeenCalled();
    });

    test('Checks that Setup is initialized correctly for Android', async () => {
        let myExecImpl = setupMockExecIOS(PlatformType.android);
        let logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags(PlatformType.android);
        await setup.run();
        expect(myExecImpl).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        return expect(Setup.description !== null).toBeTruthy();
    });

    function setupFlags(platform: PlatformType) {
        Object.defineProperty(setup, 'flags', {
            get: () => {
                return { platform: platform.valueOf() };
            }
        });
    }

    function setupLogger(logger: Logger) {
        Object.defineProperty(setup, 'logger', {
            get: () => {
                return logger;
            },
            configurable: true,
            enumerable: false
        });
    }

    function setupMockExecIOS(platform: PlatformType): any {
        let myExecImpl = jest.fn(
            (setup): Promise<SetupTestResult> => {
                return new Promise((resolve, reject) => {
                    let result = false;
                    switch (platform) {
                        case PlatformType.ios:
                            if (setup instanceof IOSEnvironmentSetup)
                                result = true;
                            break;
                        case PlatformType.android:
                            if (setup instanceof AndroidEnvironmentSetup)
                                result = true;
                            break;
                    }
                    resolve({ hasMetAllRequirements: result, tests: [] });
                });
            }
        );

        setup.executeSetup = myExecImpl;
        return myExecImpl;
    }
});
