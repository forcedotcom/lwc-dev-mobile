/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
export class JsonUtils {
    public static getKeyValueIgnoringKeyCase(json: any, key: string): any {
        const newKey =
            Object.keys(json).find(
                (k) => k.toLowerCase() === key.toLowerCase()
            ) || key;
        return json[newKey];
    }
}
