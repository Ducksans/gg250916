const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const SAVE_DIR = process.env.HOME + '/바탕화면/gumgang_0_5/chatgpt_sessions';
  const SAVED_JSON = path.join(SAVE_DIR, 'saved_sessions.json');

  const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
  const page = await browser.newPage();
  await page.goto('https://chat.openai.com', { waitUntil: 'networkidle2' });

  console.log('🔐 로그인 후 세션 리스트가 모두 뜰 때까지 기다리세요...');
  await page.waitForSelector('nav');

  console.log('⏳ [ENTER] 키를 누르면 백업을 시작합니다.');
  await new Promise(resolve => process.stdin.once('data', resolve));

  const sessions = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('nav a'))
      .filter(a => a.href.includes('/c/'))
      .map(a => ({
        title: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 50),
        url: a.href
      }));
  });

  let saved = [];
  if (fs.existsSync(SAVED_JSON)) {
    saved = JSON.parse(fs.readFileSync(SAVED_JSON, 'utf-8'));
  }

  const newSessions = sessions.filter(s => !saved.find(old => old.url === s.url));

  for (let i = 0; i < newSessions.length; i++) {
    const { title, url } = newSessions[i];
    console.log(`📥 백업 중 (${i + 1}/${newSessions.length}): ${title}`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(3000); // 세션 로딩 대기

    const content = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.innerText : '[내용 추출 실패]';
    });

    const filename = title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, '_') + '.md';
    const filepath = path.join(SAVE_DIR, filename);
    fs.writeFileSync(filepath, content);
  }

  const updated = [...saved, ...newSessions];
  fs.writeFileSync(SAVED_JSON, JSON.stringify(updated, null, 2));

  console.log(`✅ ${newSessions.length}개 세션 백업 완료`);
  await browser.close();
})();
