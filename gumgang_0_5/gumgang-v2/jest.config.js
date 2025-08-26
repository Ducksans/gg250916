module.exports = {
  // 테스트 환경 설정
  testEnvironment: 'jsdom',

  // 루트 디렉토리
  roots: ['<rootDir>/src', '<rootDir>/tests'],

  // 테스트 파일 패턴
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],

  // TypeScript 변환 설정
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // 모듈 이름 매핑
  moduleNameMapper: {
    // CSS 모듈 모킹
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',

    // 이미지 및 정적 파일 모킹
    '\\.(jpg|jpeg|png|gif|svg|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/tests/__mocks__/fileMock.js',

    // 경로 별칭
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },

  // 코드 커버리지 설정
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
    '!src/**/*.stories.tsx',
    '!src/**/__tests__/**',
  ],

  // 커버리지 임계값
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // 커버리지 리포터
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // 셋업 파일
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],

  // 테스트 타임아웃
  testTimeout: 10000,

  // 변환 무시 패턴
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@testing-library)/)',
  ],

  // 모듈 파일 확장자
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // 글로벌 설정
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },

  // 워치 플러그인
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // 캐시
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // 자세한 출력
  verbose: true,

  // 병렬 처리
  maxWorkers: '50%',

  // 테스트 결과 리포터
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'report.html',
        openReport: false,
        pageTitle: '금강 2.0 테스트 리포트',
        logoImgPath: './public/logo.png',
        hideIcon: false,
        expand: false,
      },
    ],
  ],
};
