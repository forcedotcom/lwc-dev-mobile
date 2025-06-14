/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import fs from 'node:fs';
import { Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import {
    AndroidDevice,
    AndroidDeviceManager,
    AndroidEnvironmentRequirements,
    AppleDevice,
    AppleDeviceManager,
    BaseCommand,
    CommandLineUtils,
    CommandRequirements,
    CommonUtils,
    FlagsConfigType,
    IOSEnvironmentRequirements,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'test-ui-mobile-configure');

export class Configure extends BaseCommand {
    public static readonly summary = messages.getMessage('summary');
    public static readonly examples = messages.getMessages('examples');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    public static readonly flags = {
        ...CommandLineUtils.createFlag(FlagsConfigType.JsonFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.LogLevelFlag, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.PlatformFlag, true),
        devicename: Flags.string({
            char: 'd',
            description: messages.getMessage('flags.deviceName.description'),
            required: true,
            validate: (deviceName: string) => deviceName && deviceName.trim().length > 0
        }),
        output: Flags.string({
            description: messages.getMessage('flags.output.description'),
            required: false,
            validate: (output: string) => output && output.trim().length > 0
        }),
        testframework: Flags.string({
            description: messages.getMessage('flags.testFramework.description'),
            required: false,
            validate: (testframework: string) =>
                Configure.supportedTestFrameworks.includes((testframework ?? '').trim().toLowerCase())
        }),
        bundlepath: Flags.string({
            description: messages.getMessage('flags.bundlePath.description'),
            required: false,
            validate: (bundlepath: string) => bundlepath && bundlepath.trim().length > 0
        }),
        appactivity: Flags.string({
            description: messages.getMessage('flags.appActivity.description'),
            required: false,
            validate: (appactivity: string) => appactivity && appactivity.trim().length > 0
        }),
        apppackage: Flags.string({
            description: messages.getMessage('flags.appPackage.description'),
            required: false,
            validate: (apppackage: string) => apppackage && apppackage.trim().length > 0
        }),
        port: Flags.string({
            description: messages.getMessage('flags.port.description'),
            required: false,
            validate: (port: string) => !isNaN(Number((port ?? '').trim()))
        }),
        baseurl: Flags.string({
            description: messages.getMessage('flags.baseUrl.description'),
            required: false,
            validate: (baseurl: string) => {
                const url = (baseurl ?? '').trim().toLowerCase();
                return url.startsWith('http://') || url.startsWith('https://');
            }
        }),
        injectionconfigs: Flags.string({
            description: messages.getMessage('flags.injectionConfigs.description'),
            required: false,
            validate: (injectionconfigs: string) => injectionconfigs && injectionconfigs.trim().length > 0
        })
    };

    public static defaultOutputFile = './wdio.conf.js';
    public static supportedTestFrameworks = ['jasmine', 'mocha', 'cucumber'];
    public static defaultTestRunnerBaseUrl = 'http://localhost';

    protected _commandName = 'force:lightning:lwc:test:ui:mobile:configure';

    private get platform(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.platform as string;
    }
    private get deviceName(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return this.flagValues.devicename as string;
    }
    private get output(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return CommandLineUtils.resolveFlag(this.flagValues.output, Configure.defaultOutputFile).trim();
    }
    private get testFramework(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return CommandLineUtils.resolveFlag(this.flagValues.testframework, Configure.supportedTestFrameworks[0]).trim();
    }
    private get bundlePath(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return CommandLineUtils.resolveFlag(this.flagValues.bundlepath, '').trim();
    }
    private get appActivity(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return CommandLineUtils.resolveFlag(this.flagValues.appactivity, '').trim();
    }
    private get appPackage(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return CommandLineUtils.resolveFlag(this.flagValues.apppackage, '').trim();
    }
    private get port(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return CommandLineUtils.resolveFlag(this.flagValues.port, '').trim();
    }
    private get baseUrl(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return CommandLineUtils.resolveFlag(this.flagValues.baseurl, Configure.defaultTestRunnerBaseUrl).trim();
    }
    private get injectionConfigsPath(): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        return CommandLineUtils.resolveFlag(this.flagValues.injectionconfigs, '').trim();
    }

    public async run(): Promise<void> {
        this.logger.info(`Mobile UI Test Configuration command invoked for ${this.platform}`);

        const isAndroid = CommandLineUtils.platformFlagIsAndroid(this.platform);

        if (!fs.existsSync(this.bundlePath)) {
            this.logger.warn(messages.getMessage('error.notFound.bundle', [this.bundlePath]));
        }

        if (isAndroid && this.appActivity.length === 0) {
            return Promise.reject(this.createError(messages.getMessage('error.invalid.appActivity')));
        } else if (!isAndroid && this.appActivity.length > 0) {
            this.logger.warn(messages.getMessage('appActivityIgnored'));
        }

        if (isAndroid && this.appPackage.length === 0) {
            return Promise.reject(this.createError(messages.getMessage('error.invalid.appPackage')));
        } else if (!isAndroid && this.appActivity.length > 0) {
            this.logger.warn(messages.getMessage('appPackageIgnored'));
        }

        return RequirementProcessor.execute(this.commandRequirements)
            .then(async () => {
                // execute the Test Configuration command
                this.logger.info('Setup requirements met, continuing with Mobile UI Test Configuration command');

                const device = isAndroid
                    ? await new AndroidDeviceManager().getDevice(this.deviceName)
                    : await new AppleDeviceManager().getDevice(this.deviceName);

                if (!device) {
                    return Promise.reject(
                        this.createError(messages.getMessage('error.notFound.device', [this.deviceName]))
                    );
                }

                return this.executeCreateConfigFile(isAndroid, device);
            })
            .then(() => {
                this.logger.info(`Config file created at ${this.output}`);
            })
            .catch((error: Error) => {
                this.logger.warn(`Failed to created config file - ${error.message}`);
                return Promise.reject(error);
            });
    }

    protected populateCommandRequirements(): void {
        const requirements: CommandRequirements = {};

        requirements.setup = CommandLineUtils.platformFlagIsAndroid(this.platform)
            ? new AndroidEnvironmentRequirements(this.logger)
            : new IOSEnvironmentRequirements(this.logger);

        this.commandRequirements = requirements;
    }

    // eslint-disable-next-line class-methods-use-this
    private createError(message: string): SfError {
        return new SfError(message, 'lwc-dev-mobile', Configure.examples);
    }

    // eslint-disable-next-line class-methods-use-this
    private async executeCreateConfigFile(isAndroid: boolean, device: AndroidDevice | AppleDevice): Promise<void> {
        const placeholders = {
            specs: '${specs_placeholder}',
            excludes: '${excludes_placeholder}',
            // eslint-disable-next-line camelcase
            utam_wdio_service: '${utam_wdio_service_placeholder}'
        };

        // eslint-disable-next-line camelcase
        const placeholder_values = new Map<string, string>([
            [`${placeholders.specs}`, '// ToDo: define location for spec files here'],
            [`${placeholders.excludes}`, '// ToDo: define patterns to exclude here'],
            [`${placeholders.utam_wdio_service}`, 'UtamWdioService']
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config: { [k: string]: any } = {
            specs: [`${placeholders.specs}`],
            exclude: [`${placeholders.excludes}`],
            services: [
                [
                    'appium',
                    {
                        command: 'appium',
                        args: {
                            allowInsecure: 'chromedriver_autodownload'
                        }
                    }
                ],
                [
                    `${placeholders.utam_wdio_service}`,
                    {
                        injectionConfigs: [this.injectionConfigsPath]
                    }
                ]
            ],
            capabilities: [
                isAndroid
                    ? {
                          'appium:platformName': 'Android',
                          'appium:automationName': 'UiAutomator2',
                          'appium:app': this.bundlePath,
                          'appium:appActivity': this.appActivity,
                          'appium:appPackage': this.appPackage,
                          'appium:avd': device.name
                      }
                    : {
                          'appium:platformName': 'iOS',
                          'appium:automationName': 'XCUITest',
                          'appium:app': this.bundlePath,
                          'appium:udid': (device as AppleDevice).id
                      }
            ],
            framework: this.testFramework,
            baseUrl: this.baseUrl
        };

        if (this.port.length > 0) {
            config['port'] = this.port;
        }

        if (!this.injectionConfigsPath || this.injectionConfigsPath.length === 0) {
            // remove the empty string that was added to the array
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            config.services[1][1].injectionConfigs = [];
        }

        // Convert to JSON, then "sanitize" and convert from JSON to a valid JS.
        const chromeDriverAutoDownloadComment = '// fetch the appropriate version of chrome driver as needed';
        const regex = /"\$\{\w+\}"/g;
        let configJSON = JSON.stringify(config, undefined, 2).replace(regex, (match) => {
            const key = match.slice(1, -1);
            // eslint-disable-next-line camelcase
            return placeholder_values.get(key) ?? match;
        });
        configJSON = configJSON.replace(
            '"chromedriver_autodownload"',
            `"chromedriver_autodownload" ${chromeDriverAutoDownloadComment}`
        );

        const content =
            'const { UtamWdioService } = require("wdio-utam-service")\n\n' +
            // convert from string to object to pickup the one imported using the require statement
            `exports.config = ${configJSON}`;

        return CommonUtils.createTextFile(this.output, content);
    }
}
