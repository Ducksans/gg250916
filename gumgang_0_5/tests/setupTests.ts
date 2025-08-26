/**
 * 금강 2.0 - 테스트 환경 셋업
 * Jest 테스트 실행 전 글로벌 설정 및 모킹
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import 'jest-canvas-mock';
import { TextEncoder, TextDecoder } from 'util';

// React Testing Library 설정
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 2000,
});

// TextEncoder/TextDecoder 폴리필 (Node.js 환경)
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Fetch API 모킹
global.fetch = jest.fn();

// LocalStorage 모킹
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock as Storage;

// SessionStorage 모킹
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.sessionStorage = sessionStorageMock as Storage;

// WebSocket 모킹
class WebSocketMock {
  url: string;
  readyState: number;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;

    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string | ArrayBuffer | Blob) {
    // 모킹된 send 메서드
    console.log('WebSocket.send called with:', data);
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

global.WebSocket = WebSocketMock as any;

// IntersectionObserver 모킹
class IntersectionObserverMock {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

global.IntersectionObserver = IntersectionObserverMock as any;

// ResizeObserver 모킹
class ResizeObserverMock {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

global.ResizeObserver = ResizeObserverMock as any;

// requestAnimationFrame 모킹
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 0);
  return 0;
});

global.cancelAnimationFrame = jest.fn();

// URL.createObjectURL 모킹
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Worker 모킹
class WorkerMock {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(message: any) {
    // 모킹된 postMessage
    console.log('Worker.postMessage called with:', message);
  }

  terminate() {
    // 모킹된 terminate
  }
}

global.Worker = WorkerMock as any;

// console 경고 및 에러 억제 (테스트 중 불필요한 출력 방지)
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: useLayoutEffect'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  });

  console.warn = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// 각 테스트 전 초기화
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});

// Three.js WebGL 컨텍스트 모킹
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      canvas: document.createElement('canvas'),
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      getExtension: jest.fn(),
      getParameter: jest.fn(),
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      getShaderParameter: jest.fn(() => true),
      createProgram: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      getProgramParameter: jest.fn(() => true),
      useProgram: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      createTexture: jest.fn(),
      bindTexture: jest.fn(),
      texImage2D: jest.fn(),
      texParameteri: jest.fn(),
      clear: jest.fn(),
      clearColor: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
      viewport: jest.fn(),
      drawArrays: jest.fn(),
      drawElements: jest.fn(),
      getUniformLocation: jest.fn(),
      getAttribLocation: jest.fn(),
      uniform1f: jest.fn(),
      uniform2f: jest.fn(),
      uniform3f: jest.fn(),
      uniform4f: jest.fn(),
      uniformMatrix4fv: jest.fn(),
      vertexAttribPointer: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      disableVertexAttribArray: jest.fn(),
      deleteShader: jest.fn(),
      deleteProgram: jest.fn(),
      deleteBuffer: jest.fn(),
      deleteTexture: jest.fn(),
    };
  }
  return null;
}) as any;

// MediaDevices 모킹
navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: () => [],
    getAudioTracks: () => [],
    getVideoTracks: () => [],
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
    stop: jest.fn(),
  }),
  enumerateDevices: jest.fn().mockResolvedValue([]),
  getSupportedConstraints: jest.fn().mockReturnValue({}),
  getDisplayMedia: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  ondevicechange: null,
} as any;

// 커스텀 매처 추가
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toContainObject(received: any[], argument: object) {
    const pass = received.some(item =>
      Object.keys(argument).every(key => item[key] === argument[key])
    );

    if (pass) {
      return {
        message: () =>
          `expected ${JSON.stringify(received)} not to contain object ${JSON.stringify(argument)}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${JSON.stringify(received)} to contain object ${JSON.stringify(argument)}`,
        pass: false,
      };
    }
  },
});

// TypeScript 타입 선언
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toContainObject(argument: object): R;
    }
  }
}

// 테스트 유틸리티 함수들
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  });
};

export const createMockFile = (name: string, content: string, type = 'text/plain'): File => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// 테스트 환경 정보 출력
console.log('🧪 금강 2.0 테스트 환경 초기화 완료');
console.log(`📅 테스트 실행 시간: ${new Date().toISOString()}`);
console.log(`🔧 Node 버전: ${process.version}`);
console.log(`📦 테스트 모드: ${process.env.NODE_ENV}`);
