module.exports = {
    displayName: 'Unit Tests',
    preset: '@lwc/jest-preset',
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testMatch: ['**/__tests__/**/?(*.)(spec|test).(js|ts)'],
    resolver: '<rootDir>/lwc-jest-resolver/resolver.js',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/lib/',
        '/dist/'
    ],
    transformIgnorePatterns: [
        '.*node_modules/(?!@webruntime|@salesforce/lwc-jest).*'
    ],
    moduleDirectories: ['node_modules'],
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
