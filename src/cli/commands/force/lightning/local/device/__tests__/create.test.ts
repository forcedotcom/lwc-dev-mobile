/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as Config from '@oclif/config';
import { Logger } from '@salesforce/core';
import { AndroidPackage } from '../../../../../../../common/AndroidTypes';
import { AndroidSDKUtils } from '../../../../../../../common/AndroidUtils';
import { Version } from '../../../../../../../common/Common';
import { IOSUtils } from '../../../../../../../common/IOSUtils';
import Setup from '../../setup';
import Create from '../create';

const passedSetupMock = jest.fn(() => {
    return Promise.resolve({ hasMetAllRequirements: true, tests: [] });
});

const deviceName = 'MyDeviceName';
const iOSDeviceType = 'iPhone-8';
const iOSSupportedRuntimes = ['iOS-14-2', 'iOS-14', 'iOS-13.2'];
const androidDeviceType = 'pixel_xl';
const androidApi = 'android-29';
const androidImage = 'google_apis';
const androidABI = 'x86_64';

describe('List Tests', () => {
    const logger = new Logger('test-create');
    let create: Create;

    beforeEach(() => {
        create = new Create(
            [],
            new Config.Config(({} as any) as Config.Options)
        );

        setupLogger();

        jest.spyOn(Setup.prototype, 'run').mockImplementation(passedSetupMock);
    });

    test('Checks that launch for target platform for Android is invoked', async () => {
        setupFlags('android', deviceName, androidDeviceType);

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
        const nextAdbPortMock = jest.fn(() => {
            return Promise.resolve(0);
        });
        const createNewVirtualDeviceMock = jest.fn(() => {
            return Promise.resolve(true);
        });
        jest.spyOn(
            AndroidSDKUtils,
            'findRequiredEmulatorImages'
        ).mockImplementation(findEmulatorImagesMock);
        jest.spyOn(AndroidSDKUtils, 'getNextAndroidAdbPort').mockImplementation(
            nextAdbPortMock
        );
        jest.spyOn(
            AndroidSDKUtils,
            'createNewVirtualDevice'
        ).mockImplementation(createNewVirtualDeviceMock);

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
        setupFlags('iOS', deviceName, iOSDeviceType);

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

        await create.run();
        expect(createNewDeviceMock).toHaveBeenCalledWith(
            deviceName,
            iOSDeviceType,
            iOSSupportedRuntimes[0]
        );
    });

    test('Logger must be initialized and invoked', async () => {
        setupFlags('android', deviceName, androidDeviceType);
        const loggerSpy = jest.spyOn(logger, 'info');
        await create.run();
        expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        expect(Create.description !== null).toBeTruthy();
    });

    function setupFlags(platformFlag: string, name: string, type: string) {
        Object.defineProperty(create, 'flags', {
            get: () => {
                return {
                    devicename: name,
                    devicetype: type,
                    platform: platformFlag
                };
            }
        });
    }

    function setupLogger() {
        Object.defineProperty(create, 'logger', {
            configurable: true,
            enumerable: false,
            get: () => {
                return logger;
            }
        });
    }
});
