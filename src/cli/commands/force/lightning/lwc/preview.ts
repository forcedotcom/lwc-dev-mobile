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
import {
    AndroidAppPreviewConfig,
    IOSAppPreviewConfig
} from '@salesforce/lwc-dev-mobile-core/lib/common/PreviewConfigFile';
import { PreviewUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/PreviewUtils';
import { Requirement } from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import androidConfig from '@salesforce/lwc-dev-mobile-core/lib/config/androidconfig.json';
import iOSConfig from '@salesforce/lwc-dev-mobile-core/lib/config/iosconfig.json';
import fs from 'fs';
import path from 'path';
import util from 'util';
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
        `$ sfdx force:lightning:lwc:preview -p iOS -t LWCSim2 -n HellowWordComponent`,
        `$ sfdx force:lightning:lwc:preview -p Android -t LWCEmu2 -n HellowWordComponent`
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
        this.logger.info(`Preview command invoked for ${this.flags.platform}`);

        return this.validateAdditionalInputs() // first validate input parameters
            .then(() => {
                // then validate setup requirements
                if (
                    PreviewUtils.useLwcServerForPreviewing(
                        this.targetApp,
                        this.appConfig
                    )
                ) {
                    const extraReqs: Requirement[] = [
                        new LwcServerIsRunningRequirement(this.logger)
                    ];
                    this.addRequirements(extraReqs);
                }
                return super.run();
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

    public async validateAdditionalInputs(): Promise<void> {
        const defaultDeviceName = CommandLineUtils.platformFlagIsIOS(
            this.flags.platform
        )
            ? iOSConfig.defaultSimulatorName
            : androidConfig.defaultEmulatorName;

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
            CommandLineUtils.resolveFlag(this.flags.projectdir, process.cwd())
        );

        const configFileName = CommonUtils.resolveUserHomePath(
            CommandLineUtils.resolveFlag(this.flags.configfile, '')
        );

        this.configFilePath = path.normalize(
            path.resolve(this.projectDir, configFileName)
        );

        const hasConfigFile =
            this.configFilePath.length > 0 &&
            fs.existsSync(this.configFilePath);

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
                            [this.configFilePath, validationResult.errorMessage]
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
            this.serverPort = port ? port : CommonUtils.DEFAULT_LWC_SERVER_PORT;
        }

        return Promise.resolve();
    }

    public async launchPreview(): Promise<void> {
        // At this point all of the inputs/parameters have been verified and parsed so we can just use them.

        let appBundlePath: string | undefined;

        if (
            PreviewUtils.isTargetingBrowser(this.targetApp) === false &&
            this.appConfig
        ) {
            try {
                appBundlePath = PreviewUtils.getAppBundlePath(
                    path.dirname(this.configFilePath),
                    this.appConfig
                );
            } catch (error) {
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

    protected async init(): Promise<void> {
        await super.init();
        const logger = await Logger.child('mobile:preview', {});
        this.logger = logger;
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
export class LwcServerIsRunningRequirement implements Requirement {
    public title: string = messages.getMessage('reqs:server:title');
    public fulfilledMessage: string = messages.getMessage(
        'reqs:server:fulfilledMessage'
    );
    public unfulfilledMessage: string = messages.getMessage(
        'reqs:server:unfulfilledMessage'
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
