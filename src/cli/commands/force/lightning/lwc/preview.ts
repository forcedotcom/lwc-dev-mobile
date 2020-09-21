/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { flags } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import fs from 'fs';
import { AndroidLauncher } from '../../../../../common/AndroidLauncher';
import { CommandLineUtils } from '../../../../../common/Common';
import { IOSLauncher } from '../../../../../common/IOSLauncher';
import { AndroidAppPreviewConfig } from '../../../../../common/PreviewConfigFile';
import { PreviewUtils } from '../../../../../common/PreviewUtils';
import { SetupTestResult } from '../../../../../common/Requirements';
import androidConfig from '../../../../../config/androidconfig.json';
import iOSConfig from '../../../../../config/iosconfig.json';
import Setup from '../local/setup';
import * as configSchema from './previewConfigurationSchema.json';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'preview');

export default class Preview extends Setup {
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

    public async run(): Promise<any> {
        const platform = this.flags.platform;
        this.logger.info(`Preview command invoked for ${platform}`);
        return Promise.all<void, SetupTestResult>([
            this.validateAdditionalInputs(),
            super.run()
        ])
            .then((result) => {
                this.logger.info(
                    'Setup requirements met, continuing with preview'
                );
                return this.launchPreview();
            })
            .catch((error) => {
                this.logger.warn(
                    `Preview failed for ${platform}. Setup requirements have not been met.`
                );
                return Promise.reject(error);
            });
    }

    public async validateAdditionalInputs(): Promise<void> {
        const platform = this.flags.platform;

        const compName = CommandLineUtils.resolveFlag(
            this.flags.componentname,
            ''
        ).trim();

        const targetApp = CommandLineUtils.resolveFlag(
            this.flags.targetapp,
            PreviewUtils.BROWSER_TARGET_APP
        );

        const configFileName = CommandLineUtils.resolveFlag(
            this.flags.configfile,
            ''
        ).trim();

        const hasConfigFile =
            configFileName.length > 0 && fs.existsSync(configFileName);

        const isBrowserTargetApp = PreviewUtils.isTargetingBrowser(targetApp);

        const isValidCompName = compName.length > 0;

        this.logger.debug('Validating Preview command inputs.');

        // check if user provided a config file when targetapp=browser
        // and warn them that the config file will be ignored.
        if (isBrowserTargetApp && hasConfigFile) {
            this.logger.warn(
                messages.getMessage('ignoringConfigFileFlagDescription')
            );
        }

        if (isValidCompName === false) {
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
                        [configFileName]
                    ),
                    'lwc-dev-mobile',
                    Preview.examples
                )
            );
        }

        if (isBrowserTargetApp === false && hasConfigFile === true) {
            // 1. validate config file against schema
            const validationResult = await PreviewUtils.validateConfigFileWithSchema(
                configFileName,
                configSchema
            );
            if (validationResult.passed === false) {
                return Promise.reject(
                    new SfdxError(
                        messages.getMessage(
                            'error:invalidConfigFile:genericDescription',
                            [configFileName, validationResult.errorMessage]
                        ),
                        'lwc-dev-mobile'
                    )
                );
            }

            // 2. validate that a matching app configuration is included in the config file
            const configFile = PreviewUtils.loadConfigFile(configFileName);
            const appConfig = configFile.getAppConfig(platform, targetApp);
            if (appConfig === undefined) {
                const errMsg = messages.getMessage(
                    'error:invalidConfigFile:missingAppConfigDescription',
                    [targetApp, platform]
                );
                return Promise.reject(
                    new SfdxError(
                        messages.getMessage(
                            'error:invalidConfigFile:genericDescription',
                            [configFileName, errMsg]
                        ),
                        'lwc-dev-mobile'
                    )
                );
            }
        }

        return Promise.resolve();
    }

    public launchPreview(): Promise<boolean> {
        const platform = this.flags.platform;

        const defaultDeviceName = CommandLineUtils.platformFlagIsIOS(platform)
            ? iOSConfig.defaultSimulatorName
            : androidConfig.defaultEmulatorName;

        const device = CommandLineUtils.resolveFlag(
            this.flags.target,
            defaultDeviceName
        );

        const targetApp = CommandLineUtils.resolveFlag(
            this.flags.targetapp,
            PreviewUtils.BROWSER_TARGET_APP
        );

        const projectDir = CommandLineUtils.resolveFlag(
            this.flags.projectdir,
            process.cwd()
        );

        const configFileName = CommandLineUtils.resolveFlag(
            this.flags.configfile,
            ''
        );

        const component = this.flags.componentname;

        const configFile = PreviewUtils.loadConfigFile(configFileName);
        const appConfig = configFile.getAppConfig(platform, targetApp);

        const launchArgs: Map<string, string> =
            appConfig?.launch_arguments || new Map();

        if (CommandLineUtils.platformFlagIsIOS(this.flags.platform)) {
            return this.launchIOS(
                device,
                component,
                projectDir,
                targetApp,
                launchArgs
            );
        } else {
            const config = appConfig as AndroidAppPreviewConfig;
            return this.launchAndroid(
                device,
                component,
                projectDir,
                targetApp,
                launchArgs,
                config.activity
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

    private launchIOS(
        deviceName: string,
        componentName: string,
        projectDir: string,
        targetApp: string,
        targetAppArguments: Map<string, string>
    ): Promise<boolean> {
        const launcher = new IOSLauncher(deviceName);

        return launcher.launchPreview(
            componentName,
            projectDir,
            targetApp,
            targetAppArguments
        );
    }

    private launchAndroid(
        deviceName: string,
        componentName: string,
        projectDir: string,
        targetApp: string,
        targetAppArguments: Map<string, string>,
        launchActivity: string
    ): Promise<boolean> {
        const launcher = new AndroidLauncher(deviceName);

        return launcher.launchPreview(
            componentName,
            projectDir,
            targetApp,
            targetAppArguments,
            launchActivity
        );
    }
}
