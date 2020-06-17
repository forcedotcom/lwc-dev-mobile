/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as Config from '@oclif/config';
import { Logger, SfdxError } from '@salesforce/core';
import Setup from '../../local/setup';
import Preview from '../preview';

const myPreviewAndroidCommandBlockMock = jest.fn(
    (): Promise<boolean> => {
        return Promise.resolve(true);
    }
);

const myPreviewiOSCommandBlockMock = jest.fn(
    (): Promise<boolean> => {
        return Promise.resolve(true);
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

describe('Preview Tests', () => {
    let preview: Preview;

    beforeEach(() => {
        preview = new Preview(
            [],
            new Config.Config(({} as any) as Config.Options)
        );
        preview.launchIOS = myPreviewiOSCommandBlockMock;
        preview.launchAndroid = myPreviewiOSCommandBlockMock;
        jest.spyOn(Setup.prototype, 'run').mockImplementation(passedSetupMock);
    });

    test('Checks that Comp Name flag is received', async () => {
        setupAndroidFlags();
        const logger = new Logger('test-preview');
        setupLogger(logger);
        const compPathCalValidationlMock = jest.fn(() => {
            return true;
        });
        preview.validateComponentNameValue = compPathCalValidationlMock;
        await preview.run();
        expect(compPathCalValidationlMock).toHaveBeenCalledWith(
            'mockcomponentname'
        );
    });

    test('Checks that launch for target platform  for Android is invoked', async () => {
        setupAndroidFlags();
        const logger = new Logger('test-preview');
        setupLogger(logger);
        const targetAndroidCallMock = jest.fn(() => {
            return Promise.resolve(true);
        });
        preview.launchAndroid = targetAndroidCallMock;
        await preview.run();
        expect(targetAndroidCallMock).toHaveBeenCalled();
    });

    test('Checks that launch for target platform  for iOS is invoked', async () => {
        setupIOSFlags();
        const logger = new Logger('test-preview');
        setupLogger(logger);
        const targetIOSCallMock = jest.fn(() => {
            return Promise.resolve(true);
        });
        preview.launchIOS = targetIOSCallMock;
        await preview.run();
        expect(targetIOSCallMock).toHaveBeenCalled();
    });

    test('Checks that setup is invoked', async () => {
        setupAndroidFlags();
        const logger = new Logger('test-preview');
        setupLogger(logger);
        await preview.run();
        expect(passedSetupMock);
    });

    test('Preview should throw an error if setup fails', async () => {
        setupAndroidFlags();
        const logger = new Logger('test-preview');
        setupLogger(logger);
        jest.spyOn(Setup.prototype, 'run').mockImplementation(failedSetupMock);
        preview.run().catch((error) => {
            expect(error && error instanceof SfdxError).toBeTruthy();
        });
        expect(failedSetupMock).toHaveBeenCalled();
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-preview');
        setupLogger(logger);
        setupAndroidFlags();
        const loggerSpy = jest.spyOn(logger, 'info');
        await preview.run();
        expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        expect(Preview.description !== null).toBeTruthy();
    });

    function setupAndroidFlags() {
        Object.defineProperty(preview, 'flags', {
            get: () => {
                return {
                    componentname: 'mockcomponentname',
                    platform: 'android',
                    target: 'sfdxemu'
                };
            }
        });
    }

    function setupIOSFlags() {
        Object.defineProperty(preview, 'flags', {
            get: () => {
                return {
                    componentname: 'mockcomponentname',
                    platform: 'iOS',
                    target: 'sfdxsimulator'
                };
            }
        });
    }

    function setupLogger(logger: Logger) {
        Object.defineProperty(preview, 'logger', {
            configurable: true,
            enumerable: false,
            get: () => {
                return logger;
            }
        });
    }
});
