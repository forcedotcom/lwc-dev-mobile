/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfError } from '@salesforce/core';
import { AndroidEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidEnvironmentRequirements';
import { AndroidVirtualDevice } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidTypes';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
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
    HasRequirements,
    CommandRequirements
} from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import util from 'util';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'test-ui-configure-mobile'
);

export class Mobile extends SfdxCommand implements HasRequirements {
    public static description = messages.getMessage('commandDescription');

    public static examples = [
        `$ force:lightning:lwc:test:ui:configure:mobile -p iOS -d iPhone 12 --output './wdio.conf.js' --testframework jasmine --runner local --port 4723 --baseurl 'http://localhost' --injectionconfigs '/path/to/myPageObjects.config.json' --bundlepath '/path/to/my.app'`,
        `$ force:lightning:lwc:test:ui:configure:mobile -p Android -d Pixel_5_API_33 --output './wdio.conf.js' --testframework jasmine --runner local --port 4723 --baseurl 'http://localhost' --injectionconfigs '/path/to/myPageObjects.config.json' --bundlepath '/path/to/my.apk' --appactivity .MainActivity --apppackage com.example.android.myApp`
    ];

    public static defaultOutputFile = './wdio.conf.js';
    public static supportedTestFrameworks = ['jasmine', 'mocha', 'cucumber'];
    public static supportedTestRunners = ['local', 'browser'];
    public static defaultTestRunnerBaseUrl = 'http://localhost';

    private static createError(stringId: string): SfError {
        return new SfError(
            messages.getMessage(stringId),
            'lwc-dev-mobile',
            Mobile.examples
        );
    }

