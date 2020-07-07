/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as Config from '@oclif/config';
import { Logger } from '@salesforce/core';
import { CommandLineUtils } from '../../../../../../common/Common';
import { SetupTestResult } from '../../../../../../common/Requirements';
import Setup from '../setup';
enum PlatformType {
    android = 'android',
    ios = 'ios'
}
const passedHooksMock = jest.fn((ars: any) => {
    return Promise.resolve();
});

describe('Setup Tests', () => {
    let setup: Setup;

    afterEach(() => undefined);

    beforeEach(() => {
        const config = new Config.Config(({} as any) as Config.Options);
        setup = new Setup([], config);
        jest.spyOn(config, 'runHook').mockImplementation(passedHooksMock);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
    test('Checks that flags are passed correctly', async () => {
        const logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags(PlatformType.ios);
        setupMockExecIOS(PlatformType.ios);
        const mockCall = jest.fn(() => {
            return true;
        });
        CommandLineUtils.platformFlagIsValid = mockCall;
        await setup.run();
        expect(mockCall).toHaveBeenCalledWith('ios');
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags(PlatformType.ios);
        setupMockExecIOS(PlatformType.ios);
        const loggerSpy = jest.spyOn(logger, 'info');
        await setup.run();
        expect(loggerSpy).toHaveBeenCalled();
    });

    test('Checks that Setup is initialized correctly for iOS', async () => {
        const myExecImpl = setupMockExecIOS(PlatformType.ios);
        const logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags(PlatformType.ios);
        await setup.run();
        expect(myExecImpl).toHaveBeenCalled();
    });

    test('Checks that Setup is initialized correctly for Android', async () => {
        const myExecImpl = setupMockExecIOS(PlatformType.android);
        const logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags(PlatformType.android);
        await setup.run();
        expect(myExecImpl).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        expect(Setup.description !== null).toBeTruthy();
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
            configurable: true,
            enumerable: false,
            get: () => {
                return logger;
            }
        });
    }

    function setupMockExecIOS(platform: PlatformType): any {
        const myExecImpl = jest.fn(
            (): Promise<SetupTestResult> => {
                return new Promise((resolve) => {
                    let result = false;
                    switch (platform) {
                        case PlatformType.ios:
                            result = true;
                            break;
                        case PlatformType.android:
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
