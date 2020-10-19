/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger, LoggerLevel, Messages } from '@salesforce/core';
import chalk from 'chalk';
import cli from 'cli-ux';
import { performance, PerformanceEntry, PerformanceObserver } from 'perf_hooks';
import { CommonUtils } from './CommonUtils';
import { PerformanceMarkers } from './PerformanceMarkers';
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
    duration: number;
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
export function WrappedPromise(
    name: string,
    promise: Promise<any>
): Promise<any> {
    const perfMarker = PerformanceMarkers.getByName(
        PerformanceMarkers.REQUIREMENTS_MARKER_KEY
    )!;

    const start = `${perfMarker.startMarkName}_${name}`;
    const end = `${perfMarker.endMarkName}_${name}`;
    const step = `${perfMarker.name}_${name}`;

    performance.mark(start);

    return promise.then(
        (v) => {
            performance.mark(end);
            performance.measure(step, start, end);
            return { v, status: 'fulfilled', title: name };
        },
        (e) => {
            performance.mark(end);
            performance.measure(step, start, end);
            return { e, status: 'rejected', title: name };
        }
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

    private perfMarker = PerformanceMarkers.getByName(
        PerformanceMarkers.REQUIREMENTS_MARKER_KEY
    )!;

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
            allPromises.push(
                WrappedPromise(requirement.title, requirement.checkFunction())
            )
        );

        let totalDuration: number = 0;
        const perfEntries: PerformanceEntry[] = [];
        const obs = new PerformanceObserver((items, observer) => {
            const entry = items.getEntries()[0];
            perfEntries.push(entry);
            totalDuration += entry.duration / 1000;
        });
        obs.observe({ entryTypes: ['measure'] });

        return Promise.all(allPromises).then((results) => {
            obs.disconnect();

            const testResult: SetupTestResult = {
                hasMetAllRequirements: true,
                tests: []
            };

            results.forEach((result) => {
                const matchingName = `${this.perfMarker.name}_${result.title}`;
                const perfEntry = perfEntries.find(
                    (entry) => entry.name === matchingName
                );
                const stepDuration =
                    ((perfEntry && perfEntry.duration) || 0) / 1000;

                if (result.status === 'fulfilled') {
                    testResult.tests.push({
                        duration: stepDuration,
                        hasPassed: true,
                        message: result.v,
                        testResult: 'Passed'
                    });
                } else if (result.status === 'rejected') {
                    testResult.hasMetAllRequirements = false;
                    testResult.tests.push({
                        duration: stepDuration,
                        hasPassed: false,
                        message: result.e,
                        testResult: 'Failed'
                    });
                }
            });

            const setupMessage = `Setup (${totalDuration.toFixed(3)} sec)`;
            const tree = cli.tree();
            tree.insert(setupMessage);
            const rootNode = tree.nodes[setupMessage];
            testResult.tests.forEach((test) => {
                const message = `${test.testResult} (${test.duration.toFixed(
                    3
                )} sec): ${test.message}`;
                rootNode.insert(
                    `${
                        test.hasPassed
                            ? chalk.bold.green(message)
                            : chalk.bold.red(message)
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
