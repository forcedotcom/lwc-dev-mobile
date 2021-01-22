/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger, Messages } from '@salesforce/core';
import { CommonUtils } from '../CommonUtils';

const myUnameMock = jest.fn(
    (): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve, reject) => {
            resolve({ stdout: 'Darwin', stderr: 'mockError' });
        });
    }
);

const badBadMock = jest.fn(
    (): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve, reject) => {
            reject(new Error('Bad bad mock!'));
        });
    }
);

const myXcodeSelectMock = jest.fn(
    (): Promise<{ stdout: string; stderr: string }> => {
        return new Promise((resolve, reject) => {
            resolve({
                stderr: 'mockError',
                stdout: '/Applications/Xcode.app/Contents/Developer'
            });
        });
    }
);

const runtimesMockBlock = jest.fn(
    (): Promise<string[]> => {
        return new Promise((resolve, reject) => {
            resolve(['iOS-13-1']);
        });
    }
);

import {
    IOSEnvironmentSetup,
    SupportedEnvironmentRequirement,
    SupportedSimulatorRuntimeRequirement,
    XcodeInstalledRequirement
} from '../IOSEnvironmentSetup';
import { IOSUtils } from '../IOSUtils';

Messages.importMessagesDirectory(__dirname);
const logger = new Logger('test-IOSEnvironmentSetup');

describe('IOS Environment Setup tests', () => {
    let iosEnvironment: IOSEnvironmentSetup;

    beforeEach(() => {
        iosEnvironment = new IOSEnvironmentSetup(logger);
        myUnameMock.mockClear();
        badBadMock.mockClear();
        myXcodeSelectMock.mockClear();
        runtimesMockBlock.mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('Should attempt to validate supported OS environment', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            myUnameMock
        );
        const requirement = new SupportedEnvironmentRequirement(
            iosEnvironment.setupMessages,
            logger
        );
        await requirement.checkFunction();
        expect(myUnameMock).toHaveBeenCalledWith('/usr/bin/uname');
    });

    it('Should throw an error for an unsupported OS environment', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            badBadMock
        );
        const requirement = new SupportedEnvironmentRequirement(
            iosEnvironment.setupMessages,
            logger
        );
        return requirement.checkFunction().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    it('Checks to see that the logger is set', async () => {
        const logInfo = jest.spyOn(logger, 'info');
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            myUnameMock
        );
        const requirement = new SupportedEnvironmentRequirement(
            iosEnvironment.setupMessages,
            logger
        );
        await requirement.checkFunction();
        expect(logInfo).toHaveBeenCalled();
    });

    it('Should attempt to validate supported Xcode environment', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            myXcodeSelectMock
        );
        const requirement = new XcodeInstalledRequirement(
            iosEnvironment.setupMessages,
            logger
        );
        await requirement.checkFunction();
        expect(myXcodeSelectMock).toHaveBeenCalledWith('xcodebuild -version');
    });

    it('Should throw an error for unsupported Xcode Env', async () => {
        jest.spyOn(CommonUtils, 'executeCommandAsync').mockImplementation(
            badBadMock
        );
        const requirement = new XcodeInstalledRequirement(
            iosEnvironment.setupMessages,
            logger
        );
        return requirement.checkFunction().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    it('Should attempt to validate supported Xcode runtime environments', async () => {
        jest.spyOn(IOSUtils, 'getSimulatorRuntimes').mockImplementation(
            runtimesMockBlock
        );
        const requirement = new SupportedSimulatorRuntimeRequirement(
            iosEnvironment.setupMessages,
            logger
        );
        await requirement.checkFunction();
        expect(runtimesMockBlock).toHaveBeenCalled();
    });

    it('Should throw an error for unsupported Xcode runtime environments', async () => {
        const badMock = jest.fn(
            (): Promise<string[]> => {
                return Promise.reject(new Error('Bad mock!'));
            }
        );
        jest.spyOn(IOSUtils, 'getSimulatorRuntimes').mockImplementation(
            badMock
        );
        const requirement = new SupportedSimulatorRuntimeRequirement(
            iosEnvironment.setupMessages,
            logger
        );
        return requirement.checkFunction().catch((error) => {
            expect(error).toBeTruthy();
        });
    });
});
