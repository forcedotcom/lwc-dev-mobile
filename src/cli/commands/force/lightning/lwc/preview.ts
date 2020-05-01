#!/usr/bin/env ts-node
import androidConfig from '../../../../../config/androidconfig.json';
import { AndroidLauncher } from '../../../../../common/AndroidLauncher';
import { CommandLineUtils } from '../../../../../common/Common';
import { flags, SfdxCommand } from '@salesforce/command';
import { IOSLauncher } from '../../../../../common/IOSLauncher';
import iOSConfig from '../../../../../config/iosconfig.json';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import Setup from '../local/setup';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'preview');

export default class Preview extends SfdxCommand {
    public static description = messages.getMessage('commandDescription');

    public static examples = [
        `$ sfdx force:lightning:lwc:preview -p iOS -t LWCSim2 -n HellowWordComponent`,
        `$ sfdx force:lightning:lwc:preview -p Android -t LWCEmu2 -n HellowWordComponent`
    ];

    public static args = [{ name: 'file' }];

    protected static flagsConfig = {
        // flag with a value (-n, --name=VALUE)
        platform: flags.string({
            char: 'p',
            description: messages.getMessage('platformFlagDescription')
        }),
        componentname: flags.string({
            char: 'n',
            description: messages.getMessage('componentnameFlagDescription')
        }),
        target: flags.string({
            char: 't',
            description: messages.getMessage('targetFlagDescription')
        })
    };

    // Comment this out if your command does not require an org username
    protected static requiresUsername = false;

    // Comment this out if your command does not support a hub org username
    protected static supportsDevhubUsername = false;

    // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
    protected static requiresProject = false;

    protected async init(): Promise<void> {
        await super.init();
        const logger = await Logger.child('mobile:preview', {});
        this.logger = logger;
    }

    public async run(): Promise<any> {
        this.logger.info('Preview Command invoked');
        let isValid = this.validateComponentNameValue(this.flags.componentname);
        isValid = isValid && this.validatePlatformValue(this.flags.platform);
        if (!isValid) {
            return Promise.reject(
                new SfdxError(
                    messages.getMessage('error:invalidInputFlagsDescription'),
                    'lwc-dev-mobile',
                    Preview.examples
                )
            );
        }

        let setupResult = await Setup.run(['-p', this.flags.platform]);
        if (!setupResult || !setupResult.hasMetAllRequirements) {
            this.logger.warn(
                `Preview failed for ${this.flags.platform}. Setup requirements have not been met.`
            );
            return Promise.resolve(false);
        }
        this.logger.info('Setup requirements met, continuing with preview');
        return this.launchPreview();
    }

    public validateComponentNameValue(compName: string): boolean {
        this.logger.debug('Invoked validateComponentName in preview');
        return compName ? compName.trim().length > 0 : false;
    }

    public validatePlatformValue(platform: string): boolean {
        return (
            CommandLineUtils.platformFlagIsIOS(platform) ||
            CommandLineUtils.platformFlagIsAndroid(platform)
        );
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

    private prefixRouteIfNeeded(compName: string): string {
        if (compName.toLowerCase().startsWith('c/')) {
            return compName;
        }
        return 'c/' + compName;
    }
}
