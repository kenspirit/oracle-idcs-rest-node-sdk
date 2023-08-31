module.exports = {
  env: {
    node: true
  },
  extends: ['standard'],
  rules: {
    'space-before-function-paren': 0,
    // 'no-console': ['warn'],
    'arrow-parens': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    semi: ['error', 'always']
  },
  plugins: ['promise']
};
