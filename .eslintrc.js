/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
        'plugin:prettier/recommended',
        "prettier"
    ],
    "ignorePatterns": [
        "**/node_modules/**",
        "**/dist/**",
        "**/lib/**",
        "**/reports/**"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": "tsconfig.json",
        "sourceType": "module"
    },
    "plugins": [
        "eslint-plugin-import",
        "eslint-plugin-jsdoc",
        "eslint-plugin-prefer-arrow",
        "eslint-plugin-unicorn",
        "eslint-plugin-react",
        "prettier",
        "@typescript-eslint"
    ],
    "rules": {
        "prettier/prettier": "warn",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "no-unused-vars": "off"
    }
};
