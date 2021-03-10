/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags, FlagsConfig } from '@salesforce/command';
import { Logger, Messages, SfdxError } from '@salesforce/core';
import { Setup } from '@salesforce/lwc-dev-mobile-core/lib/cli/commands/force/lightning/local/setup';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import { CommandLineUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
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
const DEVICE_START = 'Device Start';

export class Start extends Setup {
    public static description = messages.getMessage('commandDescription');

    public static readonly flagsConfig: FlagsConfig = {
        platform: flags.string({
            char: 'p',
            description: messages.getMessage('platformFlagDescription'),
            required: true
        }),
        target: flags.string({
            char: 't',
            description: messages.getMessage('targetFlagDescription'),
            required: true
        }),
        writablesystem: flags.boolean({
            char: 'w',
            description: messages.getMessage('writablesystemFlagDescription'),
            required: false,
            default: false
        })
    };

    public examples = [
        `sfdx force:lightning:local:device:start -p iOS -t MySimulator`,
        `sfdx force:lightning:local:device:create -p Android -t MyEmulator -w`
    ];

    private platform = '';
    private target = '';
    private writableSystem = false;

    public async run(direct: boolean = false): Promise<any> {
        if (direct) {
            await this.init(); // ensure init first
        }

        this.logger.info(
            `Device Start command invoked for ${this.flags.platform}`
        );

        return super
            .run(direct) // validate input parameters + setup requirements
            .then(() => {
                // execute the create command
                this.logger.info(
                    'Setup requirements met, continuing with Device Start'
                );
                return this.executeDeviceStart();
            });
    }

    protected async validateInputParameters(): Promise<void> {
        return super.validateInputParameters().then(() => {
            const target = this.flags.target as string;
            const writableSystem = this.flags.writablesystem as boolean;

            // ensure that thetarget flag value is valid
            if (target == null || target.trim() === '') {
                return Promise.reject(
                    new SfdxError(
                        messages.getMessage(
                            'error:invalidTargetFlagsDescription'
                        ),
                        LWC_DEV_MOBILE,
                        this.examples
                    )
                );
            }

            this.platform = this.flags.platform;
            this.target = target;
            this.writableSystem = writableSystem;
            return Promise.resolve();
        });
    }

    protected async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

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
                        DEVICE_START,
                        `starting device ${this.target}`
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
                    `device ${this.target} started on port ${actualPort}, writable system = ${this.writableSystem}`
                );
                return Promise.resolve();
            });
    }

    private async executeIOSDeviceStart(): Promise<void> {
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
                    simDeviceUDID = simDevice.udid;
                    return Promise.resolve();
                }
            })
            .then(() => {
                CommonUtils.startCliAction(
                    DEVICE_START,
                    `starting device ${this.target} (${simDeviceUDID})`
                );
                return IOSUtils.bootDevice(simDeviceUDID, false);
            })
            .then(() => IOSUtils.launchSimulatorApp())
            .then(() => {
                CommonUtils.stopCliAction(
                    `device ${this.target} (${simDeviceUDID}) started.`
                );
                return Promise.resolve();
            });
    }
}
