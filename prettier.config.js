/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
  trailingComma: 'es5',
  tabWidth: 2,
  semi: false,
  singleQuote: true,
  jsxSingleQuote: true,
  useTabs: false,
  endOfLine: 'lf',
  printWidth: 100,
  plugins: ['prettier-plugin-tailwindcss'],
};

export default config;
