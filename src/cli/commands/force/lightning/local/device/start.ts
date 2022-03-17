/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { AndroidEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidEnvironmentRequirements';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import {
    CommandLineUtils,
    FlagsConfigType
} from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSEnvironmentRequirements } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSEnvironmentRequirements';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import {
    CommandRequirements,
    HasRequirements,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
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

export class Start extends SfdxCommand implements HasRequirements {
    public static description = messages.getMessage('commandDescription');

    public static examples = [
        `sfdx force:lightning:local:device:start -p iOS -t MySimulator`,
        `sfdx force:lightning:local:device:create -p Android -t MyEmulator -w`
    ];

    public static readonly flagsConfig: FlagsConfig = {
        target: flags.string({
            char: 't',
            description: messages.getMessage('targetFlagDescription'),
            required: true,
            validate: (target) => {
                if (target && target.trim().length > 0) {
                    return true;
                } else {
                    throw new SfdxError(
                        messages.getMessage(
                            'error:invalidTargetFlagsDescription'
                        ),
                        LWC_DEV_MOBILE,
                        Start.examples
                    );
                }
            }
        }),
        writablesystem: flags.boolean({
            char: 'w',
            description: messages.getMessage('writablesystemFlagDescription'),
            required: false,
            default: false
        }),
        ...CommandLineUtils.createFlagConfig(FlagsConfigType.Platform, true)
    };

    private platform = '';
    private target = '';
    private writableSystem = false;

    public async run(): Promise<any> {
        this.logger.info(
            `Device Start command invoked for ${this.flags.platform}`
        );

        this.platform = this.flags.platform;
        this.target = this.flags.target;
        this.writableSystem = this.flags.writablesystem;

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

    private _requirements: CommandRequirements = {};
    public get commandRequirements(): CommandRequirements {
        if (Object.keys(this._requirements).length === 0) {
            const requirements: CommandRequirements = {};
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
        return this._requirements;
    }

    public async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

        CommandLineUtils.flagFailureActionMessages = Start.examples;
        return super
            .init()
            .then(() => Logger.child('force:lightning:local:device:start', {}))
            .then((logger) => {
                this.logger = logger;
                return Promise.resolve();
            });
    }

    private async executeDeviceStart(): Promise<any> {
        const isAndroid = CommandLineUtils.platformFlagIsAndroid(this.platform);
        return isAndroid
            ? this.executeAndroidDeviceStart()
            : this.executeIOSDeviceStart();
    }

    private async executeAndroidDeviceStart(): Promise<void> {
        return AndroidUtils.hasEmulator(this.target)
            .then((hasEmulator) => {
                if (!hasEmulator) {
                    return Promise.reject(
                        new SfdxError(
                            util.format(
                                messages.getMessage(
                                    'error:targetDoesNotExistDescription'
                                ),
                                this.target
                            ),
                            LWC_DEV_MOBILE
                        )
                    );
                } else {
                    CommonUtils.startCliAction(
                        messages.getMessage('deviceStartAction'),
                        util.format(
                            messages.getMessage('deviceStartStatus'),
                            this.target
                        )
                    );
                    return AndroidUtils.startEmulator(
                        this.target,
                        this.writableSystem,
                        false
                    );
                }
            })
            .then((actualPort) => {
                CommonUtils.stopCliAction(
                    util.format(
                        messages.getMessage('deviceStartSuccessStatusAndroid'),
                        this.target,
                        actualPort,
                        this.writableSystem
                    )
                );
                return Promise.resolve();
            });
    }

    private async executeIOSDeviceStart(): Promise<void> {
        let simDeviceName = '';
        let simDeviceUDID = '';
        return IOSUtils.getSimulator(this.target)
            .then((simDevice) => {
                if (simDevice === null) {
                    return Promise.reject(
                        new SfdxError(
                            util.format(
                                messages.getMessage(
                                    'error:targetDoesNotExistDescription'
                                ),
                                this.target
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
