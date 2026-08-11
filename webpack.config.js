import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const moduleRules = {
  rules: [
    {
      test: /\.ts$/,
      exclude: /node_modules/,
      use: 'ts-loader',
    },
    {
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: { presets: ['@babel/preset-env'] },
      },
    },
    {
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
    },
    {
      test: /\.(png|jpg|jpeg|gif)$/i,
      type: 'asset/resource',
    },
  ],
};

/**
 * The library build: one self-contained IIFE assigning `globalThis.WebQualityAnalyzer`, for
 * injection into a page by a test runner (`page.addScriptTag`, `cy.window`) or any other
 * caller with a DOM.
 *
 * Deliberately **not minified**, unlike a bundle you would ship over a network. This artifact
 * is committed to git, so the properties that matter are review and history, not bytes:
 *
 *   - Minified output is a single line with no newlines at all, so every analyzer change
 *     rewrites that whole line. The diff is unreviewable and git's line-based delta
 *     compression has nothing to work with.
 *   - It is injected into a local test page, never fetched over a network, so the ~18 KB
 *     saving buys nothing.
 *   - Terser renames every local identifier, so a stack trace from an assertion failing
 *     inside an analyzer points at `r` and `i` instead of the real function names.
 *
 * `mode: 'none'` rather than `'development'`: no dev-only instrumentation, just readable
 * output. No source map either — the bundle is already the readable form.
 */
const libConfig = {
  mode: 'none',
  entry: './src/index.ts',
  output: {
    path: resolve(__dirname, 'dist', 'lib'),
    filename: 'wqa.js',
    library: { name: 'WebQualityAnalyzer', type: 'var' },
    iife: true,
    clean: true,
  },
  module: moduleRules,
  resolve: { extensions: ['.ts', '.js'] },
  devtool: false,
};

export default (env) => {
  if (env?.lib) {
    return libConfig;
  }

  const browser = env?.browser ?? 'chrome';
  const outDir = resolve(__dirname, 'dist', browser);
  const manifestSrc = `src/manifest.${browser}.json`;

  return {
    mode: 'development',
    entry: {
      background: './src/background/background.ts',
      popup: './src/popup/popup.ts',
      content: './src/content/content.ts',
    },
    output: {
      path: outDir,
      filename: '[name].bundle.js',
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: 'ts-loader',
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: manifestSrc, to: 'manifest.json' },
          { from: 'src/popup.html', to: 'popup.html' },
        ],
      }),
    ],
    devtool: 'source-map',
  };
};
