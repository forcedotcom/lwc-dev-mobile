/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { AndroidEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidEnvironmentRequirements';
import { AndroidVirtualDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidTypes';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import { BaseCommand } from '@salesforce/lwc-dev-mobile-core/lib/common/BaseCommand';
import {
    CommandLineUtils,
    FlagsConfigType
} from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSEnvironmentRequirements';
import { IOSSimulatorDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSTypes';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import {
    RequirementProcessor,
    CommandRequirements
} from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import fs from 'fs';
import util from 'util';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'test-ui-mobile-configure'
);

export class Configure extends BaseCommand {
    protected _commandName = 'force:lightning:lwc:test:ui:mobile:configure';

    public static readonly description =
        messages.getMessage('commandDescription');

    public static readonly examples = [
        `sfdx force:lightning:lwc:test:ui:mobile:configure -p iOS -d 'iPhone 12' --output './wdio.conf.js' --testframework jasmine --port 4723 --baseurl 'http://localhost' --injectionconfigs '/path/to/myPageObjects.config.json' --bundlepath '/path/to/my.app'`,
        `sfdx force:lightning:lwc:test:ui:mobile:configure -p Android -d Pixel_5_API_33 --output './wdio.conf.js' --testframework jasmine --port 4723 --baseurl 'http://localhost' --injectionconfigs '/path/to/myPageObjects.config.json' --bundlepath '/path/to/my.apk' --appactivity .MainActivity --apppackage com.example.android.myApp`
    ];

    public static defaultOutputFile = './wdio.conf.js';
    public static supportedTestFrameworks = ['jasmine', 'mocha', 'cucumber'];
    public static defaultTestRunnerBaseUrl = 'http://localhost';

    private static createError(stringId: string, ...param: any[]): SfError {
        let msg = messages.getMessage(stringId);
        if (param.length > 0) {
            msg = util.format(msg, param);
        }
        return new SfError(msg, 'lwc-dev-mobile', Configure.examples);
    }

    public static readonly flags = {
        ...CommandLineUtils.createFlag(FlagsConfigType.Json, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.LogLevel, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.Platform, true),
        devicename: Flags.string({
            char: 'd',
            description: messages.getMessage('deviceNameFlagDescription'),
            required: true
        }),
        output: Flags.string({
            description: messages.getMessage('outputFlagDescription'),
            required: false
        }),
        testframework: Flags.string({
            description: messages.getMessage('testFrameworkFlagDescription'),
            required: false,
            validate: (testFramework: string) => {
                const framework = (testFramework ?? '').trim().toLowerCase();
                return Configure.supportedTestFrameworks.includes(framework);
            }
        }),
        bundlepath: Flags.string({
            description: messages.getMessage('bundlePathFlagDescription'),
            required: false
        }),
        appactivity: Flags.string({
            description: messages.getMessage('appActivityFlagDescription'),
            required: false
        }),
        apppackage: Flags.string({
            description: messages.getMessage('appPackageFlagDescription'),
            required: false
        }),
        port: Flags.string({
            description: messages.getMessage('portFlagDescription'),
            required: false,
            validate: (runnerPort: string) => {
                const prt = (runnerPort ?? '').trim();
                return prt.length > 0 && !isNaN(Number(prt));
            }
        }),
        baseurl: Flags.string({
            description: messages.getMessage('baseUrlFlagDescription'),
            required: false,
            validate: (baseUrl: string) => {
                const url = (baseUrl ?? '').trim().toLowerCase();
                return url.startsWith('http://') || url.startsWith('https://');
            }
        }),
        injectionconfigs: Flags.string({
            description: messages.getMessage('injectionConfigsFlagDescription'),
            required: false
        })
    };

    public async run(): Promise<void> {
        this.logger.info(
            `Mobile UI Test Configuration command invoked for ${this.flagValues.platform}`
        );

        const isAndroid = CommandLineUtils.platformFlagIsAndroid(
            this.flagValues.platform
        );

        const deviceName = CommandLineUtils.resolveFlag(
            this.flagValues.devicename,
            ''
        ).trim();
        if (deviceName.length === 0) {
            return Promise.reject(
                Configure.createError('error:invalidDeviceNameFlagsDescription')
            );
        }

        const output = CommandLineUtils.resolveFlag(
            this.flagValues.output,
            Configure.defaultOutputFile
        ).trim();

        const testFramework = CommandLineUtils.resolveFlag(
            this.flagValues.testframework,
            Configure.supportedTestFrameworks[0]
        ).trim();

        const bundlePath = CommandLineUtils.resolveFlag(
            this.flagValues.bundlepath,
            ''
        ).trim();
        if (!fs.existsSync(bundlePath)) {
            this.logger.warn(
                util.format(messages.getMessage('bundleNotFound'), bundlePath)
            );
        }

        const appActivity = CommandLineUtils.resolveFlag(
            this.flagValues.appactivity,
            ''
        ).trim();
        if (isAndroid && appActivity.length === 0) {
            return Promise.reject(
                Configure.createError(
                    'error:invalidAppActivityFlagsDescription'
                )
            );
        } else if (!isAndroid && appActivity.length > 0) {
            this.logger.warn(messages.getMessage('appActivityIgnored'));
        }

        const appPackage = CommandLineUtils.resolveFlag(
            this.flagValues.apppackage,
            ''
        ).trim();
        if (isAndroid && appPackage.length === 0) {
            return Promise.reject(
                Configure.createError('error:invalidAppPackageFlagsDescription')
            );
        } else if (!isAndroid && appPackage.length > 0) {
            this.logger.warn(messages.getMessage('appPackageIgnored'));
        }

        const port = CommandLineUtils.resolveFlag(
            this.flagValues.port,
            ''
        ).trim();

        const baseUrl = CommandLineUtils.resolveFlag(
            this.flagValues.baseurl,
            Configure.defaultTestRunnerBaseUrl
        ).trim();

        const injectionConfigsPath = CommandLineUtils.resolveFlag(
            this.flagValues.injectionconfigs,
            ''
        ).trim();

        return RequirementProcessor.execute(this.commandRequirements)
            .then(async () => {
                // execute the create command
                this.logger.info(
                    'Setup requirements met, continuing with Mobile UI Test Configuration command'
                );

                const device:
                    | AndroidVirtualDevice
                    | IOSSimulatorDevice
                    | null
                    | undefined = isAndroid
                    ? await AndroidUtils.fetchEmulator(deviceName)
                    : await IOSUtils.getSimulator(deviceName);
                if (!device) {
                    return Promise.reject(
                        Configure.createError(
                            'error:deviceNotFoundDescription',
                            deviceName
                        )
                    );
                }

                return this.executeCreateConfigFile(
                    isAndroid,
                    device,
                    output,
                    testFramework,
                    bundlePath,
                    appActivity,
                    appPackage,
                    port,
                    baseUrl,
                    injectionConfigsPath
                );
            })
            .then(() => {
                this.logger.info(`Config file created at ${output}`);
                return Promise.resolve();
            })
            .catch((error) => {
                this.logger.warn(`Failed to created config file - ${error}`);
                return Promise.reject(error);
            });
    }

    private async executeCreateConfigFile(
        isAndroid: boolean,
        device: AndroidVirtualDevice | IOSSimulatorDevice,
        output: string,
        testFramework: string,
        bundlePath: string,
        appActivity: string,
        appPackage: string,
        testRunnerPort: string,
        testRunnerBaseUrl: string,
        injectionConfigsPath: string
    ): Promise<void> {
        const placeholders = {
            specs: '${specs_placeholder}',
            excludes: '${excludes_placeholder}',
            utam_wdio_service: '${utam_wdio_service_placeholder}'
        };

        const placeholder_values = new Map<string, string>([
            [
                `${placeholders.specs}`,
                '// ToDo: define location for spec files here'
            ],
            [
                `${placeholders.excludes}`,
                '// ToDo: define patterns to exclude here'
            ],
            [`${placeholders.utam_wdio_service}`, 'UtamWdioService']
        ]);

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
                        injectionConfigs: [injectionConfigsPath]
                    }
                ]
            ],
            capabilities: [
                isAndroid
                    ? {
                          'appium:platformName': 'Android',
                          'appium:automationName': 'UiAutomator2',
                          'appium:app': bundlePath,
                          'appium:appActivity': appActivity,
                          'appium:appPackage': appPackage,
                          'appium:avd': device.name
                      }
                    : {
                          'appium:platformName': 'iOS',
                          'appium:automationName': 'XCUITest',
                          'appium:app': bundlePath,
                          'appium:udid': (device as IOSSimulatorDevice).udid
                      }
            ],
            framework: testFramework,
            baseUrl: testRunnerBaseUrl
        };

        if (testRunnerPort.length > 0) {
            config['port'] = testRunnerPort;
        }

        if (!injectionConfigsPath || injectionConfigsPath.length === 0) {
            // remove the empty string that was added to the array
            config.services[1][1].injectionConfigs = [];
        }

        // Convert to JSON, then "sanitize" and convert from JSON to a valid JS.
        const chromeDriverAutoDownloadComment =
            '// fetch the appropriate version of chrome driver as needed';
        const regex = /"\$\{\w+\}"/g;
        let configJSON = JSON.stringify(config, undefined, 2).replace(
            regex,
            (match) => {
                const key = match.slice(1, -1);
                return placeholder_values.get(key) ?? match;
            }
        );
        configJSON = configJSON.replace(
            '"chromedriver_autodownload"',
            `"chromedriver_autodownload" ${chromeDriverAutoDownloadComment}`
        );

        const content =
            `const { UtamWdioService } = require("wdio-utam-service")\n\n` +
            // convert from string to object to pickup the one imported using the require statement
            `exports.config = ${configJSON}`;

        return CommonUtils.createTextFile(output, content);
    }

    protected populateCommandRequirements(): void {
        const requirements: CommandRequirements = {};

        requirements.setup = CommandLineUtils.platformFlagIsAndroid(
            this.flagValues.platform
        )
            ? new AndroidEnvironmentRequirements(this.logger)
            : new IOSEnvironmentRequirements(this.logger);

        this._commandRequirements = requirements;
    }
}
