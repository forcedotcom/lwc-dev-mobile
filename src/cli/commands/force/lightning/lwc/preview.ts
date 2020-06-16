/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { flags, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { AndroidLauncher } from '../../../../../common/AndroidLauncher';
import { CommandLineUtils } from '../../../../../common/Common';
import { IOSLauncher } from '../../../../../common/IOSLauncher';
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
        target: flags.string({
            char: 't',
            description: messages.getMessage('targetFlagDescription'),
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

        super
            .run() // run setup first
            .then((result) => {
                const isValid = this.validateComponentNameValue(
                    this.flags.componentname
                );
                if (!isValid) {
                    return Promise.reject(
                        new SfdxError(
                            messages.getMessage(
                                'error:invalidInputFlagsDescription'
                            ),
                            'lwc-dev-mobile',
                            Preview.examples
                        )
                    );
                } else {
                    this.logger.info(
                        'Setup requirements met, continuing with preview'
                    );
                    return this.launchPreview();
                }
            })
            .catch((error) => {
                this.logger.warn(
                    `Preview failed for ${platform}. Setup requirements have not been met.`
                );
                return Promise.reject(error);
            });

        /*return new Promise<any>((resolve, reject) => {
            super
                .run() // run setup first
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
                    reject(error);
                });
        });*/
    }

    public validateComponentNameValue(compName: string): boolean {
        this.logger.debug('Invoked validateComponentName in preview');
        return compName ? compName.trim().length > 0 : false;
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
        const simName = this.flags.target
            ? this.flags.target
            : iOSConfig.defaultSimulatorName;
        const launcher = new IOSLauncher(simName);
        const compPath = this.prefixRouteIfNeeded(this.flags.componentname);
        return launcher.launchNativeBrowser(
            `http://localhost:3333/lwc/preview/${compPath}`
        );
    }

    public launchAndroid(): Promise<boolean> {
        const emulatorName = this.flags.target
            ? this.flags.target
            : androidConfig.defaultEmulatorName;
        const launcher = new AndroidLauncher(emulatorName);
        const compPath = this.prefixRouteIfNeeded(this.flags.componentname);
        return launcher.launchNativeBrowser(
            `http://10.0.2.2:3333/lwc/preview/${compPath}`
        );
    }

    protected async init(): Promise<void> {
        await super.init();
        const logger = await Logger.child('mobile:preview', {});
        this.logger = logger;
    }

    private prefixRouteIfNeeded(compName: string): string {
        if (compName.toLowerCase().startsWith('c/')) {
            return compName;
        }
        return 'c/' + compName;
    }
}
