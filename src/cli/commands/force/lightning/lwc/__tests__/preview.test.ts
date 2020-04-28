import * as Config from '@oclif/config';
import { Logger, SfdxError } from '@salesforce/core';
import Preview from '../preview';
import Setup from '../../local/setup';

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

describe('Preview Tests', () => {
    let preview: Preview;

    beforeEach(() => {
        preview = new Preview([], new Config.Config({} as Config.Options));
        preview.launchIOS = myPreviewiOSCommandBlockMock;
        preview.launchAndroid = myPreviewiOSCommandBlockMock;
    });

    test('Checks that Comp Path flag is received', async () => {
        setupAndroidFlags();
        const logger = new Logger('test-preview');
        setupLogger(logger);
        const compPathCalValidationlMock = jest.fn(() => {
            return true;
        });
        const targetValueValidationCallMock = jest.fn(() => {
            return true;
        });
        const setupMock = jest.fn(() => {
            return Promise.resolve({ hasMetAllRequirements: true, tests: [] });
        });
        jest.spyOn(Setup, 'run').mockImplementation(setupMock);
        preview.validateComponentPathValue = compPathCalValidationlMock;
        await preview.run();
        return expect(compPathCalValidationlMock).toHaveBeenCalledWith(
            'componentpath'
        );
    });

    test('Checks that launch for target platform  for Android is invoked', async () => {
        setupAndroidFlags();
        const logger = new Logger('test-preview');
        setupLogger(logger);
        const targetAndroidCallMock = jest.fn(() => {
            return Promise.resolve(true);
        });
        const setupMock = jest.fn(() => {
            return Promise.resolve({ hasMetAllRequirements: true, tests: [] });
        });
        jest.spyOn(Setup, 'run').mockImplementation(setupMock);
        preview.launchAndroid = targetAndroidCallMock;
        await preview.run();
        return expect(targetAndroidCallMock).toHaveBeenCalled();
    });

    test('Checks that launch for target platform  for iOS is invoked', async () => {
        setupIOSFlags();
        const logger = new Logger('test-preview');
        setupLogger(logger);
        const targetAndroidCallMock = jest.fn(() => {
            return Promise.resolve(true);
        });
        const setupMock = jest.fn(() => {
            return Promise.resolve({ hasMetAllRequirements: true, tests: [] });
        });
        jest.spyOn(Setup, 'run').mockImplementation(setupMock);
        preview.launchIOS = targetAndroidCallMock;
        await preview.run();
        return expect(targetAndroidCallMock).toHaveBeenCalled();
    });

    test('Checks that setup is invoked', async () => {
        setupAndroidFlags();
        const logger = new Logger('test-preview');
        setupLogger(logger);
        const setupMock = jest.fn(() => {
            return Promise.resolve({ hasMetAllRequirements: true, tests: [] });
        });
        jest.spyOn(Setup, 'run').mockImplementation(setupMock);
        await preview.run();
        return expect(setupMock);
    });

    test('Preview should throw an error if setup fails', async () => {
        setupAndroidFlags();
        const logger = new Logger('test-preview');
        setupLogger(logger);
        const setupMock = jest.fn(() => {
            return Promise.resolve({
                hasMetAllRequirements: false,
                tests: ['Mock Failure in tests!']
            });
        });
        jest.spyOn(Setup, 'run').mockImplementation(setupMock);
        preview.run().catch((error) => {
            expect(error && error instanceof SfdxError).toBeTruthy();
        });
    });

    test('Logger must be initialized and invoked', async () => {
        const logger = new Logger('test-preview');
        setupLogger(logger);
        setupAndroidFlags();
        const loggerSpy = jest.spyOn(logger, 'info');
        await preview.run();
        return expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        return expect(Preview.description !== null).toBeTruthy();
    });

    function setupAndroidFlags() {
        Object.defineProperty(preview, 'flags', {
            get: () => {
                return {
                    platform: 'android',
                    target: 'sfdxemu',
                    path: 'componentpath'
                };
            }
        });
    }

    function setupIOSFlags() {
        Object.defineProperty(preview, 'flags', {
            get: () => {
                return {
                    platform: 'iOS',
                    target: 'sfdxsimulator',
                    path: 'componentpath'
                };
            }
        });
    }

    function setupLogger(logger: Logger) {
        Object.defineProperty(preview, 'logger', {
            get: () => {
                return logger;
            },
            configurable: true,
            enumerable: false
        });
    }
});
