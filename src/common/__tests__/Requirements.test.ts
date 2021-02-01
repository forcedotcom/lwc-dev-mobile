/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger } from '@salesforce/core';
import {
    BaseSetup,
    LWCServerPluginInstalledRequirement
} from '../Requirements';

const logger = new Logger('test');

const passedBaseRequirementsMock = jest.fn(() => {
    return Promise.resolve('sfdx server plugin is installed.');
});

const failedBaseRequirementsMock = jest.fn(() => {
    return Promise.reject(new Error('sfdx server plugin is not installed.'));
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

    public async testFunctionOne(): Promise<string> {
        return new Promise((resolve, reject) => resolve('Done.'));
    }

    public async testFunctionTwo(): Promise<string> {
        return new Promise((resolve, reject) => resolve('Done.'));
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
                logger,
                title: 'Checking SDK Tools'
            },
            {
                checkFunction: this.testFunctionFour,
                fulfilledMessage:
                    'Android Platform tools were detected at /usr/bin.',
                logger,
                supplementalMessage: 'Get Android platform tools!',
                title: 'Checking SDK Platform Tools',
                unfulfilledMessage:
                    'Install at least one Android Platform tools package (23 - 30).'
            }
        ];
        super.addRequirements(requirements);
    }

    public async testFunctionOne(): Promise<string> {
        return new Promise((resolve, reject) => resolve('Done.'));
    }

    public async testFunctionTwo(): Promise<string> {
        return new Promise((resolve, reject) => reject('Failed.'));
    }

    public async testFunctionThree(): Promise<undefined> {
        return new Promise((resolve, reject) => reject());
    }

    public async testFunctionFour(): Promise<string> {
        return new Promise((resolve, reject) => reject('Failed.'));
    }
}

describe('Requirements Processing', () => {
    test('Meets all requirements', async () => {
        expect.assertions(1);
        jest.spyOn(
            LWCServerPluginInstalledRequirement.prototype,
            'checkFunction'
        ).mockImplementation(passedBaseRequirementsMock);
        const setupResult = await new TruthyExtension().executeSetup();
        expect(setupResult.hasMetAllRequirements).toBeTruthy();
    });

    test('Executes all true requirements', async () => {
        expect.assertions(1);
        jest.spyOn(
            LWCServerPluginInstalledRequirement.prototype,
            'checkFunction'
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
            LWCServerPluginInstalledRequirement.prototype,
            'checkFunction'
        ).mockImplementation(passedBaseRequirementsMock);
        const setupResult = await new FalsyExtension().executeSetup();
        expect(setupResult.hasMetAllRequirements).toBeFalsy();
    });

    test('Executes all passed and failed base requirements', async () => {
        expect.assertions(1);
        jest.spyOn(
            LWCServerPluginInstalledRequirement.prototype,
            'checkFunction'
        ).mockImplementation(failedBaseRequirementsMock);
        const setupResult = await new TruthyExtension().executeSetup();
        expect(setupResult.hasMetAllRequirements).toBeFalsy();
    });

    test('Executes all passed and failed requirements', async () => {
        expect.assertions(1);
        jest.spyOn(
            LWCServerPluginInstalledRequirement.prototype,
            'checkFunction'
        ).mockImplementation(passedBaseRequirementsMock);
        const extension = new TruthyExtension();
        const setupResult = await extension.executeSetup();
        expect(
            setupResult.tests.length === extension.requirements.length
        ).toBeTruthy();
    });

    test('There is only one test that failed with supplemental message', async () => {
        expect.assertions(2);
        jest.spyOn(
            LWCServerPluginInstalledRequirement.prototype,
            'checkFunction'
        ).mockImplementation(passedBaseRequirementsMock);
        const extension = new FalsyExtension();
        const setupResult = await extension.executeSetup();
        const testsResultWithMessages = setupResult.tests.filter(
            (test) => test.hasPassed === false && test.message.length > 0
        );
        expect(testsResultWithMessages.length).toBe(2);
        expect(
            testsResultWithMessages[1].message ===
                'Failed. Get Android platform tools!'
        ).toBeTruthy();
    });

    test('There is only one test without any message', async () => {
        expect.assertions(2);
        jest.spyOn(
            LWCServerPluginInstalledRequirement.prototype,
            'checkFunction'
        ).mockImplementation(passedBaseRequirementsMock);
        const extension = new FalsyExtension();
        const setupResult = await extension.executeSetup();
        const testsResultWithoutMessages = setupResult.tests.filter(
            (test) => test.message.length === 0
        );
        expect(testsResultWithoutMessages.length).toBe(1);
        expect(testsResultWithoutMessages[0].title).toBe('Checking SDK Tools');
    });
});
