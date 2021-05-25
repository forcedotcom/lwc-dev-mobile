/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
module.exports = {
    displayName: 'Unit Tests',
    setupFilesAfterEnv: ['jest-extended', 'jest-chain'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testMatch: ['**/__tests__/**/?(*.)(spec|test).(js|ts)'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testPathIgnorePatterns: ['/node_modules/', '/lib/', '/dist/'],
    moduleDirectories: ['node_modules'],
    moduleNameMapper: {
        '@lwrjs/app-service/identity':
            '<rootDir>/node_modules/@lwrjs/app-service/build/cjs/identity.cjs',
        '@lwrjs/app-service/moduleProvider':
            '<rootDir>/node_modules/@lwrjs/app-service/build/cjs/moduleProvider/index.cjs',
        '@lwrjs/core/package': '<rootDir>/node_modules/@lwrjs/core/package.cjs'
    },
    collectCoverage: false,
    coverageReporters: ['json', 'html', 'text'],
    collectCoverageFrom: ['src/**/*.ts', 'src/**/*.js', 'modules/**/*.js'],
    coveragePathIgnorePatterns: ['prismjs.js'],
    coverageDirectory: 'reports/coverage',
    reporters: [
        'default',
        [
            'jest-junit',
            {
                suiteName: 'Unit Tests',
                output: './reports/junit/jest-results.xml'
            }
        ]
    ]
};
