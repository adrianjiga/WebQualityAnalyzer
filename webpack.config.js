import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default (env) => {
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
