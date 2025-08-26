// extract_chatgpt_sessions.js

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  // 📁 저장 디렉토리 정의
  const SAVE_DIR = path.join(process.env.HOME, '바탕화면/gumgang_0_5/chatgpt_sessions');
  const SAVED_JSON = path.join(SAVE_DIR, 'saved_sessions.json');

  // 📂 디렉토리 없으면 생성
  if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR, { recursive: true });
    console.log(`📂 폴더 생성: ${SAVE_DIR}`);
  }

  // 🌐 브라우저 실행 (로그인된 프로필 사용)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath: '/usr/bin/google-chrome', // 또는 '/snap/bin/chromium'
    userDataDir: '/home/duksan/.config/google-chrome/Profile 1', // ✅ 공백 포함 경로는 직접 입력
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
    ],
  });

  const page = await browser.newPage();

  try {
    await page.goto('https://chat.openai.com', { waitUntil: 'networkidle2' });

    console.log('🔐 로그인 상태를 확인 중... nav 로딩을 기다립니다...');
    await page.waitForSelector('nav', { timeout: 15000 });
  } catch (err) {
    console.error('❌ 로그인 상태가 아니거나 nav 요소를 찾을 수 없습니다.');
    await browser.close();
    process.exit(1);
  }

  console.log('⏳ 세션 목록 로드가 완료되면 [ENTER] 키를 누르세요.');
  await new Promise((resolve) => process.stdin.once('data', resolve));

  // 📥 세션 목록 추출
  const sessions = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('nav a'))
      .filter((a) => a.href.includes('/c/'))
      .map((a) => ({
        title: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 50),
        url: a.href,
      }));
  });

  // 📚 이전에 저장된 세션 목록 불러오기
  let saved = [];
  if (fs.existsSync(SAVED_JSON)) {
    saved = JSON.parse(fs.readFileSync(SAVED_JSON, 'utf-8'));
  }

  // 🔍 새로 저장할 세션만 필터링
  const newSessions = sessions.filter(
    (s) => !saved.find((old) => old.url === s.url)
  );

  console.log(`🔎 새 세션 ${newSessions.length}개 발견`);

  for (let i = 0; i < newSessions.length; i++) {
    const { title, url } = newSessions[i];
    console.log(`📥 (${i + 1}/${newSessions.length}) 백업 중: ${title}`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000); // 렌더링 대기

    const content = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.innerText : '[내용 추출 실패]';
    });

    const safeTitle = title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, '_');
    const filename = `${safeTitle}_${Date.now()}.md`;
    const filepath = path.join(SAVE_DIR, filename);
    fs.writeFileSync(filepath, content);
  }

  // 🧠 저장 목록 갱신
  const updated = [...saved, ...newSessions];
  fs.writeFileSync(SAVED_JSON, JSON.stringify(updated, null, 2));

  console.log(`✅ 총 ${newSessions.length}개 세션 백업 완료`);
  await browser.close();
})();
