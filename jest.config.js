module.exports = {
    displayName: 'Unit Tests',
    transform: {
        '^.+\\.tsx?$': 'ts-jest'
    },
    testMatch: ['**/__tests__/**/?(*.)(spec|test).(js|ts)'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/lib/',
        '/dist/'
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
