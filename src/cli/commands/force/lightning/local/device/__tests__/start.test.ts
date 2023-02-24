/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Config } from '@oclif/core/lib/config';
import { Options } from '@oclif/core/lib/interfaces';
import { Logger } from '@salesforce/core';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSSimulatorDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSTypes';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import { RequirementProcessor } from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import { Start } from '../start';

describe('Start Tests', () => {
    const targetName = 'MyDevice';
    const targetUDID = 'myUDID';
    const emulatorPort = 5572;

    let hasEmulatorMock: jest.Mock<any, [], any>;
    let getSimulatorMock: jest.Mock<any, [], any>;
    let passedSetupMock: jest.Mock<any, [], any>;

    beforeEach(() => {
        hasEmulatorMock = jest.fn(() => Promise.resolve(true));

        getSimulatorMock = jest.fn(() =>
            Promise.resolve(
                new IOSSimulatorDevice(
                    targetName,
                    targetUDID,
                    'active',
                    'runtimeID',
                    true
                )
            )
        );

        passedSetupMock = jest.fn(() => {
            return Promise.resolve();
        });

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        jest.spyOn(CommonUtils, 'startCliAction').mockImplementation(() => {});
        jest.spyOn(RequirementProcessor, 'execute').mockImplementation(
            passedSetupMock
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('Checks that launch for target platform for Android is invoked', async () => {
        const startEmulatorMock = jest.fn(() => {
            return Promise.resolve(emulatorPort);
        });

        jest.spyOn(AndroidUtils, 'hasEmulator').mockImplementation(
            hasEmulatorMock
        );

        jest.spyOn(AndroidUtils, 'startEmulator').mockImplementation(
            startEmulatorMock
        );

        const start = makeStart('android', targetName, true);
        await start.init();
        await start.run();
        expect(startEmulatorMock).toHaveBeenCalledWith(targetName, true, false);
    });

    test('Checks that launch for target platform for iOS with name is invoked', async () => {
        const bootDeviceMock = jest.fn(() => Promise.resolve());
        const launchSimulatorAppMock = jest.fn(() => Promise.resolve());

        jest.spyOn(IOSUtils, 'getSimulator').mockImplementation(
            getSimulatorMock
        );

        jest.spyOn(IOSUtils, 'bootDevice').mockImplementation(bootDeviceMock);

        jest.spyOn(IOSUtils, 'launchSimulatorApp').mockImplementation(
            launchSimulatorAppMock
        );

        const start = makeStart('iOS', targetName);
        await start.init();
        await start.run();
        expect(bootDeviceMock).toHaveBeenCalledWith(targetUDID, false);
    });

    test('Checks that launch for target platform for iOS with udid is invoked', async () => {
        const bootDeviceMock = jest.fn(() => Promise.resolve());
        const launchSimulatorAppMock = jest.fn(() => Promise.resolve());

        jest.spyOn(IOSUtils, 'getSimulator').mockImplementation(
            getSimulatorMock
        );

        jest.spyOn(IOSUtils, 'bootDevice').mockImplementation(bootDeviceMock);

        jest.spyOn(IOSUtils, 'launchSimulatorApp').mockImplementation(
            launchSimulatorAppMock
        );

        const start = makeStart('iOS', targetUDID);
        await start.init();
        await start.run();
        expect(bootDeviceMock).toHaveBeenCalledWith(targetUDID, false);
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-logger');
        const loggerSpy = jest.spyOn(logger, 'info');
        jest.spyOn(Logger, 'child').mockReturnValue(Promise.resolve(logger));

        const bootDeviceMock = jest.fn(() => Promise.resolve());
        const launchSimulatorAppMock = jest.fn(() => Promise.resolve());

        jest.spyOn(IOSUtils, 'getSimulator').mockImplementation(
            getSimulatorMock
        );

        jest.spyOn(IOSUtils, 'bootDevice').mockImplementation(bootDeviceMock);

        jest.spyOn(IOSUtils, 'launchSimulatorApp').mockImplementation(
            launchSimulatorAppMock
        );

        const start = makeStart('iOS', targetName);
        await start.init();
        await start.run();
        expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        expect(Start.description !== null).toBeTruthy();
    });

    function makeStart(
        platform: string,
        target: string,
        writable = false
    ): Start {
        const args = ['-p', platform, '-t', target];
        if (writable) {
            args.push('-w');
        }
        const start = new Start(args, new Config({} as Options));
        return start;
    }
});
