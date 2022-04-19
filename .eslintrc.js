module.exports = {
  env: {
    node: true
  },
  extends: 'airbnb-base',
  rules: {
    'space-before-function-paren': 0,
    // 'no-console': ['warn'],
    'arrow-parens': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
  }
}
