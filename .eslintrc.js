// ESLint configuration
// http://eslint.org/docs/user-guide/configuring
module.exports = {
  parser: 'babel-eslint',

  extends: [
    'airbnb-base',
    'plugin:flowtype/recommended',
  ],

  plugins: [
    'flowtype', 
  ],

  globals: {
    __PROD__: true,
    __DEV__: true,
    __TEST__: true,
  },

  rules: {

    // Recommend not to leave any console.log in your code
    // Use console.error, console.warn and console.info instead
    // https://eslint.org/docs/rules/no-console
    'no-console': [
      'error',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],

    'function-paren-newline': 0,
    
    'import/prefer-default-export': 0,

    'no-underscore-dangle': 0,

    'comma-dangle': [
      'error', 'only-multiline'
    ],

    // Prefer destructuring from arrays and objects
    // http://eslint.org/docs/rules/prefer-destructuring
    'prefer-destructuring': [
      'error',
      {
        VariableDeclarator: {
          array: false,
          object: true,
        },
        AssignmentExpression: {
          array: false,
          object: false,
        },
      },
      {
        enforceForRenamedProperties: false,
      },
    ],

    // Functional and class components are equivalent from React’s point of view
    // https://github.com/yannickcr/eslint-plugin-react/blob/master/docs/rules/prefer-stateless-function.md
    'react/prefer-stateless-function': 'off',

    // ESLint plugin for prettier formatting
    // https://github.com/prettier/eslint-plugin-prettier
    // 'prettier/prettier': 'error',

    'react/forbid-prop-types': 'off',
    'react/destructuring-assignment': 'off',
    'brace-style': ['error', 'stroustrup', { 'allowSingleLine': true }],
  },

  settings: {
    // Allow absolute paths in imports, e.g. import Button from 'components/Button'
    // https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', 'src'],
      },
    },
  },
};
