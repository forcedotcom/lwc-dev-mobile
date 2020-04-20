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
        setupFlags();
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
        preview.validateTargetValue = targetValueValidationCallMock;
        await preview.run();
        return expect(compPathCalValidationlMock).toHaveBeenCalledWith(
            'componentpath'
        );
    });

    test('Checks that target flag is received', async () => {
        setupFlags();
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
        preview.validateTargetValue = targetValueValidationCallMock;
        await preview.run();

        return expect(targetValueValidationCallMock).toHaveBeenCalledWith(
            'sfdxemu'
        );
    });

    test('Checks that setup is invoked', async () => {
        setupFlags();
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
        setupFlags();
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
        setupFlags();
        const loggerSpy = jest.spyOn(logger, 'info');
        await preview.run();
        return expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        return expect(Preview.description !== null).toBeTruthy();
    });

    function setupFlags() {
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
