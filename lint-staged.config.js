module.exports = {
    // Run this command for each of the files.
    // ignore vendors directory and eslintrc.js file
    '!(vendors|.eslintrc.js)/**/*.{js,ts}': [
        'prettier --write',
        'eslint --fix',
        'git add'
    ]
};
