/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger, Messages } from '@salesforce/core';

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

import { IOSEnvironmentSetup } from '../IOSEnvironmentSetup';
import { XcodeUtils } from '../IOSUtils';

Messages.importMessagesDirectory(__dirname);
const logger = new Logger('test-IOSEnvironmentSetup');

describe('IOS Environment Setup tests', () => {
    beforeEach(() => {
        myUnameMock.mockClear();
        badBadMock.mockClear();
        myXcodeSelectMock.mockClear();
        runtimesMockBlock.mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('Should attempt to validate supported OS environment', async () => {
        jest.spyOn(IOSEnvironmentSetup, 'executeCommand').mockImplementation(
            myUnameMock
        );
        const setup = new IOSEnvironmentSetup(logger);
        await setup.isSupportedEnvironment();
        expect(myUnameMock).toHaveBeenCalledWith('/usr/bin/uname');
    });

    it('Should throw an error for an unsupported OS environment', async () => {
        jest.spyOn(IOSEnvironmentSetup, 'executeCommand').mockImplementation(
            badBadMock
        );
        const setup = new IOSEnvironmentSetup(logger);
        return setup.isSupportedEnvironment().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    it('Checks to see that the logger is set', async () => {
        const logInfo = jest.spyOn(logger, 'info');
        jest.spyOn(IOSEnvironmentSetup, 'executeCommand').mockImplementation(
            myUnameMock
        );
        const setup = new IOSEnvironmentSetup(logger);
        await setup.isSupportedEnvironment();
        expect(logInfo).toHaveBeenCalled();
    });

    it('Should attempt to validate supported Xcode environment', async () => {
        jest.spyOn(IOSEnvironmentSetup, 'executeCommand').mockImplementation(
            myXcodeSelectMock
        );
        const setup = new IOSEnvironmentSetup(logger);
        await setup.isXcodeInstalled();
        expect(myXcodeSelectMock).toHaveBeenCalledWith(
            '/usr/bin/xcode-select -p'
        );
    });

    it('Should throw an error for unsupported Xcode Env', async () => {
        jest.spyOn(IOSEnvironmentSetup, 'executeCommand').mockImplementation(
            badBadMock
        );
        const setup = new IOSEnvironmentSetup(logger);
        return setup.isXcodeInstalled().catch((error) => {
            expect(error).toBeTruthy();
        });
    });

    it('Should attempt to validate supported Xcode runtime environments', async () => {
        jest.spyOn(XcodeUtils, 'getSimulatorRuntimes').mockImplementation(
            runtimesMockBlock
        );
        const setup = new IOSEnvironmentSetup(logger);
        await setup.hasSupportedSimulatorRuntime();
        expect(runtimesMockBlock).toHaveBeenCalled();
    });
});
