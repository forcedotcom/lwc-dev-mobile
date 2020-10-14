/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
export interface PerformanceMarker {
    endMarkName: string;
    name: string;
    startMarkName: string;
}

export class PerformanceMarkers {
    public static FETCH_DEVICES_MARKER_KEY: string = 'FetchDevicesMarker';
    public static REQUIREMENTS_MARKER_KEY: string = 'RequirementsMarker';

    public static getByName(markerKey: string): PerformanceMarker | undefined {
        return PerformanceMarkers.markerMap.get(markerKey);
    }

    private static markerMap: Map<string, PerformanceMarker> = new Map([
        [
            PerformanceMarkers.FETCH_DEVICES_MARKER_KEY,
            {
                endMarkName: 'EndFetchDevices',
                name: 'FetchDevices',
                startMarkName: 'StartFetchDevices'
            }
        ],
        [
            PerformanceMarkers.REQUIREMENTS_MARKER_KEY,
            {
                endMarkName: 'EndRequirement',
                name: 'SetupRequirements',
                startMarkName: 'StartRequirement'
            }
        ]
    ]);
}
