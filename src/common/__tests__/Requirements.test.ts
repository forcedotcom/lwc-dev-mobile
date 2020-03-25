import * as reqs from '../Requirements';
import { Logger } from '@salesforce/core';
var logger = new Logger('test');
class TruthyExtension extends reqs.BaseSetup {
    constructor() {
        super(logger);
        super.requirements = [
            {
                title: 'SDK Check',
                checkFunction: this.testFunctionOne,
                fulfilledMessage: 'Android SDK was detected.',
                unfulfilledMessage:
                    'You must install Android SDK add it to the path.'
            },
            {
                title: 'ANDROID_HOME check',
                checkFunction: this.testFunctionTwo,
                fulfilledMessage: 'ANDROID_HOME has been detected.',
                unfulfilledMessage: 'You must setup ANDROID_HOME.'
            }
        ];
    }

    async testFunctionOne(): Promise<string> {
        return new Promise((resolve, reject) => resolve('Done'));
    }

    async testFunctionTwo(): Promise<string> {
        return new Promise((resolve, reject) => resolve('Done'));
    }
}

class FalsyExtension extends reqs.BaseSetup {
    constructor() {
        super(logger);
        super.requirements = [
            {
                title: 'SDK Check',
                checkFunction: this.testFunctionOne,
                fulfilledMessage: 'Android SDK was detected.',
                unfulfilledMessage:
                    'You must install Android SDK add it to the path.'
            },
            {
                title: 'ANDROID_HOME check',
                checkFunction: this.testFunctionTwo,
                fulfilledMessage: 'ANDROID_HOME has been detected.',
                unfulfilledMessage: 'You must setup ANDROID_HOME.'
            },
            {
                title: 'ANDROID_HOME check',
                checkFunction: this.testFunctionThree,
                fulfilledMessage: 'ANDROID_HOME has been detected.',
                unfulfilledMessage: 'You must setup ANDROID_HOME.'
            }
        ];
    }

    async testFunctionOne(): Promise<string> {
        return new Promise((resolve, reject) => resolve('Done'));
    }

    async testFunctionTwo(): Promise<string> {
        return new Promise((resolve, reject) => reject('failed'));
    }

    async testFunctionThree(): Promise<string> {
        return new Promise((resolve, reject) => reject('failed'));
    }
}

describe('Requirements Processing', () => {
    test('Meets all requirements', async () => {
        expect.assertions(1);
        const setupResult = await new TruthyExtension().executeSetup();
        return expect(setupResult.hasMetAllRequirements).toBeTruthy();
    });

    test('Executes all true requirements', async () => {
        expect.assertions(1);
        let extension = new TruthyExtension();
        const setupResult = await extension.executeSetup();
        return expect(
            setupResult.tests.length == extension.requirements.length
        ).toBeTruthy();
    });

    test('Executes all passed and failed requirements', async () => {
        expect.assertions(1);
        const setupResult = await new FalsyExtension().executeSetup();
        return expect(setupResult.hasMetAllRequirements).toBeFalsy();
    });

    test('Executes all passed and failed requirements', async () => {
        expect.assertions(1);
        let extension = new TruthyExtension();
        const setupResult = await extension.executeSetup();
        return expect(
            setupResult.tests.length == extension.requirements.length
        ).toBeTruthy();
    });
});
