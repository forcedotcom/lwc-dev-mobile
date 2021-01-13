/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as Config from '@oclif/config';
import { Logger } from '@salesforce/core';
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

describe('List Tests', () => {
    const logger = new Logger('test-list');
    let list: List;

    beforeEach(() => {
        list = new List([], new Config.Config(({} as any) as Config.Options));
        list.iOSDeviceList = iOSListCommandBlockMock;
        list.androidDeviceList = androidListCommandBlockMock;
        setupLogger();
        jest.spyOn(Setup.prototype, 'run').mockImplementation(passedSetupMock);
    });

    test('Checks that launch for target platform for Android is invoked', async () => {
        setupPlatformFlag('android');
        await list.run();
        expect(androidListCommandBlockMock).toHaveBeenCalled();
    });

    test('Checks that launch for target platform for iOS is invoked', async () => {
        setupPlatformFlag('iOS');
        await list.run();
        expect(iOSListCommandBlockMock).toHaveBeenCalled();
    });

    test('Logger must be initialized and invoked', async () => {
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

    function setupLogger() {
        Object.defineProperty(list, 'logger', {
            configurable: true,
            enumerable: false,
            get: () => {
                return logger;
            }
        });
    }
});
