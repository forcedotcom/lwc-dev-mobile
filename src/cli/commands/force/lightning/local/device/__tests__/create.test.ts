/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as Config from '@oclif/config';
import { Logger } from '@salesforce/core';
import { AndroidPackage } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidTypes';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { Version } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import { RequirementProcessor } from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import { Create } from '../create';

const passedSetupMock = jest.fn(() => {
    return Promise.resolve();
});

const deviceName = 'MyDeviceName';
const iOSDeviceType = 'iPhone-8';
const iOSSupportedRuntimes = ['iOS-14-2', 'iOS-14', 'iOS-13.2'];
const androidDeviceType = 'pixel_xl';
const androidApi = 'android-29';
const androidImage = 'google_apis';
const androidABI = 'x86_64';

const findEmulatorImagesMock = jest.fn(() => {
    return Promise.resolve(
        new AndroidPackage(
            `${androidApi};${androidImage};${androidABI}`,
            new Version(29, 0, 0),
            'Google APIs Intel x86 Atom_64 System Image',
            `system-images/${androidApi}/${androidImage}/${androidABI}/`
        )
    );
});

describe('Create Tests', () => {
    beforeEach(() => {
        // tslint:disable-next-line: no-empty
        jest.spyOn(CommonUtils, 'startCliAction').mockImplementation(() => {});
        jest.spyOn(RequirementProcessor, 'execute').mockImplementation(
            passedSetupMock
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Checks that launch for target platform for Android is invoked', async () => {
        const createNewVirtualDeviceMock = jest.fn(() => {
            return Promise.resolve();
        });
        jest.spyOn(
            AndroidUtils,
            'fetchSupportedEmulatorImagePackage'
        ).mockImplementation(findEmulatorImagesMock);

        jest.spyOn(AndroidUtils, 'createNewVirtualDevice').mockImplementation(
            createNewVirtualDeviceMock
        );

        const create = makeCreate(deviceName, androidDeviceType, 'android');
        await create.run();
        expect(createNewVirtualDeviceMock).toHaveBeenCalledWith(
            deviceName,
            androidImage,
            androidApi,
            androidDeviceType,
            androidABI
        );
    });

    test('Checks that launch for target platform for iOS is invoked', async () => {
        const getSupportedRuntimesMock = jest.fn(() => {
            return Promise.resolve(iOSSupportedRuntimes);
        });
        const createNewDeviceMock = jest.fn(() => {
            return Promise.resolve('UDID');
        });
        jest.spyOn(IOSUtils, 'getSupportedRuntimes').mockImplementation(
            getSupportedRuntimesMock
        );
        jest.spyOn(IOSUtils, 'createNewDevice').mockImplementation(
            createNewDeviceMock
        );

        const create = makeCreate(deviceName, iOSDeviceType, 'ios');
        await create.run();
        expect(createNewDeviceMock).toHaveBeenCalledWith(
            deviceName,
            iOSDeviceType,
            iOSSupportedRuntimes[0]
        );
    });

    test('Checks additional requirements are executed', async () => {
        jest.restoreAllMocks();
        // tslint:disable-next-line: no-empty
        jest.spyOn(CommonUtils, 'startCliAction').mockImplementation(() => {});
        jest.spyOn(IOSUtils, 'getSupportedRuntimes').mockReturnValue(
            Promise.resolve(iOSSupportedRuntimes)
        );
        jest.spyOn(IOSUtils, 'getSimulator').mockReturnValue(
            Promise.resolve(null)
        );
        jest.spyOn(IOSUtils, 'getSupportedDevices').mockReturnValue(
            Promise.resolve(['iPhone-8'])
        );
        const createNewDeviceMock = jest.fn(() => {
            return Promise.resolve('UDID');
        });
        jest.spyOn(IOSUtils, 'createNewDevice').mockImplementation(
            createNewDeviceMock
        );
        jest.spyOn(RequirementProcessor, 'execute').mockImplementation(
            passedSetupMock
        );

        const create = makeCreate(deviceName, iOSDeviceType, 'ios');
        await create.run();
        expect(createNewDeviceMock).toHaveBeenCalledWith(
            deviceName,
            iOSDeviceType,
            iOSSupportedRuntimes[0]
        );
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-logger');
        const loggerSpy = jest.spyOn(logger, 'info');
        jest.spyOn(Logger, 'child').mockReturnValue(Promise.resolve(logger));
        jest.spyOn(
            AndroidUtils,
            'fetchSupportedEmulatorImagePackage'
        ).mockImplementation(findEmulatorImagesMock);
        jest.spyOn(AndroidUtils, 'createNewVirtualDevice').mockReturnValue(
            Promise.resolve()
        );
        const create = makeCreate(deviceName, androidDeviceType, 'android');
        await create.run();
        expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        expect(Create.description !== null).toBeTruthy();
    });

    function makeCreate(name: string, type: string, platform: string): Create {
        const create = new Create(
            ['-n', name, '-d', type, '-p', platform],
            new Config.Config(({} as any) as Config.Options)
        );
        return create;
    }
});
