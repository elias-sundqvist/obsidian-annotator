// The rules master had (ESLint recommended, typescript-eslint recommended, browser compatibility, no stray
// console output), for the plugin's source. Formatting is Prettier's (.prettierrc.json); eslint-config-prettier
// switches off the rules that would argue with it.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import compat from 'eslint-plugin-compat';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
    { ignores: ['**', '!src', '!src/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    compat.configs['flat/recommended'],
    prettier,
    {
        files: ['src/**/*.ts'],
        languageOptions: { globals: { ...globals.browser } },
        rules: {
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-this-alias': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            // A name that begins with an underscore says it is not used on purpose (a value taken out of a pattern to drop it).
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
            'no-console': ['error', { allow: ['warn', 'error'] }]
        }
    }
);
