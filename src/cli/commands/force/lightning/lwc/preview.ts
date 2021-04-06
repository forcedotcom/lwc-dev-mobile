/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { Setup } from '@salesforce/lwc-dev-mobile-core/lib/cli/commands/force/lightning/local/setup';
import { AndroidLauncher } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidLauncher';
import { CommandLineUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSLauncher } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSLauncher';
import { PlatformConfig } from '@salesforce/lwc-dev-mobile-core/lib/common/PlatformConfig';
import {
    AndroidAppPreviewConfig,
    IOSAppPreviewConfig
} from '@salesforce/lwc-dev-mobile-core/lib/common/PreviewConfigFile';
import { PreviewUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/PreviewUtils';
import {
    CommandRequirements,
    Requirement,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { getPlatformSetupRequirements } from '../setupRequirementsUtil';
import * as configSchema from './previewConfigurationSchema.json';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'preview');

export class Preview extends Setup {
    public static description = messages.getMessage('commandDescription');

    public static args = [{ name: 'file' }];

    public static flagsConfig = {
        // flag with a value (-n, --name=VALUE)
        componentname: flags.string({
            char: 'n',
            description: messages.getMessage('componentnameFlagDescription'),
            required: true
        }),
        configfile: flags.string({
            char: 'f',
            description: messages.getMessage('configFileFlagDescription'),
            required: false
        }),
        confighelp: flags.help({
            default: false,
            description: messages.getMessage('configHelpFlagDescription'),
            required: false
        }),
        platform: flags.string({
            char: 'p',
            description: messages.getMessage('platformFlagDescription'),
            required: true
        }),
        projectdir: flags.string({
            char: 'd',
            description: messages.getMessage('projectDirFlagDescription'),
            required: false
        }),
        target: flags.string({
            char: 't',
            description: messages.getMessage('targetFlagDescription'),
            required: false
        }),
        targetapp: flags.string({
            char: 'a',
            description: messages.getMessage('targetAppFlagDescription'),
            required: false
        })
    };

    // Comment this out if your command does not require an org username
    protected static requiresUsername = false;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    protected static requiresProject = false;

    public examples = [
        `$ sfdx force:lightning:lwc:preview -p iOS -t LWCSim2 -n HelloWordComponent`,
        `$ sfdx force:lightning:lwc:preview -p Android -t LWCEmu2 -n HelloWordComponent`
    ];

    private serverPort: string = '';
    private deviceName: string = '';
    private componentName: string = '';
    private targetApp: string = '';
    private projectDir: string = '';
    private configFilePath: string = '';
    private appConfig:
        | IOSAppPreviewConfig
        | AndroidAppPreviewConfig
        | undefined;

    public async run(): Promise<any> {
        await this.init(); // ensure init first

        this.logger.info(`Preview command invoked for ${this.flags.platform}`);

        return this.validateInputParameters() // validate input
            .then(() => {
                if (
                    PreviewUtils.useLwcServerForPreviewing(
                        this.targetApp,
                        this.appConfig
                    )
                ) {
                    const requirements: Requirement[] = [
                        new LwcServerPluginInstalledRequirement(this.logger),
                        new LwcServerIsRunningRequirement(this.logger)
                    ];
                    this.commandRequirements.preview = {
                        requirements,
                        enabled: true
                    };
                }
                return RequirementProcessor.execute(this.commandRequirements); // verify requirements
            })
            .then(() => {
                // then launch the preview if all validations have passed
                this.logger.info(
                    'Setup requirements met, continuing with preview'
                );
                return this.launchPreview();
            })
            .catch((error) => {
                this.logger.warn(`Preview failed for ${this.flags.platform}.`);
                return Promise.reject(error);
            });
    }

    protected async validateInputParameters(): Promise<void> {
        return super.validateInputParameters().then(async () => {
            const defaultDeviceName = CommandLineUtils.platformFlagIsIOS(
                this.flags.platform
            )
                ? PlatformConfig.iOSConfig().defaultSimulatorName
                : PlatformConfig.androidConfig().defaultEmulatorName;

            this.deviceName = CommandLineUtils.resolveFlag(
                this.flags.target,
                defaultDeviceName
            );

            this.componentName = CommandLineUtils.resolveFlag(
                this.flags.componentname,
                ''
            ).trim();

            this.targetApp = CommandLineUtils.resolveFlag(
                this.flags.targetapp,
                PreviewUtils.BROWSER_TARGET_APP
            );

            this.projectDir = CommonUtils.resolveUserHomePath(
                CommandLineUtils.resolveFlag(
                    this.flags.projectdir,
                    process.cwd()
                )
            );

            const configFileName = CommonUtils.resolveUserHomePath(
                CommandLineUtils.resolveFlag(this.flags.configfile, '')
            );

            this.configFilePath = path.normalize(
                path.resolve(this.projectDir, configFileName)
            );

            const hasConfigFile =
                configFileName.length > 0 && fs.existsSync(this.configFilePath);

            const isBrowserTargetApp = PreviewUtils.isTargetingBrowser(
                this.targetApp
            );

            this.logger.debug('Validating Preview command inputs.');

            // check if user provided a config file when targetapp=browser
            // and warn them that the config file will be ignored.
            if (isBrowserTargetApp && hasConfigFile) {
                this.logger.warn(
                    messages.getMessage('ignoringConfigFileFlagDescription')
                );
            }

            if (this.componentName.length === 0) {
                return Promise.reject(
                    new SfdxError(
                        messages.getMessage(
                            'error:invalidComponentNameFlagsDescription'
                        ),
                        'lwc-dev-mobile',
                        Preview.examples
                    )
                );
            }

            if (isBrowserTargetApp === false && hasConfigFile === false) {
                return Promise.reject(
                    new SfdxError(
                        messages.getMessage(
                            'error:invalidConfigFile:missingDescription',
                            [this.configFilePath]
                        ),
                        'lwc-dev-mobile',
                        Preview.examples
                    )
                );
            }

            if (isBrowserTargetApp === false && hasConfigFile === true) {
                // 1. validate config file against schema
                const validationResult = await PreviewUtils.validateConfigFileWithSchema(
                    this.configFilePath,
                    configSchema
                );
                if (validationResult.passed === false) {
                    return Promise.reject(
                        new SfdxError(
                            messages.getMessage(
                                'error:invalidConfigFile:genericDescription',
                                [
                                    this.configFilePath,
                                    validationResult.errorMessage
                                ]
                            ),
                            'lwc-dev-mobile'
                        )
                    );
                }

                // 2. validate that a matching app configuration is included in the config file
                const configFileContent = PreviewUtils.loadConfigFile(
                    this.configFilePath
                );
                this.appConfig = configFileContent.getAppConfig(
                    this.flags.platform,
                    this.targetApp
                );
                if (this.appConfig === undefined) {
                    const errMsg = messages.getMessage(
                        'error:invalidConfigFile:missingAppConfigDescription',
                        [this.targetApp, this.flags.platform]
                    );
                    return Promise.reject(
                        new SfdxError(
                            messages.getMessage(
                                'error:invalidConfigFile:genericDescription',
                                [this.configFilePath, errMsg]
                            ),
                            'lwc-dev-mobile'
                        )
                    );
                }
            }

            if (
                PreviewUtils.useLwcServerForPreviewing(
                    this.targetApp,
                    this.appConfig
                )
            ) {
                const port = await CommonUtils.getLwcServerPort();
                this.serverPort = port
                    ? port
                    : CommonUtils.DEFAULT_LWC_SERVER_PORT;
            }

            return Promise.resolve();
        });
    }

    protected async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

        return super
            .init()
            .then(() => Logger.child('force:lightning:lwc:preview', {}))
            .then((logger) => {
                this.logger = logger;
                return Promise.resolve();
            });
    }

    protected _help(): never {
        const isCommandHelp =
            this.argv.filter(
                (v) => v.toLowerCase() === '-h' || v.toLowerCase() === '--help'
            ).length > 0;

        if (isCommandHelp) {
            super._help();
        } else {
            const message = messages.getMessage('configFileHelpDescription');
            // tslint:disable-next-line: no-console
            console.log(`${message}`);
        }

        return this.exit(0);
    }

    private _requirements: CommandRequirements = {};
    public get commandRequirements(): CommandRequirements {
        if (Object.keys(this._requirements).length === 0) {
            const commandDict: CommandRequirements = {};
            commandDict.setup = getPlatformSetupRequirements(
                this.logger,
                this.flags.platform,
                this.flags.apilevel
            );
            this._requirements = commandDict;
        }
        return this._requirements;
    }

    private async launchPreview(): Promise<void> {
        // At this point all of the inputs/parameters have been verified and parsed so we can just use them.

        let appBundlePath: string | undefined;

        if (
            PreviewUtils.isTargetingBrowser(this.targetApp) === false &&
            this.appConfig
        ) {
            try {
                CommonUtils.startCliAction(
                    messages.getMessage('previewAction'),
                    messages.getMessage('previewFetchAppBundleStatus')
                );
                appBundlePath = PreviewUtils.getAppBundlePath(
                    path.dirname(this.configFilePath),
                    this.appConfig
                );
            } catch (error) {
                CommonUtils.stopCliAction(
                    messages.getMessage('previewFetchAppBundleFailureStatus')
                );
                return Promise.reject(error);
            }
        }

        if (CommandLineUtils.platformFlagIsIOS(this.flags.platform)) {
            const config =
                this.appConfig && (this.appConfig as IOSAppPreviewConfig);
            return this.launchIOS(
                this.deviceName,
                this.componentName,
                this.projectDir,
                appBundlePath,
                this.targetApp,
                config,
                this.serverPort
            );
        } else {
            const config =
                this.appConfig && (this.appConfig as AndroidAppPreviewConfig);
            return this.launchAndroid(
                this.deviceName,
                this.componentName,
                this.projectDir,
                appBundlePath,
                this.targetApp,
                config,
                this.serverPort
            );
        }
    }

    private async launchIOS(
        deviceName: string,
        componentName: string,
        projectDir: string,
        appBundlePath: string | undefined,
        targetApp: string,
        appConfig: IOSAppPreviewConfig | undefined,
        serverPort: string
    ): Promise<void> {
        const launcher = new IOSLauncher(deviceName);

        return launcher.launchPreview(
            componentName,
            projectDir,
            appBundlePath,
            targetApp,
            appConfig,
            serverPort
        );
    }

    private async launchAndroid(
        deviceName: string,
        componentName: string,
        projectDir: string,
        appBundlePath: string | undefined,
        targetApp: string,
        appConfig: AndroidAppPreviewConfig | undefined,
        serverPort: string
    ): Promise<void> {
        const launcher = new AndroidLauncher(deviceName);

        return launcher.launchPreview(
            componentName,
            projectDir,
            appBundlePath,
            targetApp,
            appConfig,
            serverPort
        );
    }
}

