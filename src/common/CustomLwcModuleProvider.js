import path from 'path';

var __defProp = Object.defineProperty;

var __markAsModule = (target) =>
    __defProp(target, '__esModule', { value: true });

var __export = (target, all) => {
    __markAsModule(target);
    for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
};

__export(exports, {
    default: () => src_default
});

var CustomLwcModuleProvider = class {
    constructor(
        options = {},
        {
            appEmitter,
            config: { modules, rootDir, cacheDir },
            runtimeEnvironment: { watchFiles }
        }
    ) {
        this.name = 'custom-lwc-module-provider';

        // go to the directory in our plug-in that contains the 'node_modules' directory.
        // override the rootDir to be this location and use it to resolve the npm modules
        // that LWR requests (instead of having the app with an LWC to provide them).
        rootDir = path.resolve(`${__dirname}/../../`);

        var LwcModuleProvider = require('@lwrjs/lwc-module-provider');
        this.internalLwcModuleProvider = new LwcModuleProvider.default(
            options,
            {
                appEmitter,
                config: { modules, rootDir, cacheDir },
                runtimeEnvironment: { watchFiles }
            }
        );
    }
    async onModuleChange(fileChanged) {
        return this.internalLwcModuleProvider.onModuleChange(fileChanged);
    }
    async getModule(moduleId) {
        return this.internalLwcModuleProvider.getModule(moduleId);
    }
    getModuleSource({ name, namespace, specifier }, moduleEntry) {
        return this.internalLwcModuleProvider.getModuleSource(
            { name, namespace, specifier },
            moduleEntry
        );
    }
    async getModuleEntry({ specifier, importer, version }) {
        try {
            const result = await this.internalLwcModuleProvider.getModuleEntry({
                specifier,
                importer,
                version
            });
            return Promise.resolve(result);
        } catch {
            console.log(
                `CustomLwcModuleProvider is unable to resolve module '${specifier}' for '${importer}'... Skipping and deferring to other providers to resolve.`
            );
            return Promise.resolve(undefined);
        }
    }
};

var src_default = CustomLwcModuleProvider;
