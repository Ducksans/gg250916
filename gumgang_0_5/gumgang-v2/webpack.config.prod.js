// 금강 2.0 - Webpack 프로덕션 최적화 설정
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',

  entry: {
    main: './src/index.tsx',
    // 코드 스플리팅을 위한 엔트리 포인트
    vendor: ['react', 'react-dom', 'react-router-dom'],
    ai: './src/services/AIService.ts',
    editor: './src/components/editor/CodeEditor.tsx',
    three: './src/services/Code3DVisualizationEngine.ts',
  },

  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'static/js/[name].[contenthash:8].js',
    chunkFilename: 'static/js/[name].[contenthash:8].chunk.js',
    publicPath: '/',
    clean: true,
  },

  optimization: {
    minimize: true,
    minimizer: [
      // JavaScript 최소화
      new TerserPlugin({
        terserOptions: {
          parse: { ecma: 8 },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log'],
          },
          mangle: { safari10: true },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
        parallel: true,
      }),
      // CSS 최소화
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
            },
          ],
        },
      }),
    ],

    // 코드 스플리팅
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        // React 관련
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react',
          priority: 30,
        },
        // Three.js
        three: {
          test: /[\\/]node_modules[\\/]three[\\/]/,
          name: 'three',
          priority: 25,
        },
        // AI 모델 관련
        ai: {
          test: /[\\/]node_modules[\\/](openai|anthropic|@google)[\\/]/,
          name: 'ai-libs',
          priority: 20,
        },
        // UI 라이브러리
        ui: {
          test: /[\\/]node_modules[\\/](@mui|@emotion|styled-components)[\\/]/,
          name: 'ui-libs',
          priority: 15,
        },
        // 유틸리티
        utils: {
          test: /[\\/]node_modules[\\/](lodash|moment|date-fns)[\\/]/,
          name: 'utils',
          priority: 10,
        },
        // 공통 청크
        commons: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
        // 기본 벤더
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            return `vendor.${packageName.replace('@', '')}`;
          },
          priority: 1,
        },
      },
    },

    // 런타임 청크 분리
    runtimeChunk: {
      name: 'runtime',
    },

    // 모듈 ID 최적화
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',

    // Tree Shaking
    usedExports: true,
    sideEffects: false,
  },

  module: {
    rules: [
      // TypeScript/JavaScript
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: { browsers: ['>0.25%', 'not dead'] },
                modules: false,
                useBuiltIns: 'usage',
                corejs: 3,
              }],
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-proposal-class-properties',
              ['@babel/plugin-transform-runtime', { regenerator: true }],
            ],
            cacheDirectory: true,
          },
        },
      },

      // CSS/SCSS
      {
        test: /\.(css|scss|sass)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
              modules: {
                auto: true,
                localIdentName: '[hash:base64:5]',
              },
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  require('autoprefixer'),
                  require('cssnano')({ preset: 'default' }),
                ],
              },
            },
          },
          'sass-loader',
        ],
      },

      // 이미지 최적화
      {
        test: /\.(png|jpg|jpeg|gif|webp|avif)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
        generator: {
          filename: 'static/images/[name].[hash:8][ext]',
        },
        use: [
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: {
                progressive: true,
                quality: 65,
              },
              optipng: {
                enabled: false,
              },
              pngquant: {
                quality: [0.65, 0.90],
                speed: 4,
              },
              gifsicle: {
                interlaced: false,
              },
              webp: {
                quality: 75,
              },
            },
          },
        ],
      },

      // SVG
      {
        test: /\.svg$/,
        use: [
          '@svgr/webpack',
          {
            loader: 'svgo-loader',
            options: {
              plugins: [
                { name: 'removeViewBox', active: false },
                { name: 'removeDimensions', active: true },
              ],
            },
          },
        ],
      },

      // 폰트
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'static/fonts/[name].[hash:8][ext]',
        },
      },
    ],
  },

  plugins: [
    // HTML 템플릿
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
    }),

    // CSS 추출
    new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash:8].css',
      chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
    }),

    // 환경 변수
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL),
      'process.env.REACT_APP_WS_URL': JSON.stringify(process.env.REACT_APP_WS_URL),
    }),

    // Gzip 압축
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),

    // Brotli 압축
    new CompressionPlugin({
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      compressionOptions: { level: 11 },
      threshold: 10240,
      minRatio: 0.8,
      filename: '[path][base].br',
    }),

    // PWA Service Worker
    new WorkboxWebpackPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\.gumgang\.com\//,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 5 * 60, // 5분
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'image-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30일
            },
          },
        },
      ],
    }),

    // 정적 파일 복사
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public',
          to: '',
          globOptions: {
            ignore: ['**/index.html'],
          },
        },
      ],
    }),

    // 번들 분석 (분석 모드일 때만)
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: '../bundle-report.html',
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: '../bundle-stats.json',
    }),

    // 모듈 연결 (scope hoisting)
    new webpack.optimize.ModuleConcatenationPlugin(),
  ].filter(Boolean),

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      // React 프로덕션 빌드 사용
      'react': 'react/cjs/react.production.min.js',
      'react-dom': 'react-dom/cjs/react-dom.production.min.js',
    },
  },

  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 512000, // 500KB
    assetFilter: function(assetFilename) {
      return !assetFilename.endsWith('.map');
    },
  },

  stats: {
    children: false,
    chunks: false,
    modules: false,
    colors: true,
    errors: true,
    errorDetails: true,
    warnings: true,
    performance: true,
    timings: true,
  },

  devtool: 'source-map', // 프로덕션에서는 source-map 사용

  // 캐싱
  cache: {
    type: 'filesystem',
    allowCollectingMemory: true,
    cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
  },
};
