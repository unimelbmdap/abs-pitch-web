module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: 'google',
  overrides: [
    {
      env: {
        node: true
      },
      files: [
        '.eslintrc.{js,cjs}'
      ],
      parserOptions: {
        sourceType: 'script'
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    "padded-blocks": "off",
    "require-jsdoc": "off",
    "indent": [
      "error",
      2,
      {
        "CallExpression": {"arguments": 1},
      }
    ]
  }
}
