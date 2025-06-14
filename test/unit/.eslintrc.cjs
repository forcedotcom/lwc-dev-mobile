module.exports = {
    extends: '../../.eslintrc.cjs',
    // Allow describe and it
    env: { mocha: true },
    rules: {
        'class-methods-use-this': 'off',
        'no-unused-expressions': 'off', // Allow assert style expressions. i.e. expect(true).to.be.true
        '@typescript-eslint/explicit-function-return-type': 'off', // Return types are defined by the source code. Allows for quick overwrites.
        '@typescript-eslint/no-empty-function': 'off', // Mocked out the methods that shouldn't do anything in the tests.
        '@typescript-eslint/require-await': 'off', // Easily return a promise in a mocked method.
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'unicorn/numeric-separators-style': 'off',
        camelcase: 'off',
        header: 'off'
    },
};
