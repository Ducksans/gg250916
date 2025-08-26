/**
 * 금강 2.0 - E2E 사용자 워크플로우 테스트
 * 실제 사용자 시나리오 기반 통합 테스트
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { expect } from '@playwright/test';
import axios from 'axios';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:8001';
const WS_URL = process.env.WS_URL || 'ws://localhost:8001';

describe('금강 2.0 E2E 사용자 워크플로우', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  // 테스트 사용자 데이터
  const testUser = {
    email: 'e2e.test@gumgang.com',
    password: 'Test1234!@#$',
    name: '테스트 사용자',
  };

  const testProject = {
    name: 'E2E 테스트 프로젝트',
    description: '자동화 테스트용 프로젝트',
  };

  beforeAll(async () => {
    // 브라우저 초기화
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    });

    // 테스트 데이터 초기화
    await cleanupTestData();
  });

  beforeEach(async () => {
    // 새로운 브라우저 컨텍스트
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
    });

    page = await context.newPage();

    // 콘솔 메시지 로깅
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('브라우저 에러:', msg.text());
      }
    });
  });

  afterEach(async () => {
    // 스크린샷 저장 (실패 시)
    if (page) {
      await page.screenshot({
        path: `./test-results/screenshots/${Date.now()}.png`,
        fullPage: true,
      });
    }

    await context?.close();
  });

  afterAll(async () => {
    await browser?.close();
    await cleanupTestData();
  });

  /**
   * 시나리오 1: 사용자 인증 플로우
   */
  describe('사용자 인증 플로우', () => {
    test('회원가입 → 이메일 인증 → 로그인', async () => {
      // 1. 회원가입 페이지 이동
      await page.goto(`${BASE_URL}/signup`);
      await expect(page).toHaveTitle(/금강.*회원가입/);

      // 2. 회원가입 폼 작성
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.fill('input[name="name"]', testUser.name);

      // 약관 동의
      await page.check('input[name="agreeTerms"]');
      await page.check('input[name="agreePrivacy"]');

      // 3. 회원가입 제출
      await page.click('button[type="submit"]');

      // 4. 이메일 인증 대기
      await page.waitForSelector('.email-verification-notice', { timeout: 5000 });

      // 테스트 환경에서는 자동 인증
      await verifyTestEmail(testUser.email);

      // 5. 로그인 페이지로 리다이렉트
      await page.waitForURL(`${BASE_URL}/login`);

      // 6. 로그인
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // 7. 대시보드 접근 확인
      await page.waitForURL(`${BASE_URL}/dashboard`);
      await expect(page.locator('.user-name')).toContainText(testUser.name);
    });

    test('소셜 로그인 (Google)', async () => {
      await page.goto(`${BASE_URL}/login`);

      // Google 로그인 버튼 클릭
      const googleButton = page.locator('button.google-login');
      await googleButton.click();

      // 새 창에서 Google 인증 처리
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        googleButton.click(),
      ]);

      // 테스트 환경에서는 모의 인증
      await mockGoogleAuth(popup);

      // 인증 후 대시보드로 이동
      await page.waitForURL(`${BASE_URL}/dashboard`);
    });

    test('비밀번호 재설정', async () => {
      await page.goto(`${BASE_URL}/forgot-password`);

      // 이메일 입력
      await page.fill('input[name="email"]', testUser.email);
      await page.click('button[type="submit"]');

      // 성공 메시지 확인
      await expect(page.locator('.success-message')).toBeVisible();

      // 테스트 환경에서 재설정 링크 획득
      const resetToken = await getPasswordResetToken(testUser.email);

      // 재설정 페이지로 이동
      await page.goto(`${BASE_URL}/reset-password?token=${resetToken}`);

      // 새 비밀번호 설정
      const newPassword = 'NewPass1234!@#$';
      await page.fill('input[name="newPassword"]', newPassword);
      await page.fill('input[name="confirmPassword"]', newPassword);
      await page.click('button[type="submit"]');

      // 로그인 페이지로 리다이렉트
      await page.waitForURL(`${BASE_URL}/login`);

      // 새 비밀번호로 로그인
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', newPassword);
      await page.click('button[type="submit"]');

      await page.waitForURL(`${BASE_URL}/dashboard`);
    });
  });

  /**
   * 시나리오 2: 프로젝트 관리
   */
  describe('프로젝트 관리 워크플로우', () => {
    beforeEach(async () => {
      await loginAsTestUser(page);
    });

    test('프로젝트 생성 → 설정 → 멤버 초대', async () => {
      // 1. 프로젝트 생성
      await page.goto(`${BASE_URL}/projects`);
      await page.click('button.create-project');

      // 2. 프로젝트 정보 입력
      await page.fill('input[name="projectName"]', testProject.name);
      await page.fill('textarea[name="description"]', testProject.description);
      await page.selectOption('select[name="template"]', 'web-app');

      // 3. 고급 설정
      await page.click('.advanced-settings-toggle');
      await page.check('input[name="enableAI"]');
      await page.check('input[name="enable3D"]');
      await page.selectOption('select[name="visibility"]', 'private');

      // 4. 프로젝트 생성
      await page.click('button.submit-create');
      await page.waitForURL(/\/projects\/[a-z0-9-]+/);

      // 5. 프로젝트 대시보드 확인
      await expect(page.locator('h1.project-name')).toContainText(testProject.name);

      // 6. 멤버 초대
      await page.click('button.invite-members');
      await page.fill('input[name="inviteEmail"]', 'colleague@gumgang.com');
      await page.selectOption('select[name="role"]', 'developer');
      await page.click('button.send-invite');

      // 7. 초대 성공 확인
      await expect(page.locator('.invite-success')).toBeVisible();
    });

    test('파일 업로드 및 관리', async () => {
      await navigateToProject(page);

      // 1. 파일 업로드
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        './test-fixtures/sample-code.js',
        './test-fixtures/sample-doc.md',
      ]);

      // 2. 업로드 진행 상황
      await page.waitForSelector('.upload-progress', { state: 'visible' });
      await page.waitForSelector('.upload-complete', { timeout: 10000 });

      // 3. 파일 목록 확인
      const fileList = page.locator('.file-list-item');
      await expect(fileList).toHaveCount(2);

      // 4. 파일 미리보기
      await fileList.first().click();
      await expect(page.locator('.file-preview')).toBeVisible();

      // 5. 파일 이름 변경
      await page.click('button.rename-file');
      await page.fill('input.file-name-input', 'renamed-file.js');
      await page.keyboard.press('Enter');

      // 6. 파일 삭제
      await page.click('button.delete-file');
      await page.click('button.confirm-delete');
      await expect(fileList).toHaveCount(1);
    });
  });

  /**
   * 시나리오 3: 실시간 협업
   */
  describe('실시간 협업 워크플로우', () => {
    let page2: Page;
    let context2: BrowserContext;

    beforeEach(async () => {
      // 두 명의 사용자 시뮬레이션
      await loginAsTestUser(page);

      context2 = await browser.newContext();
      page2 = await context2.newPage();
      await loginAsSecondUser(page2);

      // 같은 프로젝트 접속
      const projectUrl = await createTestProject();
      await page.goto(projectUrl);
      await page2.goto(projectUrl);
    });

    afterEach(async () => {
      await context2?.close();
    });

    test('실시간 코드 편집', async () => {
      // 1. User1이 에디터 열기
      await page.click('.open-editor');
      await page.waitForSelector('.code-editor');

      // 2. User2도 에디터 열기
      await page2.click('.open-editor');
      await page2.waitForSelector('.code-editor');

      // 3. User1이 코드 입력
      const code = 'function hello() {\n  console.log("Hello, 금강!");\n}';
      await page.click('.editor-content');
      await page.keyboard.type(code);

      // 4. User2에서 실시간 반영 확인
      await page2.waitForFunction(
        (expectedCode) => {
          const editor = document.querySelector('.editor-content');
          return editor?.textContent?.includes(expectedCode);
        },
        'Hello, 금강!',
        { timeout: 5000 }
      );

      // 5. 커서 위치 동기화 확인
      await expect(page2.locator('.remote-cursor')).toBeVisible();
      await expect(page2.locator('.remote-cursor')).toHaveAttribute('data-user', 'User1');
    });

    test('실시간 채팅', async () => {
      // 1. 채팅 패널 열기
      await page.click('.open-chat');
      await page2.click('.open-chat');

      // 2. User1이 메시지 전송
      const message = '안녕하세요! 협업 테스트입니다.';
      await page.fill('.chat-input', message);
      await page.keyboard.press('Enter');

      // 3. User2에서 메시지 수신 확인
      await expect(page2.locator('.chat-message').last()).toContainText(message);

      // 4. User2가 답장
      const reply = '네, 잘 받았습니다!';
      await page2.fill('.chat-input', reply);
      await page2.keyboard.press('Enter');

      // 5. User1에서 답장 확인
      await expect(page.locator('.chat-message').last()).toContainText(reply);

      // 6. 타이핑 인디케이터
      await page.fill('.chat-input', '타이핑 중...');
      await expect(page2.locator('.typing-indicator')).toBeVisible();
    });

    test('화면 공유 및 포인터 추적', async () => {
      // 1. User1이 화면 공유 시작
      await page.click('.start-screen-share');
      await page.waitForSelector('.screen-sharing-active');

      // 2. User2에서 공유 화면 확인
      await expect(page2.locator('.shared-screen-viewer')).toBeVisible();

      // 3. User1이 마우스 이동
      await page.mouse.move(500, 300);
      await page.mouse.move(700, 400);

      // 4. User2에서 포인터 추적 확인
      const remotePointer = page2.locator('.remote-pointer');
      await expect(remotePointer).toBeVisible();

      // 포인터 위치 동기화 확인
      const pointerPosition = await remotePointer.boundingBox();
      expect(pointerPosition?.x).toBeGreaterThan(600);
      expect(pointerPosition?.y).toBeGreaterThan(300);
    });
  });

  /**
   * 시나리오 4: AI 기능 활용
   */
  describe('AI 기능 워크플로우', () => {
    beforeEach(async () => {
      await loginAsTestUser(page);
      await navigateToProject(page);
    });

    test('AI 코드 생성', async () => {
      // 1. AI 패널 열기
      await page.click('.open-ai-assistant');
      await page.waitForSelector('.ai-panel');

      // 2. 프롬프트 입력
      const prompt = 'React 컴포넌트로 사용자 프로필 카드 만들어줘';
      await page.fill('.ai-prompt-input', prompt);

      // 3. 모델 선택
      await page.selectOption('.ai-model-select', 'gpt-4');

      // 4. 생성 요청
      await page.click('.generate-code');

      // 5. 로딩 상태
      await expect(page.locator('.ai-loading')).toBeVisible();

      // 6. 생성된 코드 확인
      await page.waitForSelector('.ai-generated-code', { timeout: 10000 });
      const generatedCode = await page.locator('.ai-generated-code').textContent();

      expect(generatedCode).toContain('function UserProfile');
      expect(generatedCode).toContain('props');
      expect(generatedCode).toContain('return');

      // 7. 코드 적용
      await page.click('.apply-code-to-editor');
      await expect(page.locator('.editor-content')).toContainText('UserProfile');
    });

    test('AI 코드 리뷰', async () => {
      // 1. 코드 에디터에 샘플 코드 입력
      await page.click('.open-editor');
      const sampleCode = `
        function calculateSum(arr) {
          let sum = 0;
          for(let i = 0; i <= arr.length; i++) {
            sum += arr[i];
          }
          return sum;
        }
      `;
      await page.fill('.editor-content', sampleCode);

      // 2. AI 리뷰 요청
      await page.click('.request-ai-review');

      // 3. 리뷰 결과 대기
      await page.waitForSelector('.ai-review-results', { timeout: 10000 });

      // 4. 리뷰 내용 확인
      const review = page.locator('.ai-review-results');
      await expect(review).toContainText('버그 발견');
      await expect(review).toContainText('i <= arr.length');
      await expect(review).toContainText('i < arr.length');

      // 5. 제안사항 적용
      await page.click('.apply-suggestion');
      const fixedCode = await page.locator('.editor-content').textContent();
      expect(fixedCode).toContain('i < arr.length');
    });

    test('AI 문서 생성', async () => {
      // 1. 함수 선택
      await page.click('.select-function[data-function="calculateSum"]');

      // 2. 문서 생성 요청
      await page.click('.generate-docs');

      // 3. 생성된 문서 확인
      await page.waitForSelector('.generated-documentation');
      const docs = page.locator('.generated-documentation');

      await expect(docs).toContainText('@param {Array}');
      await expect(docs).toContainText('@returns {number}');
      await expect(docs).toContainText('배열의 합계를 계산');

      // 4. 문서 삽입
      await page.click('.insert-documentation');
      await expect(page.locator('.editor-content')).toContainText('/**');
    });
  });

  /**
   * 시나리오 5: 3D 시각화
   */
  describe('3D 코드 시각화 워크플로우', () => {
    beforeEach(async () => {
      await loginAsTestUser(page);
      await navigateToProject(page);
    });

    test('3D 뷰어 인터랙션', async () => {
      // 1. 3D 뷰어 열기
      await page.click('.open-3d-viewer');
      await page.waitForSelector('canvas.three-canvas');

      // 2. 파일 업로드
      await page.setInputFiles('.file-upload-3d', './test-fixtures/sample-project.zip');
      await page.waitForSelector('.visualization-ready');

      // 3. 카메라 컨트롤
      const canvas = page.locator('canvas.three-canvas');

      // 줌 인
      await canvas.hover();
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(500);

      // 회전
      await page.mouse.down();
      await page.mouse.move(100, 100);
      await page.mouse.up();

      // 4. 노드 클릭
      await canvas.click({ position: { x: 400, y: 300 } });
      await expect(page.locator('.node-info-panel')).toBeVisible();
      await expect(page.locator('.node-name')).toContainText('MainComponent');

      // 5. 필터 적용
      await page.check('input[name="filter-functions"]');
      await page.uncheck('input[name="filter-classes"]');
      await page.waitForTimeout(500);

      // 6. 테마 변경
      await page.selectOption('.theme-selector', 'galaxy');
      await expect(canvas).toHaveAttribute('data-theme', 'galaxy');

      // 7. 스크린샷 저장
      await page.click('.capture-screenshot');
      const download = await page.waitForEvent('download');
      expect(download.suggestedFilename()).toContain('3d-visualization');
    });

    test('코드 복잡도 분석', async () => {
      await page.click('.open-3d-viewer');
      await page.waitForSelector('.visualization-ready');

      // 1. 분석 패널 열기
      await page.click('.open-analysis-panel');

      // 2. 메트릭 확인
      const metrics = page.locator('.code-metrics');
      await expect(metrics).toContainText('순환 복잡도');
      await expect(metrics).toContainText('결합도');
      await expect(metrics).toContainText('응집도');

      // 3. 코드 스멜 하이라이트
      await page.click('.highlight-code-smells');
      const smellNodes = page.locator('.node-smell');
      const smellCount = await smellNodes.count();
      expect(smellCount).toBeGreaterThan(0);

      // 4. 개선 제안 보기
      await smellNodes.first().click();
      await expect(page.locator('.improvement-suggestions')).toBeVisible();
    });
  });

  /**
   * 시나리오 6: 성능 테스트
   */
  describe('성능 및 부하 테스트', () => {
    test('대용량 파일 처리', async () => {
      await loginAsTestUser(page);
      await navigateToProject(page);

      // 1. 대용량 파일 업로드 (10MB)
      const startTime = Date.now();
      await page.setInputFiles('input[type="file"]', './test-fixtures/large-file.zip');

      // 2. 업로드 완료 대기
      await page.waitForSelector('.upload-complete', { timeout: 30000 });
      const uploadTime = Date.now() - startTime;

      // 3. 성능 기준 확인
      expect(uploadTime).toBeLessThan(30000); // 30초 이내

      // 4. 파일 처리 확인
      await expect(page.locator('.file-processed')).toBeVisible();
    });

    test('동시 다중 사용자 시뮬레이션', async () => {
      const userCount = 5;
      const pages: Page[] = [];
      const contexts: BrowserContext[] = [];

      // 1. 다중 사용자 생성
      for (let i = 0; i < userCount; i++) {
        const ctx = await browser.newContext();
        const pg = await ctx.newPage();
        await loginAsTestUser(pg, `user${i}@test.com`);
        contexts.push(ctx);
        pages.push(pg);
      }

      // 2. 동시 접속
      const projectUrl = await createTestProject();
      await Promise.all(pages.map(pg => pg.goto(projectUrl)));

      // 3. 동시 작업
      const actions = pages.map(async (pg, index) => {
        await pg.fill('.chat-input', `User ${index} message`);
        await pg.keyboard.press('Enter');
      });

      await Promise.all(actions);

      // 4. 모든 메시지 수신 확인
      for (const pg of pages) {
        const messages = pg.locator('.chat-message');
        await expect(messages).toHaveCount(userCount);
      }

      // 정리
      await Promise.all(contexts.map(ctx => ctx.close()));
    });
  });
});

