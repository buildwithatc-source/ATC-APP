import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['out', 'dist', 'release', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // TypeScript (tsc) already reports undefined identifiers; the core rule
      // only causes false positives on browser/node globals here.
      'no-undef': 'off',
      // Allow @ts-ignore when it carries an explanation (a couple of preload
      // globals typed only in the .d.ts genuinely need it).
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }]
    }
  },
  // Turn off ESLint rules that would fight Prettier's formatting.
  prettier
)
