/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import {
    AndroidEnvironmentRequirements,
    AndroidUtils,
    BaseCommand,
    CommandLineUtils,
    CommandRequirements,
    CommonUtils,
    FlagsConfigType,
    IOSEnvironmentRequirements,
    IOSUtils,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core';
import util from 'util';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'device-start'
);

const LWC_DEV_MOBILE = 'lwc-dev-mobile';

export class Start extends BaseCommand {
    protected _commandName = 'force:lightning:local:device:start';

    public static readonly description =
        messages.getMessage('commandDescription');

    public static readonly examples = [
        `sfdx force:lightning:local:device:start -p iOS -t MySimulator`,
        `sfdx force:lightning:local:device:create -p Android -t MyEmulator -w`
    ];

    public static readonly flags = {
        ...CommandLineUtils.createFlag(FlagsConfigType.Json, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.LogLevel, false),
        ...CommandLineUtils.createFlag(FlagsConfigType.Platform, true),
        target: Flags.string({
            char: 't',
            description: messages.getMessage('targetFlagDescription'),
            required: true,
            validate: (target: string) => {
                return target && target.trim().length > 0;
            }
        }),
        writablesystem: Flags.boolean({
            char: 'w',
            description: messages.getMessage('writablesystemFlagDescription'),
            required: false,
            default: false
        })
    };

    public async run(): Promise<void> {
        this.logger.info(
            `Device Start command invoked for ${this.flagValues.platform}`
        );

        return RequirementProcessor.execute(this.commandRequirements).then(
            () => {
                // execute the create command
                this.logger.info(
                    'Setup requirements met, continuing with Device Start'
                );
                return this.executeDeviceStart();
            }
        );
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

        this._commandRequirements = requirements;
    }

    private async executeDeviceStart(): Promise<void> {
        const isAndroid = CommandLineUtils.platformFlagIsAndroid(
            this.flagValues.platform
        );
        return isAndroid
            ? this.executeAndroidDeviceStart()
            : this.executeIOSDeviceStart();
    }

    private async executeAndroidDeviceStart(): Promise<void> {
        return AndroidUtils.hasEmulator(this.flagValues.target)
            .then((hasEmulator) => {
                if (!hasEmulator) {
                    return Promise.reject(
                        new SfError(
                            util.format(
                                messages.getMessage(
                                    'error:targetDoesNotExistDescription'
                                ),
                                this.flagValues.target
                            ),
                            LWC_DEV_MOBILE
                        )
                    );
                } else {
                    CommonUtils.startCliAction(
                        messages.getMessage('deviceStartAction'),
                        util.format(
                            messages.getMessage('deviceStartStatus'),
                            this.flagValues.target
                        )
                    );
                    return AndroidUtils.startEmulator(
                        this.flagValues.target,
                        this.flagValues.writablesystem,
                        false
                    );
                }
            })
            .then((actualPort) => {
                CommonUtils.stopCliAction(
                    util.format(
                        messages.getMessage('deviceStartSuccessStatusAndroid'),
                        this.flagValues.target,
                        actualPort,
                        this.flagValues.writablesystem
                    )
                );
                return Promise.resolve();
            });
    }

    private async executeIOSDeviceStart(): Promise<void> {
        let simDeviceName = '';
        let simDeviceUDID = '';
        return IOSUtils.getSimulator(this.flagValues.target)
            .then((simDevice) => {
                if (simDevice === null) {
                    return Promise.reject(
                        new SfError(
                            util.format(
                                messages.getMessage(
                                    'error:targetDoesNotExistDescription'
                                ),
                                this.flagValues.target
                            ),
                            LWC_DEV_MOBILE
                        )
                    );
                } else {
                    simDeviceName = simDevice.name;
                    simDeviceUDID = simDevice.udid;
                    return Promise.resolve();
                }
            })
            .then(() => {
                CommonUtils.startCliAction(
                    messages.getMessage('deviceStartAction'),
                    util.format(
                        messages.getMessage('deviceStartStatus'),
                        `${simDeviceName} (${simDeviceUDID})`
                    )
                );
                return IOSUtils.bootDevice(simDeviceUDID, false);
            })
            .then(() => IOSUtils.launchSimulatorApp())
            .then(() => {
                CommonUtils.stopCliAction(
                    util.format(
                        messages.getMessage('deviceStartSuccessStatusIOS'),
                        `${simDeviceName} (${simDeviceUDID})`
                    )
                );
                return Promise.resolve();
            });
    }
}