/**
 * 헬퍼 함수들
 */

async function loginAsTestUser(page: Page, email?: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', email || 'e2e.test@gumgang.com');
  await page.fill('input[name="password"]', 'Test1234!@#$');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

async function loginAsSecondUser(page: Page) {
  await loginAsTestUser(page, 'user2@test.com');
}

async function navigateToProject(page: Page) {
  const projectUrl = await createTestProject();
  await page.goto(projectUrl);
  await page.waitForSelector('.project-workspace');
}

async function createTestProject(): Promise<string> {
  const response = await axios.post(
    `${API_URL}/api/projects`,
    {
      name: `Test Project ${Date.now()}`,
      description: 'E2E Test Project',
    },
    {
      headers: {
        Authorization: `Bearer ${await getTestToken()}`,
      },
    }
  );

  return `${BASE_URL}/projects/${response.data.id}`;
}

async function getTestToken(): Promise<string> {
  const response = await axios.post(`${API_URL}/api/auth/login`, {
    email: 'e2e.test@gumgang.com',
    password: 'Test1234!@#$',
  });

  return response.data.access_token;
}

async function cleanupTestData() {
  try {
    await axios.delete(`${API_URL}/api/test/cleanup`, {
      headers: {
        'X-Test-Key': process.env.TEST_KEY,
      },
    });
  } catch (error) {
    console.log('테스트 데이터 정리 스킵');
  }
}

async function verifyTestEmail(email: string) {
  await axios.post(`${API_URL}/api/test/verify-email`, { email });
}

async function mockGoogleAuth(popup: Page) {
  // 테스트 환경에서 Google OAuth 모킹
  await popup.evaluate(() => {
    window.location.href = `${window.location.origin}/auth/callback?token=mock-google-token`;
  });
}

async function getPasswordResetToken(email: string): Promise<string> {
  const response = await axios.post(`${API_URL}/api/test/reset-token`, { email });
  return response.data.token;
}
