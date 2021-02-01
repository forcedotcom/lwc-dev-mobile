/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Logger, Messages } from '@salesforce/core';
import chalk from 'chalk';
import { Listr } from 'listr2';
import { performance, PerformanceObserver } from 'perf_hooks';
import { CommonUtils } from './CommonUtils';
import { PerformanceMarkers } from './PerformanceMarkers';
export type CheckRequirementsFunc = () => Promise<string | undefined>;
// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

export interface Requirement {
    title: string;
    checkFunction: CheckRequirementsFunc;
    fulfilledMessage?: string;
    unfulfilledMessage?: string;
    supplementalMessage?: string;
    logger: Logger;
}

export interface RequirementResult {
    duration: number;
    hasPassed: boolean;
    message: string;
    title: string;
}

export interface SetupTestResult {
    hasMetAllRequirements: boolean;
    tests: RequirementResult[];
}

export interface RequirementList {
    requirements: Requirement[];
    executeSetup(): Promise<SetupTestResult>;
}

// This function wraps existing promises with the intention to allow the collection of promises
// to settle when used in conjunction with Promise.all(). Promise.all() by default executes until the first
// rejection. We are looking for the equivalent of Promise.allSettled() which is scheduled for ES2020.
// Once the functionality is  available  in the near future this function can be removed.
// See https://github.com/tc39/proposal-promise-allSettled
export function WrappedPromise(
    requirement: Requirement
): Promise<RequirementResult> {
    const promise = requirement.checkFunction();
    const perfMarker = PerformanceMarkers.getByName(
        PerformanceMarkers.REQUIREMENTS_MARKER_KEY
    )!;

    let stepDuration: number = 0;
    const obs = new PerformanceObserver((items) => {
        stepDuration = items.getEntries()[0].duration / 1000;
    });
    obs.observe({ entryTypes: ['measure'] });

    const start = `${perfMarker.startMarkName}_${requirement.title}`;
    const end = `${perfMarker.endMarkName}_${requirement.title}`;
    const step = `${perfMarker.name}_${requirement.title}`;

    performance.mark(start);
    return promise
        .then((fulfilledMessage) => {
            performance.mark(end);
            performance.measure(step, start, end);
            const msg = `${fulfilledMessage ? fulfilledMessage : ''} ${
                requirement.supplementalMessage
                    ? requirement.supplementalMessage
                    : ''
            }`;
            return {
                duration: stepDuration,
                hasPassed: true,
                message: msg.trim(),
                title: requirement.title
            };
        })
        .catch((unfulfilledMessage) => {
            performance.mark(end);
            performance.measure(step, start, end);
            const msg = `${unfulfilledMessage ? unfulfilledMessage : ''} ${
                requirement.supplementalMessage
                    ? requirement.supplementalMessage
                    : ''
            }`;
            return {
                duration: stepDuration,
                hasPassed: false,
                message: msg.trim(),
                title: requirement.title
            };
        })
        .finally(() => {
            obs.disconnect();
        });
}

export abstract class BaseSetup implements RequirementList {
    public requirements: Requirement[];
    public logger: Logger;
    public setupMessages = Messages.loadMessages(
        '@salesforce/lwc-dev-mobile',
        'setup'
    );

    constructor(logger: Logger) {
        this.logger = logger;
        this.requirements = [
            new LWCServerPluginInstalledRequirement(
                this.setupMessages,
                this.logger
            )
        ];
    }

    public async executeSetup(): Promise<SetupTestResult> {
        const testResult: SetupTestResult = {
            hasMetAllRequirements: true,
            tests: []
        };

        let totalDuration = 0;
        const setupTasks = new Listr(
            [
                {
                    task: (rootCtx, rootTask): Listr => {
                        const subTasks = new Listr([], {
                            concurrent: true,
                            rendererOptions: { collapse: false }
                        });
                        for (const requirement of this.requirements) {
                            subTasks.add({
                                options: { persistentOutput: true },
                                task: (subCtx, subTask): Promise<void> =>
                                    WrappedPromise(requirement).then(
                                        (result) => {
                                            testResult.tests.push(result);
                                            if (!result.hasPassed) {
                                                testResult.hasMetAllRequirements = false;
                                            }

                                            subTask.title = this.getFormattedTitle(
                                                result
                                            );
                                            subTask.output = result.message;

                                            totalDuration += result.duration;
                                            rootTask.title = `Setup (${this.formatDurationAsSeconds(
                                                totalDuration
                                            )})`;
                                        }
                                    ),
                                title: requirement.title
                            });
                        }

                        return subTasks;
                    },
                    title: 'Setup'
                }
            ],
            { concurrent: true, rendererOptions: { collapse: false } }
        );

        try {
            await setupTasks.run();
        } catch (error) {
            this.logger.error(error);
            testResult.hasMetAllRequirements = false;
        }

        return Promise.resolve(testResult);
    }

    public addRequirements(reqs: Requirement[]) {
        if (reqs) {
            this.requirements = this.requirements.concat(reqs);
        }
    }

    private getFormattedTitle(testCaseResult: RequirementResult): string {
        const statusMsg = testCaseResult.hasPassed
            ? this.setupMessages.getMessage('passed')
            : this.setupMessages.getMessage('failed');

        const title = `${statusMsg}: ${
            testCaseResult.title
        } (${this.formatDurationAsSeconds(testCaseResult.duration)})`;

        return testCaseResult.hasPassed
            ? chalk.bold.green(title)
            : chalk.bold.red(title);
    }

    private formatDurationAsSeconds(duration: number): string {
        return `${duration.toFixed(3)} sec`;
    }
}

// tslint:disable-next-line: max-classes-per-file
export class LWCServerPluginInstalledRequirement implements Requirement {
    public title: string;
    public fulfilledMessage: string;
    public unfulfilledMessage: string;
    public logger: Logger;

    constructor(messages: Messages, logger: Logger) {
        this.title = messages.getMessage('common:reqs:serverplugin:title');
        this.fulfilledMessage = messages.getMessage(
            'common:reqs:serverplugin:fulfilledMessage'
        );
        this.unfulfilledMessage = messages.getMessage(
            'common:reqs:serverplugin:unfulfilledMessage'
        );
        this.logger = logger;
    }

    public async checkFunction(): Promise<string> {
        return CommonUtils.isLwcServerPluginInstalled()
            .then(() => {
                this.logger.info('sfdx server plugin detected.');
                return Promise.resolve(this.fulfilledMessage);
            })
            .catch((error) => {
                this.logger.info('sfdx server plugin was not detected.');

                try {
                    const command =
                        'sfdx plugins:install @salesforce/lwc-dev-server';
                    this.logger.info(
                        `Installing sfdx server plugin.... ${command}`
                    );
                    CommonUtils.executeCommandSync(command, [
                        'inherit',
                        'pipe',
                        'inherit'
                    ]);
                    this.logger.info('sfdx server plugin installed.');
                    return Promise.resolve(this.fulfilledMessage);
                } catch (error) {
                    this.logger.error(
                        `sfdx server plugin installion failed. ${error}`
                    );
                    return Promise.reject(new Error(this.unfulfilledMessage));
                }
            });
    }
}
