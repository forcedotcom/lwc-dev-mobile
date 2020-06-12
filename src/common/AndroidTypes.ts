/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import os from 'os';

export class AndroidPackage {
    get platformAPI(): string {
        const platformApi = '';
        if (
            this.path.startsWith('platforms') ||
            this.path.startsWith('system-images')
        ) {
            const tokens: string[] = this.path.split(';');
            if (tokens.length > 1) {
                return tokens[1];
            }
        }
        return platformApi;
    }

    get platformEmulatorImage(): string {
        if (this.path.startsWith('system-images')) {
            const tokens: string[] = this.path.split(';');
            if (tokens.length > 2) {
                return tokens[2];
            }
        }
        return '';
    }

    get abi(): string {
        if (this.path.startsWith('system-images')) {
            const tokens: string[] = this.path.split(';');
            if (tokens.length > 3) {
                return tokens[3];
            }
        }
        return '';
    }

    public static parseRawPackagesString(
        rawStringInput: string
    ): Map<string, AndroidPackage> {
        const startIndx = rawStringInput
            .toLowerCase()
            .indexOf('installed packages:', 0);
        const endIndx = rawStringInput
            .toLowerCase()
            .indexOf('available packages:', startIndx);
        const rawString = rawStringInput.substring(startIndx, endIndx);
        const packages: Map<string, AndroidPackage> = new Map();

        // Installed packages:
        const lines = rawString.split('\n');
        if (lines.length > 0) {
            let i = 0;
            for (; i < lines.length; i++) {
                if (lines[i].toLowerCase().indexOf('path') > -1) {
                    i = i + 2; // skip ---- and header
                    break; // start of installed packages
                }
            }

            for (; i < lines.length; i++) {
                const rawStringSplits: string[] = lines[i].split('|');
                if (rawStringSplits.length > 1) {
                    const path = rawStringSplits[0].trim();
                    const version = rawStringSplits[1].trim();
                    const description = rawStringSplits[2].trim();
                    let locationOfPack = '';

                    if (rawStringSplits.length > 2) {
                        locationOfPack = rawStringSplits[3].trim();
                    }
                    packages.set(
                        path,
                        new AndroidPackage(
                            path,
                            version,
                            description,
                            locationOfPack
                        )
                    );
                }

                if (lines[i].indexOf('Available Packages:') > -1) {
                    break;
                }
            }
        }
        return packages;
    }
    public path: string;
    public version: string;
    public description: string;
    public location: string;

    constructor(
        path: string,
        version: string,
        description: string,
        location: string
    ) {
        this.path = path;
        this.version = version;
        this.description = description;
        this.location = location;
    }
}

// tslint:disable-next-line: max-classes-per-file
export class AndroidVirtualDevice {
    public static parseRawString(rawString: string): AndroidVirtualDevice[] {
        const avds = AndroidVirtualDevice.getAvdDefinitions(rawString);
        const devices: AndroidVirtualDevice[] = [];

        for (const avd of avds) {
            const name = AndroidVirtualDevice.getValueForKey(avd, 'name:');
            const device = AndroidVirtualDevice.getValueForKey(avd, 'device:');
            const path = AndroidVirtualDevice.getValueForKey(avd, 'path:');
            const target = AndroidVirtualDevice.getValueForKey(avd, 'target:');
            const api = AndroidVirtualDevice.getValueForKey(avd, 'based on:');

            if (
                name !== undefined &&
                device !== undefined &&
                path !== undefined &&
                target !== undefined &&
                api !== undefined
            ) {
                devices.push(
                    new AndroidVirtualDevice(name, device, path, target, api)
                );
            }
        }

        return devices;
    }

    /*
       When we run 'avdmanager list avd' it returns the results (along with any erros)
       as raw string in the following format:

        Available Android Virtual Devices:
            <device definition>
        ---------
            <device definition>
        ---------
            <device definition>

        The following Android Virtual Devices could not be loaded:
            <device error info>
        ---------
            <device error info>
        ---------
            <device error info>

       In the following method, we parse the raw string result and break it up into
       <device definition> chunks, and skip the <device error info> sections
    */
    private static getAvdDefinitions(rawString: string): string[][] {
        // get rid of the error sections (if any)
        const errIdx = rawString.indexOf(`${os.EOL}${os.EOL}`);
        const cleanedRawString =
            errIdx > 0 ? rawString.substring(0, errIdx - 1) : rawString;

        const lowerCasedRawString = cleanedRawString.toLowerCase();
        let position: number | undefined = 0;
        const results: string[][] = [];

        // now parse the device definition sections
        while (position !== undefined) {
            const startIdx = lowerCasedRawString.indexOf('name:', position);
            let endIdx: number | undefined;

            if (startIdx > -1) {
                const sepIdx = lowerCasedRawString.indexOf('---', startIdx);
                endIdx = sepIdx > -1 ? sepIdx - 1 : undefined;

                let chunck = cleanedRawString.substring(startIdx, endIdx);
                chunck = chunck.replace('Tag/ABI:', `${os.EOL}Tag/ABI:`); // put ABI info on a line of its own
                const split = chunck.split(os.EOL);
                results.push(split);
            }

            position = endIdx;
        }

        return results;
    }

    private static getValueForKey(
        array: string[],
        key: string
    ): string | undefined {
        for (const item of array) {
            const trimmed = item.trim();

            if (trimmed.toLowerCase().startsWith(key.toLowerCase())) {
                const value = trimmed.substring(key.length + 1).trim(); // key.length + 1 to skip over ':' separator
                return value;
            }
        }
        return undefined;
    }

    public name: string;
    public displayName: string;
    public deviceName: string;
    public path: string;
    public target: string;
    public api: string;

    constructor(
        name: string,
        deviceName: string,
        path: string,
        target: string,
        api: string
    ) {
        this.name = name;
        this.displayName = name.replace(/_/gi, ' ').trim(); // eg. Pixel_XL --> Pixel XL
        this.deviceName = deviceName.replace(/\([^\(]*\)/, '').trim(); // eg. Nexus 5X (Google) --> Nexus 5X
        this.path = path.trim();
        this.target = target.replace(/\([^\(]*\)/, '').trim(); // eg. Google APIs (Google Inc.) --> Google APIs
        this.api = api.replace('Android', '').trim(); // eg. Android API 29 --> API 29
    }
}
