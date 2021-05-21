/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { AndroidEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidEnvironmentRequirements';
import { AndroidLauncher } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidLauncher';
import { CommandLineUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSEnvironmentRequirements';
import { IOSLauncher } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSLauncher';
import {
    AndroidAppPreviewConfig,
    IOSAppPreviewConfig
} from '@salesforce/lwc-dev-mobile-core/lib/common/PreviewConfigFile';
import { PreviewUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/PreviewUtils';
import {
    CommandRequirements,
    HasRequirements,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import { LwrServerUtils } from '../../../../../common/LwrServerUtils';

import fs from 'fs';
import path from 'path';
import * as configSchema from './previewConfigurationSchema.json';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'preview');

export class Preview extends SfdxCommand implements HasRequirements {
    public static description = messages.getMessage('commandDescription');

    public static args = [{ name: 'file' }];

    public static examples = [
        `$ sfdx force:lightning:lwc:preview -p Desktop -n HelloWordComponent`,
        `$ sfdx force:lightning:lwc:preview -p iOS -t LWCSim2 -n HelloWordComponent`,
        `$ sfdx force:lightning:lwc:preview -p Android -t LWCEmu2 -n HelloWordComponent`
    ];

    public static flagsConfig = {
        // flag with a value (-n, --name=VALUE)
        platform: flags.string({
            char: 'p',
            description: `Specify platform ('Desktop' or 'iOS' or 'Android').`,
            required: true
        }),
        componentname: flags.string({
            char: 'n',
            description: messages.getMessage('componentnameFlagDescription'),
            required: true
        }),
        configfile: flags.string({
            char: 'f',
            description: messages.getMessage('configFileFlagDescription'),
            required: false,
            default: ''
        }),
        confighelp: flags.help({
            default: false,
            description: messages.getMessage('configHelpFlagDescription'),
            required: false
        }),
        projectdir: flags.string({
            char: 'd',
            description: messages.getMessage('projectDirFlagDescription'),
            required: false,
            default: process.cwd()
        }),
        target: flags.string({
            char: 't',
            description: messages.getMessage('targetFlagDescription'),
            required: false,
            default: 'SFDXDebug'
        }),
        targetapp: flags.string({
            char: 'a',
            description: messages.getMessage('targetAppFlagDescription'),
            required: false,
            default: PreviewUtils.BROWSER_TARGET_APP
        })
    };

    // Comment this out if your command does not require an org username
    protected static requiresUsername = false;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    protected static requiresProject = false;

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
        this.logger.info(`Preview command invoked for ${this.flags.platform}`);

        return this.validateInputParameters() // validate input
            .then(() => {
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

    private async validateInputParameters(): Promise<void> {
        this.deviceName = (this.flags.target as string).trim();
        this.componentName = (this.flags.componentname as string).trim();
        this.targetApp = (this.flags.targetapp as string).trim();
        this.projectDir = CommonUtils.resolveUserHomePath(
            (this.flags.projectdir as string).trim()
        );

        const configFileName = CommonUtils.resolveUserHomePath(
            (this.flags.configfile as string).trim()
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

        const platform = (this.flags.platform as string).trim();
        if (!CommandLineUtils.platformFlagIsValid(platform, true)) {
            return Promise.reject(
                new SfdxError(
                    messages.getMessage('error:invalidInputFlagsDescription'),
                    'lwc-dev-mobile',
                    Preview.examples
                )
            );
        }

        if (
            CommandLineUtils.platformFlagIsDesktop(platform) &&
            !isBrowserTargetApp
        ) {
            return Promise.reject(
                new SfdxError(
                    messages.getMessage('error:invalidTargetAppForDesktop'),
                    'lwc-dev-mobile',
                    Preview.examples
                )
            );
        }

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
                            [this.configFilePath, validationResult.errorMessage]
                        ),
                        'lwc-dev-mobile',
                        Preview.examples
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
                        'lwc-dev-mobile',
                        Preview.examples
                    )
                );
            }
        }

        return Promise.resolve();
    }

    public async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

        CommandLineUtils.flagFailureActionMessages = Preview.examples;
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
            const requirements: CommandRequirements = {};
            if (!CommandLineUtils.platformFlagIsDesktop(this.flags.platform)) {
                requirements.setup = CommandLineUtils.platformFlagIsAndroid(
                    this.flags.platform
                )
                    ? new AndroidEnvironmentRequirements(
                          this.logger,
                          this.flags.apilevel
                      )
                    : new IOSEnvironmentRequirements(this.logger);
                this._requirements = requirements;
            }
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

        if (CommandLineUtils.platformFlagIsDesktop(this.flags.platform)) {
            return this.launchDesktop(this.componentName, this.projectDir);
        } else if (CommandLineUtils.platformFlagIsIOS(this.flags.platform)) {
            const config =
                this.appConfig && (this.appConfig as IOSAppPreviewConfig);
            return this.launchIOS(
                this.deviceName,
                this.componentName,
                this.projectDir,
                appBundlePath,
                this.targetApp,
                config
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
                config
            );
        }
    }

    private async launchDesktop(
        componentName: string,
        projectDir: string
    ): Promise<void> {
        return LwrServerUtils.startLwrServer(
            componentName,
            projectDir
        ).then((serverPort) =>
            CommonUtils.launchUrlInDesktopBrowser(
                `http://localhost:${serverPort}`
            )
        );
    }

    private async launchIOS(
        deviceName: string,
        componentName: string,
        projectDir: string,
        appBundlePath: string | undefined,
        targetApp: string,
        appConfig: IOSAppPreviewConfig | undefined
    ): Promise<void> {
        const launcher = new IOSLauncher(deviceName);

        return LwrServerUtils.startLwrServer(
            componentName,
            projectDir
        ).then((serverPort) =>
            launcher.launchPreview(
                componentName,
                projectDir,
                appBundlePath,
                targetApp,
                appConfig,
                serverPort
            )
        );
    }

    private async launchAndroid(
        deviceName: string,
        componentName: string,
        projectDir: string,
        appBundlePath: string | undefined,
        targetApp: string,
        appConfig: AndroidAppPreviewConfig | undefined
    ): Promise<void> {
        const launcher = new AndroidLauncher(deviceName);

        return LwrServerUtils.startLwrServer(
            componentName,
            projectDir
        ).then((serverPort) =>
            launcher.launchPreview(
                componentName,
                projectDir,
                appBundlePath,
                targetApp,
                appConfig,
                serverPort
            )
        );
    }
}
