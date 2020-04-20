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
        `$ sfdx force:lightning:lwc:preview -p iOS -t LWCSim2 -f http://localhost:3333`,
        `$ sfdx force:lightning:lwc:preview -p Android -t LWCEmu2 -f http://localhost:3333`
    ];

    public static args = [{ name: 'file' }];

    protected static flagsConfig = {
        // flag with a value (-n, --name=VALUE)
        platform: flags.string({
            char: 'p',
            description: messages.getMessage('platformFlagDescription')
        }),
        path: flags.string({
            char: 'd',
            description: messages.getMessage('pathFlagDescription')
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
        this.logger.info('Preview Command called');
        await Setup.run(['-p', this.flags.platform]);
        this.logger.info('Preview Command ended');
        this.validateComponentPathValue(this.flags.path);
        if (CommandLineUtils.platformFlagIsIOS(this.flags.platform)) {
            this.launchIOS();
        } else if (
            CommandLineUtils.platformFlagIsAndroid(this.flags.platform)
        ) {
            this.launchAndroid();
        }
    }

    public validateComponentPathValue(path: string): boolean {
        this.logger.debug('Invoked validate validateComponent in preview');
        return path.trim().length > 0;
    }

    public validateTargetValue(target: string): boolean {
        this.logger.debug('Invoked validate validateTargetValue in preview');
        return true;
    }

    public launchIOS(): Promise<boolean> {
        const simName = this.flags.target
            ? this.flags.target
            : iOSConfig.defaultSimulatorName;
        const launcher = new IOSLauncher(simName);
        const compPath = this.flags.path;
        return launcher.launchNativeBrowser(
            `http://localhost:3333/lwc/preview/${compPath}`
        );
    }

    public launchAndroid(): Promise<boolean> {
        const emulatorName = this.flags.target
            ? this.flags.target
            : androidConfig.defaultEmulatorName;
        const launcher = new AndroidLauncher(emulatorName);
        const compPath = this.flags.path;
        return launcher.launchNativeBrowser(
            `http://10.0.2.2:3333/lwc/preview/${compPath}`
        );
    }
}
