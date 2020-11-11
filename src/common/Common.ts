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
    public static from(input: string): Version {
        const acceptedRange = /[0-9\-\.]+/g;
        const original = input.trim().toLowerCase();
        const invalidChars = original.replace(acceptedRange, '');
        if (invalidChars.length > 0) {
            throw new Error(`Invalid version string: ${input}`);
        }

        // support version strings using - or . as separators (e.g 13-0-4 and 13.0.4)
        const parts = original.replace(/-/gi, '.').split('.');
        const major = parts.length >= 1 ? Number.parseInt(parts[0], 10) : 0;
        const minor = parts.length >= 2 ? Number.parseInt(parts[1], 10) : 0;
        const patch = parts.length >= 3 ? Number.parseInt(parts[2], 10) : 0;

        // this shouldn't really happen now, but just in case
        if (Number.isNaN(major) || Number.isNaN(minor) || Number.isNaN(patch)) {
            throw new Error(`Invalid version string: ${input}`);
        }

        return new Version(major, minor, patch);
    }

    public readonly major: number;
    public readonly minor: number;
    public readonly patch: number;

    constructor(major: number, minor: number, patch: number) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }

    public sameOrNewer(inputVersion: Version): boolean {
        return this.compare(inputVersion) > -1;
    }

    public compare(another: Version): number {
        const v1 = this.major * 100 + this.minor * 10 + this.patch;
        const v2 = another.major * 100 + another.minor * 10 + another.patch;

        if (v1 === v2) {
            return 0;
        } else if (v1 < v2) {
            return -1;
        } else {
            return 1;
        }
    }
}
