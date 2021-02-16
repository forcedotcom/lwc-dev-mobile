/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as Config from '@oclif/config';
import { Logger } from '@salesforce/core';
import { Setup } from '@salesforce/lwc-dev-mobile-core/lib/cli/commands/force/lightning/local/setup';
import { AndroidVirtualDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidTypes';
import { IOSSimulatorDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSTypes';
import { List } from '../list';

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
    beforeEach(() => {
        jest.spyOn(Setup.prototype, 'run').mockImplementation(passedSetupMock);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Checks that launch for target platform for Android is invoked', async () => {
        const list = makeList('android');
        await list.run();
        expect(androidListCommandBlockMock).toHaveBeenCalled();
    });

    test('Checks that launch for target platform for iOS is invoked', async () => {
        const list = makeList('ios');
        await list.run();
        expect(iOSListCommandBlockMock).toHaveBeenCalled();
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-logger');
        const loggerSpy = jest.spyOn(logger, 'info');
        jest.spyOn(Logger, 'child').mockReturnValue(Promise.resolve(logger));
        const list = makeList('android');
        await list.run();
        expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        expect(List.description !== null).toBeTruthy();
    });

    function makeList(platform: string): List {
        const list = new List(
            ['-p', platform],
            new Config.Config(({} as any) as Config.Options)
        );
        list.iOSDeviceList = iOSListCommandBlockMock;
        list.androidDeviceList = androidListCommandBlockMock;
        return list;
    }
});
