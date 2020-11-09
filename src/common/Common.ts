/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
export class MapUtils {
    public static filter<K, V>(
        map: Map<K, V>,
        predicate: (k: K, v: V) => boolean
    ) {
        const aMap = new Map<K, V>();
        if (map == null) {
            return aMap;
        }
        const entries = Array.from(map.entries());
        for (const [key, value] of entries) {
            if (predicate(key, value) === true) {
                aMap.set(key, value);
            }
        }
        return aMap;
    }
}

// tslint:disable-next-line: max-classes-per-file
export class SetUtils {
    public static filter<V>(set: Set<V>, predicate: (v: V) => boolean) {
        const aSet = new Set<V>();
        if (set == null) {
            return aSet;
        }
        const entries = Array.from(set.entries());
        for (const [value] of entries) {
            if (predicate(value) === true) {
                aSet.add(value);
            }
        }
        return aSet;
    }
}

// tslint:disable-next-line: max-classes-per-file
export class CommandLineUtils {
    public static IOS_FLAG = 'ios';
    public static ANDROID_FLAG = 'android';

    public static platformFlagIsIOS(input: string): boolean {
        if (input) {
            return input.toLowerCase() === CommandLineUtils.IOS_FLAG;
        }
        return false;
    }

    public static platformFlagIsAndroid(input: string): boolean {
        if (input) {
            return input.toLowerCase() === CommandLineUtils.ANDROID_FLAG;
        }
        return false;
    }

    public static platformFlagIsValid(platformFlag: string) {
        return (
            CommandLineUtils.platformFlagIsIOS(platformFlag) ||
            CommandLineUtils.platformFlagIsAndroid(platformFlag)
        );
    }

    public static resolveFlag(flag: any, defaultValue: string): string {
        const resolvedFlag = flag as string;
        if (resolvedFlag && resolvedFlag.length > 0) {
            return resolvedFlag;
        } else {
            return defaultValue;
        }
    }
}

// tslint:disable-next-line: max-classes-per-file
export class Version {
    public readonly major: number;
    public readonly minor: number;
    public readonly patch: number;

    constructor(from: string) {
        // support version strings using - or . as separators (e.g 13-0-4 and 13.0.4)
        const input = from.toLowerCase().replace(/-/gi, '.').split('.');
        this.major = input.length >= 1 ? Number.parseInt(input[0], 10) : 0;
        this.minor = input.length >= 2 ? Number.parseInt(input[1], 10) : 0;
        this.patch = input.length >= 3 ? Number.parseInt(input[2], 10) : 0;
    }

    public sameOrNewer(inputVersion: Version): boolean {
        // sanity check
        if (
            Number.isNaN(this.major) ||
            Number.isNaN(this.minor) ||
            Number.isNaN(this.patch) ||
            Number.isNaN(inputVersion.major) ||
            Number.isNaN(inputVersion.minor) ||
            Number.isNaN(inputVersion.patch)
        ) {
            return false;
        }

        // version check
        if (
            this.major < inputVersion.major ||
            this.minor < inputVersion.minor ||
            this.patch < inputVersion.patch
        ) {
            return false;
        }

        return true;
    }
}
