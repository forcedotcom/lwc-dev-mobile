/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Flags } from '@salesforce/sf-plugins-core';
import { Logger, Messages, SfError } from '@salesforce/core';
import { AndroidEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidEnvironmentRequirements';
import { AndroidLauncher } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidLauncher';
import { BaseCommand } from '@salesforce/lwc-dev-mobile-core/lib/common/BaseCommand';
import {
    CommandLineUtils,
    FlagsConfigType
} from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSEnvironmentRequirements';
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
import * as configSchema from './previewConfigurationSchema.json';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'preview');

export class Preview extends BaseCommand {
    protected _commandName = 'force:lightning:lwc:preview';

    public static readonly description =
        messages.getMessage('commandDescription');

    public static readonly examples = [
        `sfdx force:lightning:lwc:preview -p iOS -t LWCSim2 -n HelloWordComponent`,
        `sfdx force:lightning:lwc:preview -p Android -t LWCEmu2 -n HelloWordComponent`
    ];

    private static createError(stringId: string, ...param: any[]): SfError {
        let msg = messages.getMessage(stringId);
        if (param.length > 0) {
            msg = util.format(msg, param);
        }
        return new SfError(msg, 'lwc-dev-mobile', Preview.examples);
    }

    public static readonly flags = {
        componentname: Flags.string({
            char: 'n',
            description: messages.getMessage('componentnameFlagDescription'),
            required: true
        }),
        configfile: Flags.string({
            char: 'f',
            description: messages.getMessage('configFileFlagDescription'),
            required: false
        }),
        confighelp: Flags.boolean({
            default: false,
            description: messages.getMessage('configHelpFlagDescription'),
            required: false
        }),
        projectdir: Flags.string({
            char: 'd',
            description: messages.getMessage('projectDirFlagDescription'),
            required: false
        }),
        target: Flags.string({
            char: 't',
            description: messages.getMessage('targetFlagDescription'),
            required: false
        }),
        targetapp: Flags.string({
            char: 'a',
            description: messages.getMessage('targetAppFlagDescription'),
            required: false
        }),
        ...CommandLineUtils.createFlag(FlagsConfigType.Platform, true)
    };

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    public static requiresProject = false;

    private serverPort = '';
    private deviceName = '';
    private componentName = '';
    private targetApp = '';
    private projectDir = '';
    private configFilePath = '';
    private appConfig:
        | IOSAppPreviewConfig
        | AndroidAppPreviewConfig
        | undefined;

    public async run(): Promise<void> {
        this.logger.info(
            `Preview command invoked for ${this.flagValues.platform}`
        );

        return this.validateInputParameters() // validate input
            .then(() => {
                if (this.flagValues.confighelp === true) {
                    const message = messages.getMessage(
                        'configFileHelpDescription'
                    );
                    // tslint:disable-next-line: no-console
                    console.log(`${message}`);
                    return Promise.resolve();
                } else {
                    return RequirementProcessor.execute(
                        this.commandRequirements
                    ).then(() => {
                        // then launch the preview if all validations have passed
                        this.logger.info(
                            'Setup requirements met, continuing with preview'
                        );
                        return this.launchPreview();
                    });
                }
            })
            .catch((error) => {
                this.logger.warn(
                    `Preview failed for ${this.flagValues.platform}.`
                );
                return Promise.reject(error);
            });
    }

    protected populateCommandRequirements(): void {
        const requirements: CommandRequirements = {};

        requirements.setup = CommandLineUtils.platformFlagIsAndroid(
            this.flagValues.platform
        )
            ? new AndroidEnvironmentRequirements(
                  this.logger,
                  this.flagValues.apilevel
              )
            : new IOSEnvironmentRequirements(this.logger);

        requirements.preview = {
            requirements: [
                new LwcServerPluginInstalledRequirement(this.logger),
                new LwcServerIsRunningRequirement(this.logger)
            ],
            enabled: this.useLwcServerForPreviewing()
        };

        this._commandRequirements = requirements;
    }

    // TODO: Preview command takes quite a few command flags/parameters compared to other commands.
    //       Furthermore, the flags need to be processed more than in other commands which
    //       makes validating them at flagConfig's "validate" method more difficult.
    //
    //       In the future refactoring we should seek to simplify validateInputParameters so that
    //       we can take advantage of flagConfig's "validate".
    private async validateInputParameters(): Promise<void> {
        const defaultDeviceName = CommandLineUtils.platformFlagIsIOS(
            this.flagValues.platform
        )
            ? PlatformConfig.iOSConfig().defaultSimulatorName
            : PlatformConfig.androidConfig().defaultEmulatorName;

        this.deviceName = CommandLineUtils.resolveFlag(
            this.flagValues.target,
            defaultDeviceName
        );

        this.componentName = CommandLineUtils.resolveFlag(
            this.flagValues.componentname,
            ''
        ).trim();

        this.targetApp = CommandLineUtils.resolveFlag(
            this.flagValues.targetapp,
            PreviewUtils.BROWSER_TARGET_APP
        );

        this.projectDir = CommonUtils.resolveUserHomePath(
            CommandLineUtils.resolveFlag(
                this.flagValues.projectdir,
                process.cwd()
            )
        );

        const configFileName = CommonUtils.resolveUserHomePath(
            CommandLineUtils.resolveFlag(this.flagValues.configfile, '')
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
                Preview.createError(
                    'error:invalidComponentNameFlagsDescription'
                )
            );
        }

        if (isBrowserTargetApp === false && hasConfigFile === false) {
            return Promise.reject(
                Preview.createError(
                    'error:invalidConfigFile:missingDescription',
                    this.configFilePath
                )
            );
        }

        if (isBrowserTargetApp === false && hasConfigFile === true) {
            // 1. validate config file against schema
            const validationResult =
                await PreviewUtils.validateConfigFileWithSchema(
                    this.configFilePath,
                    configSchema
                );
            if (validationResult.passed === false) {
                return Promise.reject(
                    Preview.createError(
                        'error:invalidConfigFile:genericDescription',
                        this.configFilePath,
                        validationResult.errorMessage
                    )
                );
            }

            // 2. validate that a matching app configuration is included in the config file
            const configFileContent = PreviewUtils.loadConfigFile(
                this.configFilePath
            );
            this.appConfig = configFileContent.getAppConfig(
                this.flagValues.platform,
                this.targetApp
            );
            if (this.appConfig === undefined) {
                const errMsg = messages.getMessage(
                    'error:invalidConfigFile:missingAppConfigDescription',
                    [this.targetApp, this.flagValues.platform]
                );
                return Promise.reject(
                    Preview.createError(
                        'error:invalidConfigFile:genericDescription',
                        this.configFilePath,
                        errMsg
                    )
                );
            }
        }

        if (this.useLwcServerForPreviewing()) {
            const port = await CommonUtils.getLwcServerPort();
            this.serverPort = port ? port : CommonUtils.DEFAULT_LWC_SERVER_PORT;
        }

        return Promise.resolve();
    }

    private useLwcServerForPreviewing(): boolean {
        return PreviewUtils.useLwcServerForPreviewing(
            this.targetApp,
            this.appConfig
        );
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

        if (CommandLineUtils.platformFlagIsIOS(this.flagValues.platform)) {
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
        return (
            CommonUtils.isLwcServerPluginInstalled()
                .then(() => {
                    this.logger.info('sfdx server plugin detected.');
                    return Promise.resolve(this.fulfilledMessage);
                })
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                            new SfError(this.unfulfilledMessage)
                        );
                    }
                })
        );
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
