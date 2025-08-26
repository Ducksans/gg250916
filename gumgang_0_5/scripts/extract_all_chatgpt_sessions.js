
const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  console.log('🧭 ChatGPT 세션 URL 자동 수집 시작...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();
  await page.goto('https://chat.openai.com', { waitUntil: 'networkidle2' });

  console.log('🔐 ChatGPT에 로그인 후, 세션 리스트가 모두 로드될 때까지 기다리세요...');
  await page.waitForSelector('nav');

  await new Promise((resolve) => {
    console.log('\n⏳ [ENTER] 키를 누르면 수집이 시작됩니다.');
    process.stdin.once('data', async () => {
      const sessions = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('nav a'))
          .filter(a => a.href.includes('/c/'))
          .map(a => {
            const title = a.textContent.trim().replace(/\s+/g, ' ');
            const url = a.href;
            return { title, url };
          });
        return links;
      });

      const content = sessions.map(s => `${s.title} | ${s.url}`).join('\n');
      fs.writeFileSync('chatgpt_urls.txt', content, 'utf8');

      console.log(`\n✅ 세션 ${sessions.length}개 저장 완료 → chatgpt_urls.txt`);
      resolve();
    });
  });

  // 자동 브라우저 종료는 하지 않음
})();
