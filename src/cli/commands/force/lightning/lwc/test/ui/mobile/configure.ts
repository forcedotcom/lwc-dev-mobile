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

export class Configure extends SfdxCommand implements HasRequirements {
    public static description = messages.getMessage('commandDescription');

    public static examples = [
        `$ force:lightning:lwc:test:ui:mobile:configure -p iOS -d 'iPhone 12' --output './wdio.conf.js' --testframework jasmine --port 4723 --baseurl 'http://localhost' --injectionconfigs '/path/to/myPageObjects.config.json' --bundlepath '/path/to/my.app'`,
        `$ force:lightning:lwc:test:ui:mobile:configure -p Android -d Pixel_5_API_33 --output './wdio.conf.js' --testframework jasmine --port 4723 --baseurl 'http://localhost' --injectionconfigs '/path/to/myPageObjects.config.json' --bundlepath '/path/to/my.apk' --appactivity .MainActivity --apppackage com.example.android.myApp`
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

    public static flagsConfig = {
        ...CommandLineUtils.createFlagConfig(FlagsConfigType.Platform, true),
        devicename: flags.string({
            char: 'd',
            description: messages.getMessage('deviceNameFlagDescription'),
            required: true
        }),
        output: flags.string({
            description: messages.getMessage('outputFlagDescription'),
            required: false
        }),
        testframework: flags.string({
            description: messages.getMessage('testFrameworkFlagDescription'),
            required: false,
            validate: (testFramework) => {
                const framework = (testFramework ?? '').trim().toLowerCase();
                if (Configure.supportedTestFrameworks.includes(framework)) {
                    return true;
                } else {
                    throw Configure.createError(
                        'error:invalidTestFrameworkFlagsDescription',
                        framework
                    );
                }
            }
        }),
        bundlepath: flags.string({
            description: messages.getMessage('bundlePathFlagDescription'),
            required: false
        }),
        appactivity: flags.string({
            description: messages.getMessage('appActivityFlagDescription'),
            required: false
        }),
        apppackage: flags.string({
            description: messages.getMessage('appPackageFlagDescription'),
            required: false
        }),
        port: flags.string({
            description: messages.getMessage('portFlagDescription'),
            required: false,
            validate: (runnerPort) => {
                const prt = (runnerPort ?? '').trim();
                if (prt.length > 0 && !isNaN(Number(prt))) {
                    return true;
                } else {
                    throw Configure.createError(
                        'error:invalidPortFlagsDescription',
                        prt
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
                    throw Configure.createError(
                        'error:invalidBaseUrlFlagsDescription',
                        url
                    );
                }
            }
        }),
        injectionconfigs: flags.string({
            description: messages.getMessage('injectionConfigsFlagDescription'),
            required: false
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

        CommandLineUtils.flagFailureActionMessages = Configure.examples;
        return super
            .init()
            .then(() =>
                Logger.child('force:lightning:lwc:test:ui:mobile:configure', {})
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
        ).trim();
        if (deviceName.length === 0) {
            return Promise.reject(
                Configure.createError('error:invalidDeviceNameFlagsDescription')
            );
        }

        const output = CommandLineUtils.resolveFlag(
            this.flags.output,
            Configure.defaultOutputFile
        ).trim();

        const testFramework = CommandLineUtils.resolveFlag(
            this.flags.testframework,
            Configure.supportedTestFrameworks[0]
        ).trim();

        const bundlePath = CommandLineUtils.resolveFlag(
            this.flags.bundlepath,
            ''
        ).trim();
        if (!fs.existsSync(bundlePath)) {
            this.logger.warn(
                util.format(messages.getMessage('bundleNotFound'), bundlePath)
            );
        }

        const appActivity = CommandLineUtils.resolveFlag(
            this.flags.appactivity,
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
            this.flags.apppackage,
            ''
        ).trim();
        if (isAndroid && appPackage.length === 0) {
            return Promise.reject(
                Configure.createError('error:invalidAppPackageFlagsDescription')
            );
        } else if (!isAndroid && appPackage.length > 0) {
            this.logger.warn(messages.getMessage('appPackageIgnored'));
        }

        const port = CommandLineUtils.resolveFlag(this.flags.port, '').trim();

        const baseUrl = CommandLineUtils.resolveFlag(
            this.flags.baseurl,
            Configure.defaultTestRunnerBaseUrl
        ).trim();

        const injectionConfigsPath = CommandLineUtils.resolveFlag(
            this.flags.injectionconfigs,
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

    // The following is public for unit testing purposes only
    public executeCreateConfigFile(
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
            baseUrl: testRunnerBaseUrl
        };

        if (testRunnerPort.length > 0) {
            config['port'] = testRunnerPort;
        }

        if (!injectionConfigsPath || injectionConfigsPath.length === 0) {
            // remove the empty string that was added to the array
            config.services[1][1].injectionConfigs = [];
        }

        const configJSON = JSON.stringify(config, undefined, 2);

        const content =
            `const { UtamWdioService } = require("wdio-utam-service")\n\n` +
            // convert from string to object to pickup the one imported using the require statement
            `exports.config = ${configJSON.replace(
                '"UtamWdioService"',
                'UtamWdioService'
            )}`;

        return CommonUtils.createTextFile(output, content);
    }
}
