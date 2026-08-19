export default [
    {
        files: ['test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'unicorn/numeric-separators-style': 'off',
            camelcase: 'off'
        }
    }
];
