module.exports = {
  extends: ['eslint-config-salesforce-typescript', 'plugin:sf-plugin/recommended'],
  ignorePatterns: ['*.cjs'],
  root: true,
  rules: {
    header: 'off',
  },
};
