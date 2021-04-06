/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { flags, FlagsConfig } from '@salesforce/command';
import { Logger, Messages } from '@salesforce/core';
import { Setup } from '@salesforce/lwc-dev-mobile-core/lib/cli/commands/force/lightning/local/setup';
import { AndroidUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/AndroidUtils';
import { CommandLineUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/Common';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { IOSUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/IOSUtils';
import { PerformanceMarkers } from '@salesforce/lwc-dev-mobile-core/lib/common/PerformanceMarkers';
import {
    CommandRequirements,
    RequirementProcessor
} from '@salesforce/lwc-dev-mobile-core/lib/common/Requirements';
import chalk from 'chalk';
import cli from 'cli-ux';
import { performance, PerformanceObserver } from 'perf_hooks';
import { getPlatformSetupRequirements } from '../../setupRequirementsUtil';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages(
    '@salesforce/lwc-dev-mobile',
    'device-list'
);

export class List extends Setup {
    public static description = messages.getMessage('commandDescription');

    public static readonly flagsConfig: FlagsConfig = {
        platform: flags.string({
            char: 'p',
            description: messages.getMessage('platformFlagDescription'),
            longDescription: messages.getMessage('platformFlagDescription'),
            required: true
        })
    };

    public examples = [
        `sfdx force:lightning:local:device:list -p iOS`,
        `sfdx force:lightning:local:device:list -p Android`
    ];

    private perfMarker = PerformanceMarkers.getByName(
        PerformanceMarkers.FETCH_DEVICES_MARKER_KEY
    )!;

    public async run(): Promise<any> {
        await this.init(); // ensure init first

        this.logger.info(
            `Device List command invoked for ${this.flags.platform}`
        );

        return this.validateInputParameters() // validate input
            .then(() => {
                return RequirementProcessor.execute(this.commandRequirements);
            })
            .then(() =>
                CommandLineUtils.platformFlagIsIOS(this.flags.platform)
                    ? this.iOSDeviceList()
                    : this.androidDeviceList()
            );
    }

    protected async init(): Promise<void> {
        if (this.logger) {
            // already initialized
            return Promise.resolve();
        }

        return super
            .init()
            .then(() => Logger.child('force:lightning:local:device:list', {}))
            .then((logger) => {
                this.logger = logger;
                return Promise.resolve();
            });
    }

    private _requirements: CommandRequirements = {};
    public get commandRequirements(): CommandRequirements {
        if (Object.keys(this._requirements).length === 0) {
            const commandDict: CommandRequirements = {};
            commandDict.setup = getPlatformSetupRequirements(
                this.logger,
                this.flags.platform,
                this.flags.apilevel
            );
            this._requirements = commandDict;
        }
        return this._requirements;
    }

    private async iOSDeviceList(): Promise<any> {
        CommonUtils.startCliAction(
            messages.getMessage('deviceListAction'),
            messages.getMessage('deviceListStatus')
        );
        performance.mark(this.perfMarker.startMarkName);
        const result = await IOSUtils.getSupportedSimulators();
        performance.mark(this.perfMarker.endMarkName);
        CommonUtils.stopCliAction();
        this.showDeviceList(result);
        return Promise.resolve(result);
    }

    private async androidDeviceList(): Promise<any> {
        CommonUtils.startCliAction(
            messages.getMessage('deviceListAction'),
            messages.getMessage('deviceListStatus')
        );
        performance.mark(this.perfMarker.startMarkName);
        const result = await AndroidUtils.fetchEmulators();
        performance.mark(this.perfMarker.endMarkName);
        CommonUtils.stopCliAction();
        this.showDeviceList(result);
        return Promise.resolve(result);
    }

    private showDeviceList(list: any[]) {
        let duration: number = 0;

        const obs = new PerformanceObserver((items, observer) => {
            duration = items.getEntries()[0].duration / 1000;
            performance.clearMarks();
            observer.disconnect();
        });
        obs.observe({ entryTypes: ['measure'] });

        performance.measure(
            this.perfMarker.name,
            this.perfMarker.startMarkName,
            this.perfMarker.endMarkName
        );

        const message = `DeviceList (${duration.toFixed(3)} sec)`;
        const tree = cli.tree();
        tree.insert(message);
        const rootNode = tree.nodes[message];
        list.forEach((item) => {
            rootNode.insert(chalk.bold.green(item));
        });
        tree.display();
    }
}
