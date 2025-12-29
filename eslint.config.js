import js from '@eslint/js';

export default [
    {
        ignores: ['node_modules/**', 'dist/**'],
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                performance: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                setTimeout: 'readonly',
                crypto: 'readonly',
                AudioContext: 'readonly',
                webkitAudioContext: 'readonly',
                history: 'readonly',
                localStorage: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            eqeqeq: ['error', 'always'],
            curly: ['error', 'multi-line'],
            'no-var': 'error',
            'prefer-const': 'error',
        },
    },
];
