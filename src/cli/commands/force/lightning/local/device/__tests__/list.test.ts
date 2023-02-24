/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Config } from '@oclif/core/lib/config';
import { Options } from '@oclif/core/lib/interfaces';
import { Logger } from '@salesforce/core';
import { AndroidVirtualDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidTypes';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import { Version } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { IOSSimulatorDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSTypes';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import { List } from '../list';

describe('List Tests', () => {
    const iOSDevices: IOSSimulatorDevice[] = [
        new IOSSimulatorDevice(
            'iPhone-8',
            'udid-iPhone-8',
            'active',
            'iOS-13',
            true
        ),
        new IOSSimulatorDevice(
            'iPhone-X',
            'udid-iPhone-X',
            'active',
            'iOS-13',
            true
        ),
        new IOSSimulatorDevice(
            'iPhone-11',
            'udid-iPhone-11',
            'active',
            'iOS-14.2',
            true
        ),
        new IOSSimulatorDevice(
            'iPhone-11Pro',
            'udid-iPhone-11Pro',
            'active',
            'iOS-14.2',
            true
        )
    ];

    const androidDevices: AndroidVirtualDevice[] = [
        new AndroidVirtualDevice(
            'Pixel_XL',
            'Pixel XL',
            'pixel-xl-path',
            'Google APIs',
            'Android 9',
            Version.from('28')!
        ),
        new AndroidVirtualDevice(
            'Nexus_5X',
            'Nexus 5X',
            'nexus-5x-path',
            'Google APIs',
            'Android 10',
            Version.from('29')!
        ),
        new AndroidVirtualDevice(
            'Pixel_4_XL',
            'Pixel 4 XL',
            'pixel-4-xl-path',
            'Google APIs',
            'Android 11',
            Version.from('30')!
        )
    ];

    let getSupportedSimulatorsMock: jest.Mock<any, [], any>;
    let fetchEmulatorsMock: jest.Mock<any, [], any>;

    beforeEach(() => {
        getSupportedSimulatorsMock = jest.fn(
            (): Promise<IOSSimulatorDevice[]> => {
                return Promise.resolve(iOSDevices);
            }
        );

        fetchEmulatorsMock = jest.fn((): Promise<AndroidVirtualDevice[]> => {
            return Promise.resolve(androidDevices);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Checks that launch for target platform for Android is invoked', async () => {
        jest.spyOn(AndroidUtils, 'fetchEmulators').mockImplementation(
            fetchEmulatorsMock
        );
        const list = makeList('android');
        await list.init();
        await list.run();
        expect(fetchEmulatorsMock).toHaveBeenCalled();
    });

    test('Checks that launch for target platform for iOS is invoked', async () => {
        jest.spyOn(IOSUtils, 'getSupportedSimulators').mockImplementation(
            getSupportedSimulatorsMock
        );
        const list = makeList('ios');
        await list.init();
        await list.run();
        expect(getSupportedSimulatorsMock).toHaveBeenCalled();
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-logger');
        const loggerSpy = jest.spyOn(logger, 'info');
        jest.spyOn(Logger, 'child').mockReturnValue(Promise.resolve(logger));
        jest.spyOn(AndroidUtils, 'fetchEmulators').mockImplementation(
            fetchEmulatorsMock
        );
        const list = makeList('android');
        await list.init();
        await list.run();
        expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        expect(List.description !== null).toBeTruthy();
    });

    function makeList(platform: string): List {
        const list = new List(['-p', platform], new Config({} as Options));
        return list;
    }
});