    public static flagsConfig = {
        ...CommandLineUtils.createFlagConfig(FlagsConfigType.Platform, true),
        devicename: flags.string({
            char: 'd',
            description: messages.getMessage('deviceNameFlagDescription'),
            required: true,
            validate: (deviceName) => {
                if (deviceName && deviceName.trim().length > 0) {
                    return true;
                } else {
                    throw Mobile.createError(
                        'error:invalidDeviceNameFlagsDescription'
                    );
                }
            }
        }),
        output: flags.string({
            description: messages.getMessage('outputFlagDescription'),
            required: false,
            validate: (outputPath) => {
                if (outputPath && outputPath.trim().length > 0) {
                    return true;
                } else {
                    throw Mobile.createError(
                        'error:invalidOutputFlagsDescription'
                    );
                }
            }
        }),
        testframework: flags.string({
            description: messages.getMessage('testFrameworkFlagDescription'),
            required: false,
            validate: (testFramework) => {
                const framework = (testFramework ?? '').trim().toLowerCase();
                if (Mobile.supportedTestFrameworks.includes(framework)) {
                    return true;
                } else {
                    throw Mobile.createError(
                        'error:invalidTestFrameworkFlagsDescription'
                    );
                }
            }
        }),
        bundlepath: flags.string({
            description: messages.getMessage('bundlePathFlagDescription'),
            required: false,
            validate: (bundlePath) => {
                if (bundlePath && bundlePath.trim().length > 0) {
                    return true;
                } else {
                    throw Mobile.createError(
                        'error:invalidBundlePathFlagsDescription'
                    );
                }
            }
        }),
        appactivity: flags.string({
            description: messages.getMessage('appActivityFlagDescription'),
            required: false,
            validate: (activity) => {
                if (activity && activity.trim().length > 0) {
                    return true;
                } else {
                    throw Mobile.createError(
                        'error:invalidAppActivityFlagsDescription'
                    );
                }
            }
        }),
        apppackage: flags.string({
            description: messages.getMessage('appPackageFlagDescription'),
            required: false,
            validate: (pkg) => {
                if (pkg && pkg.trim().length > 0) {
                    return true;
                } else {
                    throw Mobile.createError(
                        'error:invalidAppPackageFlagsDescription'
                    );
                }
            }
        }),
        runner: flags.string({
            description: messages.getMessage('runnerFlagDescription'),
            required: false,
            validate: (testRunner) => {
                const rnr = (testRunner ?? '').trim().toLowerCase();
                if (Mobile.supportedTestRunners.includes(rnr)) {
                    return true;
                } else {
                    throw Mobile.createError(
                        'error:invalidRunnerFlagsDescription'
                    );
                }
            }
        }),
        port: flags.string({
            description: messages.getMessage('portFlagDescription'),
            required: false,
            validate: (runnerPort) => {
                const prt = (runnerPort ?? '').trim();
                if (prt.length > 0 && !isNaN(Number(prt))) {
                    return true;
                } else {
                    throw Mobile.createError(
                        'error:invalidPortFlagsDescription'
                    );
                }
            }
        }),
        baseurl: flags.string({
            description: messages.getMessage('baseUrlFlagDescription'),
            required: false,
            validate: (baseUrl) => {
                const url = (baseUrl ?? '').trim().toLowerCase();
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    return true;
                } else {
                    throw Mobile.createError(
                        'error:invalidBaseUrlFlagsDescription'
                    );
                }
            }
        }),
        injectionconfigs: flags.string({
            description: messages.getMessage('injectionConfigsFlagDescription'),
            required: false,
            validate: (configsPath) => {
                if (configsPath && configsPath.trim().length > 0) {
                    return true;
                } else {
                    throw Mobile.createError(
                        'error:invalidInjectionConfigsFlagsDescription'
                    );
                }
            }
        })
    };

    private _requirements: CommandRequirements = {};
    public get commandRequirements(): CommandRequirements {
        if (Object.keys(this._requirements).length === 0) {
            const requirements: CommandRequirements = {};
            requirements.setup = CommandLineUtils.platformFlagIsAndroid(
                this.flags.platform
            )
                ? new AndroidEnvironmentRequirements(this.logger)
                : new IOSEnvironmentRequirements(this.logger);
            this._requirements = requirements;
        }

        return this._requirements;
    }

    public async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

        CommandLineUtils.flagFailureActionMessages = Mobile.examples;
        return super
            .init()
            .then(() =>
                Logger.child('force:lightning:lwc:test:ui:configure:mobile', {})
            )
            .then((logger) => {
                this.logger = logger;
                return Promise.resolve();
            });
    }

    public async run(): Promise<any> {
        this.logger.info(
            `Mobile UI Test Configuration command invoked for ${this.flags.platform}`
        );

        const platform = this.flags.platform;
        const isAndroid = CommandLineUtils.platformFlagIsAndroid(platform);

        const deviceName = CommandLineUtils.resolveFlag(
            this.flags.devicename,
            ''
        );
        if (deviceName.length == 0) {
            return Promise.reject(
                new SfError(
                    messages.getMessage(
                        'error:invalidDeviceNameFlagsDescription'
                    )
                )
            );
        }

        const output = CommandLineUtils.resolveFlag(
            this.flags.output,
            Mobile.defaultOutputFile
        );

        const testFramework = CommandLineUtils.resolveFlag(
            this.flags.testframework,
            Mobile.supportedTestFrameworks[0]
        );

        const bundlePath = CommandLineUtils.resolveFlag(
            this.flags.bundlepath,
            ''
        );

        const appActivity = CommandLineUtils.resolveFlag(
            this.flags.appactivity,
            ''
        );
        if (isAndroid && appActivity.length == 0) {
            return Promise.reject(
                new SfError(
                    messages.getMessage(
                        'error:invalidAppActivityFlagsDescription'
                    )
                )
            );
        }

        const appPackage = CommandLineUtils.resolveFlag(
            this.flags.apppackage,
            ''
        );
        if (isAndroid && appPackage.length == 0) {
            return Promise.reject(
                new SfError(
                    messages.getMessage(
                        'error:invalidAppPackageFlagsDescription'
                    )
                )
            );
        }

        const runner = CommandLineUtils.resolveFlag(
            this.flags.runner,
            Mobile.supportedTestRunners[0]
        );

        const port = CommandLineUtils.resolveFlag(this.flags.port, '');

        const baseUrl = CommandLineUtils.resolveFlag(
            this.flags.baseurl,
            Mobile.defaultTestRunnerBaseUrl
        );

        const injectionConfigsPath = CommandLineUtils.resolveFlag(
            this.flags.injectionconfigs,
            ''
        );

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
                        new SfError(
                            util.format(
                                messages.getMessage(
                                    'error:deviceNotFoundDescription'
                                ),
                                deviceName
                            )
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
                    runner,
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

    // The following is public for unit testing purposes only
    public executeCreateConfigFile(
        isAndroid: boolean,
        device: AndroidVirtualDevice | IOSSimulatorDevice,
        output: string,
        testFramework: string,
        bundlePath: string,
        appActivity: string,
        appPackage: string,
        testRunner: string,
        testRunnerPort: string,
        testRunnerBaseUrl: string,
        injectionConfigsPath: string
    ): Promise<void> {
        const config: { [k: string]: any } = {
            services: [
                [
                    'appium',
                    {
                        command: 'appium'
                    }
                ],
                [
                    'UtamWdioService',
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
            baseUrl: testRunnerBaseUrl,
            runner: testRunner
        };

        if (testRunnerPort.length > 0) {
            config['port'] = testRunnerPort;
        }

        const configJSON = JSON.stringify(config, undefined, 2);

        const content =
            "const { UtamWdioService } = require('wdio-utam-service')\n\n" +
            // convert from string to object to pickup the one imported using the require statement
            `exports.config = ${configJSON.replace(
                '"UtamWdioService"',
                'UtamWdioService'
            )}`;

        return CommonUtils.createTextFile(output, content);
    }
}
