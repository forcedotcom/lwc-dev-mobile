import { Logger } from '@salesforce/core';
import { BaseSetup } from '../Requirements';

const logger = new Logger('test');

class TruthyExtension extends BaseSetup {
    constructor() {
        super(logger);
        super.requirements = [
            {
                checkFunction: this.testFunctionOne,
                fulfilledMessage: 'Android SDK was detected.',
                logger,
                title: 'SDK Check',
                unfulfilledMessage:
                    'You must install Android SDK add it to the path.'
            },
            {
                checkFunction: this.testFunctionTwo,
                fulfilledMessage: 'ANDROID_HOME has been detected.',
                logger,
                title: 'ANDROID_HOME check',
                unfulfilledMessage: 'You must setup ANDROID_HOME.'
            }
        ];
    }

    public async testFunctionOne(): Promise<string> {
        return new Promise((resolve, reject) => resolve('Done'));
    }

    public async testFunctionTwo(): Promise<string> {
        return new Promise((resolve, reject) => resolve('Done'));
    }
}

// tslint:disable-next-line: max-classes-per-file
class FalsyExtension extends BaseSetup {
    constructor() {
        super(logger);
        super.requirements = [
            {
                checkFunction: this.testFunctionOne,
                fulfilledMessage: 'Android SDK was detected.',
                logger,
                title: 'SDK Check',
                unfulfilledMessage:
                    'You must install Android SDK add it to the path.'
            },
            {
                checkFunction: this.testFunctionTwo,
                fulfilledMessage: 'ANDROID_HOME has been detected.',
                logger,
                title: 'ANDROID_HOME check',
                unfulfilledMessage: 'You must setup ANDROID_HOME.'
            },
            {
                checkFunction: this.testFunctionThree,
                fulfilledMessage: 'ANDROID_HOME has been detected.',
                logger,
                title: 'ANDROID_HOME check',
                unfulfilledMessage: 'You must setup ANDROID_HOME.'
            }
        ];
    }

    public async testFunctionOne(): Promise<string> {
        return new Promise((resolve, reject) => resolve('Done'));
    }

    public async testFunctionTwo(): Promise<string> {
        return new Promise((resolve, reject) => reject('failed'));
    }

    public async testFunctionThree(): Promise<string> {
        return new Promise((resolve, reject) => reject('failed'));
    }
}

describe('Requirements Processing', () => {
    test('Meets all requirements', async () => {
        expect.assertions(1);
        const setupResult = await new TruthyExtension().executeSetup();
        expect(setupResult.hasMetAllRequirements).toBeTruthy();
    });

    test('Executes all true requirements', async () => {
        expect.assertions(1);
        const extension = new TruthyExtension();
        const setupResult = await extension.executeSetup();
        expect(
            setupResult.tests.length === extension.requirements.length
        ).toBeTruthy();
    });

    test('Executes all passed and failed requirements', async () => {
        expect.assertions(1);
        const setupResult = await new FalsyExtension().executeSetup();
        expect(setupResult.hasMetAllRequirements).toBeFalsy();
    });

    test('Executes all passed and failed requirements', async () => {
        expect.assertions(1);
        const extension = new TruthyExtension();
        const setupResult = await extension.executeSetup();
        expect(
            setupResult.tests.length === extension.requirements.length
        ).toBeTruthy();
    });
});
