module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    mocha: true,
  },
  extends: 'eslint:recommended',
  overrides: [
    {
      env: {
        node: true,
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-debugger': 0,
    'no-unused-vars': 0,
  },
}
