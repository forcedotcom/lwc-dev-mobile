/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
module.exports = {
    // Run this command for each of the files.
    // ignore vendors directory and eslintrc.js file
    '!(vendors|.eslintrc.js)/**/*.{js,ts}': [
        'prettier --write',
        'eslint --fix',
        'git add'
    ]
};
