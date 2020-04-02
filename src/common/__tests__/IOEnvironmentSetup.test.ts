
import { Logger, Messages } from '@salesforce/core';

let myUnameMock = jest.fn((): Promise<{ stdout: string, stderr: string }> => {
    return new Promise((resolve, reject) => {
        resolve({ stdout: 'Darwin', stderr: 'mockError' });
    });
});

let badBadMock = jest.fn((): Promise<{ stdout: string, stderr: string }> => {
    return new Promise((resolve, reject) => {
        reject(new Error('Bad bad mock!'));
    });
});

let myXcodeSelectMock = jest.fn((): Promise<{ stdout: string, stderr: string }> => {
    return new Promise((resolve, reject) => {
        resolve({ stdout: '/Applications/Xcode.app/Contents/Developer', stderr: 'mockError' });
    });
});

let runtimesMockBlock = jest.fn((): Promise<Array<string>> => {
    return new Promise((resolve, reject) => {
      resolve(['iOS-13-1']);
    });
  });

import { IOSEnvironmentSetup } from '../IOSEnvironmentSetup';
import { XcodeUtils } from '../IOSUtils';

Messages.importMessagesDirectory(__dirname);
let logger = new Logger('test-IOSEnvironmentSetup');

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
        jest.spyOn(IOSEnvironmentSetup, 'executeCommand').mockImplementation(myUnameMock);
        let setup = new IOSEnvironmentSetup(logger);
        await setup.isSupportedEnvironment();
        return expect(myUnameMock).toHaveBeenCalledWith('/usr/bin/uname');
    });

    it('Should throw an error for an unsupported OS environment', async () => {
        jest.spyOn(IOSEnvironmentSetup, 'executeCommand').mockImplementation(badBadMock);
        let setup = new IOSEnvironmentSetup(logger);
        return setup.isSupportedEnvironment().catch(error => {
            expect(error).toBeTruthy();
        })
    });
    it('Checks to see that the logger is set', async () => {
        let logInfo = jest.spyOn(logger, 'info');
        let setup = new IOSEnvironmentSetup(logger);
        await setup.isSupportedEnvironment();
        return expect(logInfo).toHaveBeenCalled();
    });

    it('Should attempt to validate supported Xcode environment', async () => {
        jest.spyOn(IOSEnvironmentSetup, 'executeCommand').mockImplementation(myXcodeSelectMock);
        let setup = new IOSEnvironmentSetup(logger);
        await setup.isXcodeInstalled();
        return expect(myXcodeSelectMock).toHaveBeenCalledWith('/usr/bin/xcode-select -p');
    });

    it('Should throw an error for unsupported Xcode Env', async () => {
        jest.spyOn(IOSEnvironmentSetup, 'executeCommand').mockImplementation(badBadMock);
        let setup = new IOSEnvironmentSetup(logger);
        return setup.isXcodeInstalled().catch(error => {
            expect(error).toBeTruthy();
        })
    });

    it('Should attempt to validate supported Xcode runtime environments', async () => {
        jest.spyOn(XcodeUtils, 'getSimulatorRuntimes').mockImplementation(runtimesMockBlock);
        let setup = new IOSEnvironmentSetup(logger);
        await setup.hasSupportedSimulatorRuntime();
        return expect(runtimesMockBlock).toHaveBeenCalled();
    });
});