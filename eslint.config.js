const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
	{
		files: ['**/*.js'],
		rules: {
			// Style and consistency
			quotes: ['error', 'single'],
			semi: ['error', 'always'],
			'prefer-const': 'error',
			'no-var': 'error',
			eqeqeq: ['error', 'always'],
			curly: ['error', 'all'],
			yoda: ['error', 'never'],

			// Code quality
			'no-empty': ['error', { allowEmptyCatch: true }],
			'no-cond-assign': ['error', 'always'],
			'no-unused-vars': 'error',
			'no-debugger': 'error',
			'no-duplicate-imports': 'error',
		},
	},
]);