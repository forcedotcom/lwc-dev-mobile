/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger, LoggerLevel, Messages } from '@salesforce/core';
import chalk from 'chalk';
import cli from 'cli-ux';
import { CommonUtils } from './CommonUtils';
export type CheckRequirementsFunc = () => Promise<string>;

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

export interface Requirement {
    title: string;
    checkFunction: CheckRequirementsFunc;
    fulfilledMessage: string;
    unfulfilledMessage: string;
    logger: Logger;
}

export interface SetupTestCase {
    testResult: string;
    message: string;
    hasPassed: boolean;
}

export interface SetupTestResult {
    hasMetAllRequirements: boolean;
    tests: SetupTestCase[];
}

export interface RequirementList {
    requirements: Requirement[];
    executeSetup(): Promise<SetupTestResult>;
}

export interface Launcher {
    launchNativeBrowser(url: string): Promise<void>;
}

// This function wraps existing promises with the intention to allow the collection of promises
// to settle when used in conjunction with Promise.all(). Promise.all() by default executes until the first
// rejection. We are looking for the equivalent of Promise.allSettled() which is scheduled for ES2020.
// Once the functionality is  available  in the near future this function can be removed.
// See https://github.com/tc39/proposal-promise-allSettled

export function WrappedPromise(promise: Promise<any>) {
    return promise.then(
        (v) => ({ v, status: 'fulfilled' }),
        (e) => ({ e, status: 'rejected' })
    );
}

export abstract class BaseSetup implements RequirementList {
    public requirements: Requirement[];
    protected logger: Logger;
    protected setupMessages = Messages.loadMessages(
        '@salesforce/lwc-dev-mobile',
        'setup'
    );
    // NOTE: The following properties are just place holders to help with typescript compile.
    protected title: string = '';
    protected fulfilledMessage: string = '';
    protected unfulfilledMessage: string = '';

    constructor(logger: Logger) {
        const messages = this.setupMessages;
        this.logger = logger;
        this.requirements = [
            {
                checkFunction: this.isLWCServerPluginInstalled,
                fulfilledMessage: `${messages.getMessage(
                    'common:reqs:serverplugin:fulfilledMessage'
                )}`,
                logger,
                title: `${messages.getMessage(
                    'common:reqs:serverplugin:title'
                )}`,
                unfulfilledMessage: `${messages.getMessage(
                    'common:reqs:serverplugin:unfulfilledMessage'
                )}`
            }
        ];
    }
    public async executeSetup(): Promise<SetupTestResult> {
        const allPromises: Array<Promise<any>> = [];
        this.requirements.forEach((requirement) =>
            allPromises.push(WrappedPromise(requirement.checkFunction()))
        );
        const logger = this.logger;
        const reqs = this.requirements;
        return Promise.all(allPromises).then((results) => {
            const testResult: SetupTestResult = {
                hasMetAllRequirements: true,
                tests: []
            };
            let count = 0;
            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    testResult.tests.push({
                        hasPassed: true,
                        message: result.v,
                        testResult: 'Passed'
                    });
                } else if (result.status === 'rejected') {
                    testResult.hasMetAllRequirements = false;
                    testResult.tests.push({
                        hasPassed: false,
                        message: result.e,
                        testResult: 'Failed'
                    });
                }
                count++;
            });

            const tree = cli.tree();
            tree.insert('Setup');
            testResult.tests.forEach((test) => {
                tree.nodes.Setup.insert(
                    `${
                        test.hasPassed
                            ? chalk.bold.green(test.testResult)
                            : chalk.bold.red(test.testResult)
                    }: ${
                        test.hasPassed
                            ? chalk.green(test.message)
                            : chalk.red(test.message)
                    }`
                );
            });
            tree.display();
            return Promise.resolve(testResult);
        });
    }

    public async isLWCServerPluginInstalled(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            CommonUtils.isLwcServerPluginInstalled()
                .then((result) => {
                    resolve(this.fulfilledMessage);
                })
                .catch((error) => {
                    reject(new Error(this.unfulfilledMessage));
                });
        });
    }

    protected addRequirements(reqs: Requirement[]) {
        if (reqs) {
            this.requirements = this.requirements.concat(reqs);
        }
    }
}
