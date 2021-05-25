/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { createServer, LwrApp } from 'lwr';
import { LwrGlobalConfig } from '@lwrjs/types';
import {
    DirModuleRecord,
    LwrRoute,
    ServiceEntry
} from '@lwrjs/types/build/config';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { LwrServerUtils } from '../LwrServerUtils';
import path from 'path';
import os from 'os';

const rootComp = 'lwc/helloWorld';
const pathToDefault = '/force-app/main/default';
const componentName = `${pathToDefault}/${rootComp}`;
const projectDir = '/LWC-Mobile-Samples/HelloWorld';
const serverPort = 5678;

describe('LwrServerUtils Tests', () => {
    beforeEach(() => {
        jest.spyOn(LwrServerUtils, 'getNextServerPort').mockImplementation(
            () => serverPort
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('getMergedLwrConfig without a user-provided config file', async () => {
        const config = LwrServerUtils.getMergedLwrConfig(
            componentName,
            projectDir
        );

        verifyDefaultConfig(config);
    });

    test('getMergedLwrConfig with a user-provided config file and no existing properties', async () => {
        jest.spyOn(CommonUtils, 'loadJsonFromFile').mockImplementation(() => {
            const jsonContent = '{}';
            return JSON.parse(jsonContent);
        });

        const config = LwrServerUtils.getMergedLwrConfig(
            componentName,
            projectDir
        );

        verifyDefaultConfig(config);
    });

    test('getMergedLwrConfig with a user-provided config file and existing properties', async () => {
        jest.spyOn(CommonUtils, 'loadJsonFromFile').mockImplementation(() => {
            const jsonContent = `{
                "port": 3456,
                "rootDir": "/path/to/my/rootdir",
                "cacheDir": "/path/to/my/cachedir",
                "lwc": { "modules": [{ "dir": "$rootDir/src/modules" }] },
                "moduleProviders": [
                    "@company/my-module-provider"
                ],
                "routes": [
                    {
                        "id": "example",
                        "path": "/my/path",
                        "rootComponent": "example/app"
                    }
                ]
            }`;
            return JSON.parse(jsonContent);
        });

        const config = LwrServerUtils.getMergedLwrConfig(
            componentName,
            projectDir
        );

        // port must be preserved from the user-provided config file
        expect(config.port).toBe(3456);

        // rootDir must be preserved from the user-provided config file
        expect(config.rootDir).toBe(path.normalize('/path/to/my/rootdir'));

        // cacheDir must be preserved from the user-provided config file
        expect(config.cacheDir).toBe(path.normalize('/path/to/my/cachedir'));

        // LWC module record should be added to the ones from the user-provided config file
        const insertedLwcModuleRecord = (config.lwc &&
            config.lwc.modules[0]) as DirModuleRecord;
        const originalLwcModuleRecord = (config.lwc &&
            config.lwc.modules[1]) as DirModuleRecord;
        expect(insertedLwcModuleRecord.dir).toBe(
            path.normalize(`${projectDir}${pathToDefault}`)
        );
        expect(originalLwcModuleRecord.dir).toBe('$rootDir/src/modules');

        // our custom module provider should be added to the ones from the user-provided config file
        const customModuleProvider = ((config.moduleProviders &&
            config.moduleProviders[0]) as ServiceEntry)[0];
        const originalModuleProvider = (config.moduleProviders &&
            config.moduleProviders[
                config.moduleProviders.length - 1
            ]) as string;
        expect(
            customModuleProvider.endsWith('CustomLwcModuleProvider.js')
        ).toBe(true);
        expect(originalModuleProvider).toBe('@company/my-module-provider');

        // a default route should be added to the ones from the user-provided config file
        const defaultRoute = (config.routes && config.routes[0]) as LwrRoute;
        const originalRoute = (config.routes && config.routes[1]) as LwrRoute;
        expect(defaultRoute.rootComponent).toBe(rootComp);
        expect(defaultRoute.path).toBe('/');
        expect(originalRoute.rootComponent).toBe('example/app');
        expect(originalRoute.path).toBe('/my/path');
    });

    test('getNextServerPort returns an available port', async () => {
        jest.restoreAllMocks();
        jest.spyOn(CommonUtils, 'executeCommandSync').mockImplementation(
            (cmd) => {
                if (cmd.startsWith('wmic') || cmd.startsWith('ps')) {
                    return '1000\n2000'; // simulate 2 processes running with these PIDs
                } else {
                    return `TCP  0.0.0.0:3344  0.0.0.0  LISTENING  4636
                            node  87475 username  35u  IPv6  0x78e419ed04835b59  0t0  TCP  *:3346 (LISTEN)`;
                }
            }
        );
        const port = LwrServerUtils.getNextServerPort();
        expect(port).toBe(3348);
    });

    test('Callback is invoked when server idle timeout is detected', async () => {
        const lwrGlobalConfig: LwrGlobalConfig = {
            rootDir: os.tmpdir(),
            cacheDir: path.join(
                os.tmpdir(),
                '__temporary_cache_to_be_deleted__'
            ),
            lwc: {
                modules: [
                    {
                        dir:
                            '/LWC-Mobile-Samples/HelloWorld/force-app/main/default'
                    }
                ]
            },
            routes: [
                {
                    id: 'lwc/helloWorld',
                    path: '/',
                    rootComponent: 'lwc/helloWorld'
                }
            ]
        };

        const lwrApp = createServer(lwrGlobalConfig);
        lwrApp.listen();

        let callbackInvoked = false;
        LwrServerUtils.setServerIdleTimeout(lwrApp, 100, () => {
            callbackInvoked = true;
        });
        await CommonUtils.delay(500);
        expect(callbackInvoked).toBe(true);
    });

    function verifyDefaultConfig(config: LwrGlobalConfig) {
        // rootDir must be set to project dir
        expect(config.rootDir).toBe(path.normalize(projectDir));

        // cacheDir must be relative to project dir
        expect(config.cacheDir).toBe(
            path.normalize(`${projectDir}/__lwr_cache__`)
        );

        // LWC module record should be set to 2-level-up path
        const lwcModuleRecord = (config.lwc &&
            config.lwc.modules[0]) as DirModuleRecord;
        expect(lwcModuleRecord.dir).toBe(
            path.normalize(`${projectDir}${pathToDefault}`)
        );

        // our custom module provider should be added as the first item in the list of providers
        const customModuleProvider = ((config.moduleProviders &&
            config.moduleProviders[0]) as ServiceEntry)[0];
        expect(
            customModuleProvider.endsWith('CustomLwcModuleProvider.js')
        ).toBe(true);

        // a default route should be added at root level
        const defaultRoute = (config.routes && config.routes[0]) as LwrRoute;
        expect(defaultRoute.rootComponent).toBe(rootComp);
        expect(defaultRoute.path).toBe('/');

        // a server port should be set
        expect(config.port).toBe(serverPort);
    }
});
