import Setup from '../setup';
import * as Config from '@oclif/config';
import { Logger } from '@salesforce/core';

describe('Setup Tests', () => {
    let setup: Setup;

    afterEach(() => {});

    beforeEach(() => {
        setup = new Setup([], new Config.Config(<Config.Options>{}));

    });

    test('Checks that flags are passed correctly', async () => {
        let logger = new Logger('test-setup');
        setupLogger(logger);
        setupFlags();
        const mockCall= jest.fn((value) => {return true});
        setup.validatePlatformValue = mockCall;
        await setup.run();
        return expect(mockCall).toHaveBeenCalledWith('android');
    });

    test('Logger must be initialized and invoked', async () => {
        let logger = new Logger('test');
        setupLogger(logger);
        setupFlags();
        let loggerSpy = jest.spyOn(logger, 'info');
        await setup.run();
        return expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        return expect(Setup.description !== null ).toBeTruthy();
    });

    function setupFlags() {
        Object.defineProperty(setup, 'flags', {
            get: () => {
                return {'platform' : 'android'};
            }
        });
    }

    function setupLogger(logger: Logger) {
        Object.defineProperty(setup, 'logger', {
            get: () => {
                return logger;
            },
            configurable: true,
            enumerable: false
        });
    }
});