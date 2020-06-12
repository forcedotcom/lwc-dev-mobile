/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

export class IOSSimulatorDevice {
    name: string;
    udid: string;
    state: string;
    runtimeId: string;
    isAvailable: boolean;

    constructor(
        name: string,
        udid: string,
        state: string,
        runtimeId: string,
        isAvailable: boolean
    ) {
        const runtime: string = runtimeId
            .replace('com.apple.CoreSimulator.SimRuntime.', '') // com.apple.CoreSimulator.SimRuntime.iOS-13-3-2 --> iOS-13-3-2
            .replace('-', ' ') // iOS-13-3-2 --> iOS 13-3-2
            .replace(/-/gi, '.'); // iOS 13-3-2 --> iOS 13.3.2

        this.name = name;
        this.udid = udid;
        this.state = state;
        this.runtimeId = runtime;
        this.isAvailable = isAvailable;
    }

    static parseJSONString(
        jsonString: string,
        supportedRuntimes: string[]
    ): Array<IOSSimulatorDevice> {
        const DEVICES_KEY = 'devices';
        const runtimeMatchRegex = new RegExp(
            `\.SimRuntime\.(${supportedRuntimes.join('|')})`
        );

        let simDevices: Array<IOSSimulatorDevice> = [];

        const devicesJSON: any = JSON.parse(jsonString);
        const runtimeDevices: any[] = devicesJSON[DEVICES_KEY] || [];
        let runtimes: any[] = Object.keys(runtimeDevices).filter((key) => {
            return key && key.match(runtimeMatchRegex);
        });
        runtimes = runtimes.sort().reverse();

        for (const runtimeIdentifier of runtimes) {
            const devices = runtimeDevices[runtimeIdentifier];
            for (const device of devices) {
                let sim = new IOSSimulatorDevice(
                    device['name'],
                    device['udid'],
                    device['state'],
                    runtimeIdentifier,
                    device['isAvailable']
                );

                simDevices.push(sim);
            }
        }

        return simDevices;
    }
}
