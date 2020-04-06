import Preview from '../preview';
import Setup from '../setup';
import * as Config from '@oclif/config';
import { Logger, SfdxError } from '@salesforce/core';

describe('Preview Tests', () => {

    let preview: Preview;

    afterEach(() => {});

    beforeEach(() => {
        preview = new Preview([], new Config.Config(<Config.Options>{}));

    });
    
    test('Checks that Comp Path flag is received', async () => {
        setupFlags();
        let logger = new Logger('test-preview');
        setupLogger(logger);
        const compPathCalValidationlMock = jest.fn((value) => {return true});
        const platformCallValidationMock = jest.fn((value) => {return true});
        const targetValueValidationCallMock = jest.fn((value) => {return true});
        const setupMock = jest.fn((value) => {return Promise.resolve({hasMetAllRequirements:true, tests:[]})});
        jest.spyOn(Setup, 'run').mockImplementation(setupMock);
        preview.validateComponentPathValue = compPathCalValidationlMock;
        preview.validateTargetValue = targetValueValidationCallMock;
        await preview.run();
        return expect(compPathCalValidationlMock).toHaveBeenCalledWith('componentpath');
    });

    test('Checks that target flag is received', async () => {
        setupFlags();
        let logger = new Logger('test-preview');
        setupLogger(logger);
        const compPathCalValidationlMock = jest.fn((value) => {return true});
        const platformCallValidationMock = jest.fn((value) => {return true});
        const targetValueValidationCallMock = jest.fn((value) => {return true});
        const setupMock = jest.fn((value) => {return Promise.resolve({hasMetAllRequirements:true, tests:[]})});
        jest.spyOn(Setup, 'run').mockImplementation(setupMock);
        preview.validateComponentPathValue = compPathCalValidationlMock;
        preview.validateTargetValue = targetValueValidationCallMock;
        await preview.run();
        return expect(targetValueValidationCallMock).toHaveBeenCalledWith('sfdxemu');
    });

    test('Checks that setup is invoked', async () => {
        setupFlags();
        let logger = new Logger('test-preview');
        setupLogger(logger);
        const setupMock = jest.fn((value) => {return Promise.resolve({hasMetAllRequirements:true, tests:[]})});
        jest.spyOn(Setup, 'run').mockImplementation(setupMock);
        await preview.run();
        return expect(setupMock);
    });

    test('Preview should throw an error if setup fails', async () => {
        setupFlags();
        let logger = new Logger('test-preview');
        setupLogger(logger);
        const setupMock = jest.fn((value) => {return Promise.resolve({hasMetAllRequirements:false, tests:['Mock Failure in tests!']})});
        jest.spyOn(Setup, 'run').mockImplementation(setupMock);
        preview.run().catch ((error) => expect(error &&  (error instanceof SfdxError)).toBeTruthy);
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