#!/usr/bin/env ts-node
import { flags, SfdxCommand, FlagsConfig } from '@salesforce/command';
import { Messages, Logger, LoggerLevel, SfdxError} from '@salesforce/core';
import { BaseSetup } from '../../../../../common/Requirements';
import { CommandLineUtils } from '../../../../../common/Common';
import { IOSEnvironmentSetup} from '../../../../../common/IOSEnvironmentSetup';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/lwc-dev-mobile', 'setup');

export default class Setup extends SfdxCommand {
    
    public static description = messages.getMessage('commandDescription');
    
    public static examples = [
        `$ sfdx force:lightning:lwc:setup -p iOS`,
        `$ sfdx force:lightning:lwc:setup -p Android`
    ];

    public static readonly flagsConfig: FlagsConfig = {
        platform: flags.string({
            char: 'p',
            description: messages.getMessage('platformFlagDescription'),
            longDescription: messages.getMessage('platformFlagDescription'),
            required: true
        })
    }

    public async init(): Promise<void> {
        const logger = await Logger.child('mobile:setup', {});
        this.logger = logger;
        return super.init();
    }

    public async run(): Promise<any> {
        let valid = this.validatePlatformValue(this.flags.platform);
        if (!valid) {
            throw new SfdxError(`${messages.getMessage('error:invalidInputFlagsDescription')}`, 'lwc-dev-mobile', [`${messages.getMessage('remedy:invalidInputFlagsDescription')}`]);
        }
        this.logger.info(`Setup Command called for ${this.flags.platform}`);
        let setup = this.setup();
        return this.executeSetup(setup);
    }

    public executeSetup(setup: BaseSetup): Promise<any> {
        return setup.executeSetup();
    }

    public validatePlatformValue(platform: string): boolean {
        return CommandLineUtils.platformFlagIsIOS(platform);
    }

    protected setup(): BaseSetup  {
        let setup: BaseSetup = new IOSEnvironmentSetup(this.logger);
        return setup;
    }

}
