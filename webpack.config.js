import { resolve } from "path";

export const mode = "development";
export const entry = {
  background: "./src/background.js",
  popup: "./src/popup.js",
  content: "./src/content.js",
};
export const output = {
  path: resolve(__dirname, "dist"),
  filename: "[name].bundle.js",
};
export const module = {
  rules: [
    {
      test: /\.js$/,
      exclude: /node_modules/,
      use: {
        loader: "babel-loader",
        options: {
          presets: ["@babel/preset-env"],
        },
      },
    },
    {
      test: /\.css$/,
      use: ["style-loader", "css-loader"],
    },
    {
      test: /\.(png|jpg|jpeg|gif)$/i,
      type: "asset/resource",
    },
  ],
};
export const devtool = "source-map";
