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
import dedent from 'ts-dedent';
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
        `$ force:lightning:lwc:test:ui:configure:mobile -p iOS -d sfdxdebug -o './wdio.conf.js' -f jasmine -r local -t 4723 -u 'http://localhost' -i '/path/to/myPageObjects.config.json' -b '/path/to/my.app'`,
        `$ force:lightning:lwc:test:ui:configure:mobile -p Android -d sfdxdebug -o './wdio.conf.js' -f jasmine -r local -t 4723 -u 'http://localhost' -i '/path/to/myPageObjects.config.json' -b '/path/to/my.apk' -a .MainActivity -k com.example.android.myApp`
    ];

    private static defaultOutputFile = './wdio.conf.js';
    private static supportedTestFrameworks = ['jasmine', 'mocha', 'cucumber'];
    private static supportedTestRunners = ['local', 'browser'];
    private static defaultTestRunnerBaseUrl = 'http://localhost';

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
            char: 'o',
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
            char: 'f',
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
            char: 'b',
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
            char: 'a',
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
            char: 'k',
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
            char: 'r',
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
            char: 't',
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
            char: 'u',
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
            char: 'i',
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

    private executeCreateConfigFile(
        isAndroid: boolean,
        device: AndroidVirtualDevice | IOSSimulatorDevice,
        output: string,
        testFramework: string,
        bundlePath: string,
        appActivity: string,
        appPackage: string,
        runner: string,
        port: string,
        baseUrl: string,
        injectionConfigsPath: string
    ): Promise<void> {
        // get the version by taking the last part of the runtimeId
        // eg: iOS 16.2 => 16.2
        const iOSVersion = (
            (device as IOSSimulatorDevice | null)?.runtimeId ?? ''
        )
            .split(' ')
            .pop();

        const iOSCapabilities = dedent`
            capabilities: [
                {
                    'appium:platformName': 'iOS',
                    'appium:automationName': 'XCUITest',
                    'appium:deviceName': '${device.name}',
                    'appium:platformVersion': '${iOSVersion}',
                    'appium:app': '${bundlePath}',
                },
            ],
        `;

        const androidCapabilities = dedent`
            capabilities: [
                {
                    'appium:platformName': 'Android',
                    'appium:automationName': 'UiAutomator2',
                    'appium:avd': '${device.name}',
                    'appium:app': '${bundlePath}',
                    'appium:appActivity': '${appActivity}',
                    'appium:appPackage': '${appPackage}',
                },
            ],
        `;

        const capabilities = isAndroid ? androidCapabilities : iOSCapabilities;

        const runnerPort = port.length > 0 ? `port: ${port},` : '';

        const content = dedent`
            exports.config = {
                runner: '${runner}',
                ${runnerPort}
                baseUrl: '${baseUrl}',

                framework: '${testFramework}',

                specs: [
                    // ToDo: define location for spec files here
                ],
                exclude: [
                    // 'path/to/excluded/files'
                ],

                services: [
                    [
                        'appium',
                        {
                            command: 'appium',
                        },
                    ],
                    [
                        UtamWdioService,
                        {
                            implicitTimeout: 0,
                            injectionConfigs: ['${injectionConfigsPath}'],
                        },
                    ],
                ],

                ${capabilities}
            }
        `;

        return CommonUtils.createTextFile(output, content);
    }
}
