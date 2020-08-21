/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { flags, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { AndroidLauncher } from '../../../../../common/AndroidLauncher';
import { CommandLineUtils, PreviewUtils } from '../../../../../common/Common';
import { IOSLauncher } from '../../../../../common/IOSLauncher';
import { SetupTestResult } from '../../../../../common/Requirements';
import androidConfig from '../../../../../config/androidconfig.json';
import iOSConfig from '../../../../../config/iosconfig.json';
import Setup from '../local/setup';

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
        }),
        targetapparguments: flags.string({
            description: messages.getMessage(
                'targetAppArgumentsFlagDescription'
            ),
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

    public validateAdditionalInputs(): Promise<void> {
        const compName = this.flags.componentname;
        return new Promise<void>((resolve, reject) => {
            const isValid: boolean = compName
                ? compName.trim().length > 0
                : false;
            if (isValid === false) {
                this.logger.debug('Invoked validateComponentName in preview');
                reject(
                    new SfdxError(
                        messages.getMessage(
                            'error:invalidInputFlagsDescription'
                        ),
                        'lwc-dev-mobile',
                        Preview.examples
                    )
                );
            } else {
                resolve();
            }
        });
    }

    public launchPreview(): Promise<boolean> {
        let promise = Promise.resolve(false);
        if (CommandLineUtils.platformFlagIsIOS(this.flags.platform)) {
            promise = this.launchIOS();
        } else if (
            CommandLineUtils.platformFlagIsAndroid(this.flags.platform)
        ) {
            promise = this.launchAndroid();
        }
        return promise;
    }

    public launchIOS(): Promise<boolean> {
        const simName = CommandLineUtils.resolveFlag(
            this.flags.target,
            iOSConfig.defaultSimulatorName
        );

        const targetApp = CommandLineUtils.resolveFlag(
            this.flags.targetapp,
            PreviewUtils.BROWSER_TARGET_APP
        );

        const targetAppArguments = CommandLineUtils.resolveFlag(
            this.flags.targetapparguments,
            ''
        );

        const projectDir = CommandLineUtils.resolveFlag(
            this.flags.projectdir,
            __dirname
        );

        const componentName = this.flags.componentname;

        const launcher = new IOSLauncher(simName);

        return launcher.launchNativeBrowserOrApp(
            componentName,
            projectDir,
            targetApp,
            targetAppArguments
        );
    }

    public launchAndroid(): Promise<boolean> {
        const emulatorName = CommandLineUtils.resolveFlag(
            this.flags.target,
            androidConfig.defaultEmulatorName
        );

        const targetApp = CommandLineUtils.resolveFlag(
            this.flags.targetapp,
            PreviewUtils.BROWSER_TARGET_APP
        );

        const targetAppArguments = CommandLineUtils.resolveFlag(
            this.flags.targetapparguments,
            ''
        );

        const projectDir = CommandLineUtils.resolveFlag(
            this.flags.projectdir,
            __dirname
        );

        const componentName = this.flags.componentname;

        const launcher = new AndroidLauncher(emulatorName);

        return launcher.launchNativeBrowserOrApp(
            componentName,
            projectDir,
            targetApp,
            targetAppArguments
        );
    }

    protected async init(): Promise<void> {
        await super.init();
        const logger = await Logger.child('mobile:preview', {});
        this.logger = logger;
    }
}
