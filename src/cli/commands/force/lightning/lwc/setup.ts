#!/usr/bin/env ts-node
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, Logger } from '@salesforce/core';

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

    protected static flagsConfig = {
        // flag with a value (-n, --name=VALUE)
        platform: flags.string({
            char: 'p',
            description: messages.getMessage('platformFlagDescription')
        })
    };

    public async init(): Promise<void>  {
        const logger = await Logger.child('mobile:setup', {});
        this.logger = logger;
        return  Promise.resolve();
    }

    public async run(): Promise<any> {
        this.logger.info('Setup Command called');
        this.validatePlatformValue(this.flags.platform);
        return  Promise.resolve();
    }

    public validatePlatformValue(platform: string): boolean {
        //stub
        return true;
    }

}
