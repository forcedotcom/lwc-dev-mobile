/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as Config from '@oclif/config';
import { Logger, SfdxError } from '@salesforce/core';
import { AndroidVirtualDevice } from '../../../../../../../common/AndroidTypes';
import { IOSSimulatorDevice } from '../../../../../../../common/IOSTypes';
import Setup from '../../setup';
import List from '../list';

const iOSListCommandBlockMock = jest.fn(
    (): Promise<IOSSimulatorDevice[]> => {
        return Promise.resolve([]);
    }
);

const androidListCommandBlockMock = jest.fn(
    (): Promise<AndroidVirtualDevice[]> => {
        return Promise.resolve([]);
    }
);

const passedSetupMock = jest.fn(() => {
    return Promise.resolve({ hasMetAllRequirements: true, tests: [] });
});

const failedSetupMock = jest.fn(() => {
    return Promise.resolve({
        hasMetAllRequirements: false,
        tests: ['Mock Failure in tests!']
    });
});

describe('List Tests', () => {
    let list: List;

    beforeEach(() => {
        list = new List([], new Config.Config(({} as any) as Config.Options));
        list.iOSDeviceList = iOSListCommandBlockMock;
        list.androidDeviceList = androidListCommandBlockMock;
        jest.spyOn(Setup.prototype, 'run').mockImplementation(passedSetupMock);
    });

    test('Checks that launch for target platform for Android is invoked', async () => {
        setupPlatformFlag('android');
        const logger = new Logger('test-list');
        setupLogger(logger);
        await list.run();
        expect(androidListCommandBlockMock).toHaveBeenCalled();
    });

    test('Checks that launch for target platform for iOS is invoked', async () => {
        setupPlatformFlag('iOS');
        const logger = new Logger('test-list');
        setupLogger(logger);
        await list.run();
        expect(iOSListCommandBlockMock).toHaveBeenCalled();
    });

    test('Checks that setup is invoked', async () => {
        setupPlatformFlag('android');
        const logger = new Logger('test-list');
        setupLogger(logger);
        await list.run();
        expect(passedSetupMock).toHaveBeenCalled();
    });

    test('Device List should throw an error if setup fails', async () => {
        setupPlatformFlag('android');
        const logger = new Logger('test-list');
        setupLogger(logger);
        jest.spyOn(Setup.prototype, 'run').mockImplementation(failedSetupMock);
        list.run().catch((error) => {
            expect(error && error instanceof SfdxError).toBeTruthy();
        });
        expect(failedSetupMock).toHaveBeenCalled();
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-list');
        setupLogger(logger);
        setupPlatformFlag('android');
        const loggerSpy = jest.spyOn(logger, 'info');
        await list.run();
        expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        expect(List.description !== null).toBeTruthy();
    });

    function setupPlatformFlag(platformFlag: string) {
        Object.defineProperty(list, 'flags', {
            get: () => {
                return {
                    platform: platformFlag
                };
            }
        });
    }

    function setupLogger(logger: Logger) {
        Object.defineProperty(list, 'logger', {
            configurable: true,
            enumerable: false,
            get: () => {
                return logger;
            }
        });
    }
});
