const exts = ['.js', '.ts']

module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: './',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'standard',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:prettier/recommended',
    'prettier/standard',
    'prettier/@typescript-eslint',
  ],
  rules: {
    'node/no-unsupported-features/es-syntax': 0,
    'node/prefer-promises/dns': 2,
    'node/prefer-promises/fs': 2,
    'import/no-default-export': 2,
    'import/no-useless-path-segments': [
      2,
      {
        noUselessIndex: true,
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-non-null-assertion': 0,
    '@typescript-eslint/interface-name-prefix': [2, 'always'],
    '@typescript-eslint/prefer-includes': 2,
    '@typescript-eslint/prefer-string-starts-ends-with': 2,
    '@typescript-eslint/await-thenable': 2,
    'prettier/prettier': 0,
  },
  settings: {
    'import/extensions': exts,
    'import/parsers': {
      '@typescript-eslint/parser': exts,
    },
    'import/resolver': {
      node: {
        extensions: exts,
      },
      typescript: {},
    },
  },
}