// tslint:disable-next-line: max-classes-per-file
export class LwcServerPluginInstalledRequirement implements Requirement {
    public title: string;
    public fulfilledMessage: string;
    public unfulfilledMessage: string;
    public logger: Logger;

    constructor(logger: Logger) {
        this.title = messages.getMessage('reqs:serverInstalled:title');
        this.fulfilledMessage = messages.getMessage(
            'reqs:serverInstalled:fulfilledMessage'
        );
        this.unfulfilledMessage = messages.getMessage(
            'reqs:serverInstalled:unfulfilledMessage'
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
                        `sfdx server plugin installation failed. ${error}`
                    );
                    return Promise.reject(
                        new SfdxError(this.unfulfilledMessage)
                    );
                }
            });
    }
}

// tslint:disable-next-line: max-classes-per-file
export class LwcServerIsRunningRequirement implements Requirement {
    public title: string = messages.getMessage('reqs:serverStarted:title');
    public fulfilledMessage: string = messages.getMessage(
        'reqs:serverStarted:fulfilledMessage'
    );
    public unfulfilledMessage: string = messages.getMessage(
        'reqs:serverStarted:unfulfilledMessage'
    );
    public logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    public async checkFunction(): Promise<string> {
        return CommonUtils.getLwcServerPort().then((port) => {
            if (!port) {
                return Promise.reject(this.unfulfilledMessage);
            } else {
                return Promise.resolve(
                    util.format(this.fulfilledMessage, port)
                );
            }
        });
    }
}
