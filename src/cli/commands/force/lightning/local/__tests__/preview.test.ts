import Preview from '../preview';
import * as Config from '@oclif/config';
import { Logger } from '@salesforce/core';

describe('Preview Tests', () => {

    let preview: Preview;

    afterEach(() => {});

    beforeEach(() => {
        preview = new Preview([], new Config.Config(<Config.Options>{}));

    });
    
    test('Checks that flags are passed correctly', async () => {
        setupFlags();
        let logger = new Logger('test-preview');
        setupLogger(logger);
        const compPathCalValidationlMock = jest.fn((value) => {return true});
        const platformCallValidationMock = jest.fn((value) => {return true});
        const targetValueValidationCallMock = jest.fn((value) => {return true});
        preview.validateComponentPathValue = compPathCalValidationlMock;
        preview.validatePlatformValue = platformCallValidationMock;
        preview.validateTargetValue = targetValueValidationCallMock;
        await preview.run();
        expect(compPathCalValidationlMock).toHaveBeenCalledWith('componentpath');
        expect(platformCallValidationMock).toHaveBeenCalledWith('android');
        return expect(targetValueValidationCallMock).toHaveBeenCalledWith('sfdxemu');
    });

    test('Logger must be initialized and invoked', async () => {
        let logger = new Logger('test-preview');
        setupLogger(logger);
        setupFlags();
        let loggerSpy = jest.spyOn(logger, 'info');
        await preview.run();
        return expect(loggerSpy).toHaveBeenCalled();
    });

    test('Messages folder should be loaded', async () => {
        expect.assertions(1);
        return expect(Preview.description !== null ).toBeTruthy();
    });

    function setupFlags() {
        Object.defineProperty(preview, 'flags', {
            get: () => {
                return {'platform' : 'android', 'target' :'sfdxemu', 'path' : 'componentpath'};
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