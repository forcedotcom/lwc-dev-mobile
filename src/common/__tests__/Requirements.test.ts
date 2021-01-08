/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger } from '@salesforce/core';
import { BaseSetup, TestResultMessage } from '../Requirements';

const logger = new Logger('test');

const passedBaseRequirementsMock = jest.fn(() => {
    return Promise.resolve({ main: 'sfdx server plugin is installed' });
});

const failedBaseRequirementsMock = jest.fn(() => {
    return Promise.reject({
        main: new Error('sfdx server plugin is not installed')
    });
});

class TruthyExtension extends BaseSetup {
    constructor() {
        super(logger);
        const requirements = [
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
        super.addRequirements(requirements);
    }

    public async testFunctionOne(): Promise<TestResultMessage> {
        return new Promise((resolve, reject) => resolve({ main: 'Done' }));
    }

    public async testFunctionTwo(): Promise<TestResultMessage> {
        return new Promise((resolve, reject) => resolve({ main: 'Done' }));
    }
}

// tslint:disable-next-line: max-classes-per-file
class FalsyExtension extends BaseSetup {
    constructor() {
        super(logger);
        const requirements = [
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
            },
            {
                checkFunction: this.testFunctionFour,
                fulfilledMessage: 'ANDROID_HOME has been detected.',
                logger,
                remediationMessage: 'Setup Android environment.',
                title: 'ANDROID_HOME check',
                unfulfilledMessage: 'You must setup ANDROID_HOME.'
            }
        ];
        super.addRequirements(requirements);
    }

    public async testFunctionOne(): Promise<TestResultMessage> {
        return new Promise((resolve, reject) => resolve({ main: 'Done' }));
    }

    public async testFunctionTwo(): Promise<TestResultMessage> {
        return new Promise((resolve, reject) => reject({ main: 'failed' }));
    }

    public async testFunctionThree(): Promise<TestResultMessage> {
        return new Promise((resolve, reject) => reject({ main: 'failed' }));
    }

    public async testFunctionFour(): Promise<TestResultMessage> {
        return new Promise((resolve, reject) =>
            reject({ main: 'failed', supplemental: 'fix it' })
        );
    }
}

describe('Requirements Processing', () => {
    test('Meets all requirements', async () => {
        expect.assertions(1);
        jest.spyOn(
            BaseSetup.prototype,
            'ensureLWCServerPluginInstalled'
        ).mockImplementation(passedBaseRequirementsMock);
        const setupResult = await new TruthyExtension().executeSetup();
        expect(setupResult.hasMetAllRequirements).toBeTruthy();
    });

    test('Executes all true requirements', async () => {
        expect.assertions(1);
        jest.spyOn(
            BaseSetup.prototype,
            'ensureLWCServerPluginInstalled'
        ).mockImplementation(passedBaseRequirementsMock);
        const extension = new TruthyExtension();
        const setupResult = await extension.executeSetup();
        expect(
            setupResult.tests.length === extension.requirements.length
        ).toBeTruthy();
    });

    test('Executes all passed and failed requirements', async () => {
        expect.assertions(1);
        jest.spyOn(
            BaseSetup.prototype,
            'ensureLWCServerPluginInstalled'
        ).mockImplementation(passedBaseRequirementsMock);
        const setupResult = await new FalsyExtension().executeSetup();
        expect(setupResult.hasMetAllRequirements).toBeFalsy();
    });

    test('Executes all passed and failed base requirements', async () => {
        expect.assertions(1);
        jest.spyOn(
            BaseSetup.prototype,
            'ensureLWCServerPluginInstalled'
        ).mockImplementation(failedBaseRequirementsMock);
        const setupResult = await new TruthyExtension().executeSetup();
        expect(setupResult.hasMetAllRequirements).toBeFalsy();
    });

    test('Executes all passed and failed requirements', async () => {
        expect.assertions(1);
        jest.spyOn(
            BaseSetup.prototype,
            'ensureLWCServerPluginInstalled'
        ).mockImplementation(passedBaseRequirementsMock);
        const extension = new TruthyExtension();
        const setupResult = await extension.executeSetup();
        expect(
            setupResult.tests.length === extension.requirements.length
        ).toBeTruthy();
    });

    test('There is only one test that failed with remediation message', async () => {
        expect.assertions(2);
        jest.spyOn(
            BaseSetup.prototype,
            'ensureLWCServerPluginInstalled'
        ).mockImplementation(passedBaseRequirementsMock);
        const extension = new FalsyExtension();
        const setupResult = await extension.executeSetup();
        const testsResultWithRemediationMessage = setupResult.tests.filter(
            (test) => {
                return (
                    test.remediationMessage !== undefined &&
                    test.remediationMessage.length > 0
                );
            }
        );
        expect(testsResultWithRemediationMessage.length).toBe(1);
        expect(
            testsResultWithRemediationMessage[0].remediationMessage === 'fix it'
        ).toBeTruthy();
    });
});
