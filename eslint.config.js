import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Cores só pelos tokens do `@theme` (src/index.css), cujo contraste é testado.
const COR_SOLTA =
  '/\\b(?:bg|text|border|outline|ring|fill|stroke|from|to|via|decoration|divide|accent|caret)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)\\b|\\[#[0-9a-fA-F]{3,8}\\]/';
const MENSAGEM_COR = 'Use as cores do tema (src/index.css), não a paleta padrão do Tailwind.';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'docs'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strict,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      prettier,
    ],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-console': ['error', { allow: ['error'] }],
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=${COR_SOLTA}]`, message: MENSAGEM_COR },
        { selector: `TemplateElement[value.raw=${COR_SOLTA}]`, message: MENSAGEM_COR },
      ],
    },
  },
);
