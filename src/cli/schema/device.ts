/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { z } from 'zod';

// Define the schema for the nested 'osVersion' object
const OsVersionSchema = z.object({
    major: z.number(),
    minor: z.number(),
    patch: z.number()
});

export const DeviceSchema = z.object({
    // Required fields present in boto ios and android devices
    id: z.string().describe('The ID of the device'),
    name: z.string().describe('The name of the device'),
    deviceType: z.string().describe('The type of the device'),
    osType: z.string().describe('The type of the operating system'),
    osVersion: z.union([z.string(), OsVersionSchema]).describe('The version of the operating system'),

    // fields for Android devices
    isPlayStore: z.boolean().optional().describe('Whether the android device has google Play Store enabled'),
    port: z.number().optional().describe('The port number the android device is running on')
});

// Define the main schema for the device
export const DeviceListSchema = z.array(DeviceSchema);

export const DeviceOperationResultSchema = z.object({
    device: DeviceSchema.describe('The device that was operated on'),
    success: z.boolean().describe('Whether the operation was successful'),
    message: z.string().optional().describe('The message from the operation')
});

export type DeviceOperationResultType = z.infer<typeof DeviceOperationResultSchema>;
