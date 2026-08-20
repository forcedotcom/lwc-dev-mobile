import salesforceTypescriptConfig from 'eslint-config-salesforce-typescript';
import sfPlugin from 'eslint-plugin-sf-plugin';
import testConfig from './test/eslint.config.mjs';

export default [
    ...salesforceTypescriptConfig,
    ...sfPlugin.configs.recommended,
    {
        rules: {
            'header/header': 'off'
        }
    },
    ...testConfig
];
