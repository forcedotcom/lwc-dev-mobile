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
        expect(config.rootDir).toBe('/path/to/my/rootdir');

        // cacheDir must be preserved from the user-provided config file
        expect(config.cacheDir).toBe('/path/to/my/cachedir');

        // LWC module record should be added to the ones from the user-provided config file
        const insertedLwcModuleRecord = (config.lwc &&
            config.lwc.modules[0]) as DirModuleRecord;
        const originalLwcModuleRecord = (config.lwc &&
            config.lwc.modules[1]) as DirModuleRecord;
        expect(insertedLwcModuleRecord.dir).toBe(
            path.resolve(`${projectDir}${pathToDefault}`)
        );
        expect(originalLwcModuleRecord.dir).toBe('$rootDir/src/modules');

        // our custom module provider should be appended to the list of default providers followed by the ones from the user-provided config file
        const customModuleProvider = ((config.moduleProviders &&
            config.moduleProviders[
                config.moduleProviders.length - 2
            ]) as ServiceEntry)[0];
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
        jest.spyOn(CommonUtils, 'executeCommandSync').mockImplementation(() => {
            return `rapportd  721 username    5u  IPv4 0x11bcbe7c8626bac9      0t0  TCP *:2400 (LISTEN)
                    rapportd  721 username    6u  IPv6 0x11bcbe7c83fc1d39      0t0  TCP *:2500 (LISTEN)
                    nxnode.bi 739 username   15u  IPv6 0x11bcbe7c8494cd39      0t0  TCP [::1]:2600 (LISTEN)
                    nxnode.bi 739 username   16u  IPv4 0x11bcbe7c858da679      0t0  TCP 127.0.0.1:2700 (LISTEN)
                    nxnode.bi 739 username   20u  IPv4 0x11bcbe7c858d9229      0t0  TCP 127.0.0.1:2800 (LISTEN)
                    nxclient  909 username    5u  IPv4 0x11bcbe7c8626cf19      0t0  TCP 127.0.0.1:2900 (LISTEN)
                    TCP    0.0.0.0:1300            0.0.0.0:0              LISTENING       2276
                    TCP    0.0.0.0:1400            0.0.0.0:0              LISTENING       3932
                    TCP    0.0.0.0:1500            0.0.0.0:0              LISTENING       864
                    TCP    127.0.0.1:1800          0.0.0.0:0              LISTENING       11684
                    TCP    127.0.0.1:1900          0.0.0.0:0              LISTENING       12112
                    TCP    127.0.0.1:2000          0.0.0.0:0              LISTENING       12908
                    TCP    192.168.1.163:2100      0.0.0.0:0              LISTENING       4
                    TCP    192.168.148.1:2200      0.0.0.0:0              LISTENING       4
                    TCP    192.168.171.1:2300      0.0.0.0:0              LISTENING       4`;
        });
        const port = LwrServerUtils.getNextServerPort();
        expect(port).toBe(2902);
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
        await CommonUtils.delay(200); // wait for it to shut down
        expect(callbackInvoked).toBe(true);
    });

    test('startLwrServer starts the server and returns a valid port number', async () => {
        const mockConfig: LwrGlobalConfig = {
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

        jest.spyOn(LwrServerUtils, 'getMergedLwrConfig').mockReturnValue(
            mockConfig
        );

        const portString = await LwrServerUtils.startLwrServer(
            '/force-app/main/default/lwc/helloWorld',
            '/LWC-Mobile-Samples/HelloWorld/',
            100,
            false
        );
        await CommonUtils.delay(200); // wait for it to shut down
        const portNumber = parseInt(portString, 10);
        expect(Number.isNaN(portNumber)).toBe(false);
    });

    function verifyDefaultConfig(config: LwrGlobalConfig) {
        // rootDir must be set to project dir
        expect(config.rootDir).toBe(path.resolve(projectDir));

        // cacheDir must be relative to project dir
        expect(config.cacheDir).toBe(
            path.resolve(`${projectDir}/__lwr_cache__`)
        );

        // LWC module record should be set to 2-level-up path
        const lwcModuleRecord = (config.lwc &&
            config.lwc.modules[0]) as DirModuleRecord;
        expect(lwcModuleRecord.dir).toBe(
            path.resolve(`${projectDir}${pathToDefault}`)
        );

        // our custom module provider should be appended to the list of default providers
        const customModuleProvider = ((config.moduleProviders &&
            config.moduleProviders[
                config.moduleProviders.length - 1
            ]) as ServiceEntry)[0];
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
