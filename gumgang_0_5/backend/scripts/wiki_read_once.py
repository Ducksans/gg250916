import os
import requests
from bs4 import BeautifulSoup

def read_and_save(title):
    url = f"https://en.wikipedia.org/wiki/{title}"
    res = requests.get(url)
    if res.status_code != 200:
        print(f"⚠️ 실패: {res.status_code}")
        return

    soup = BeautifulSoup(res.text, "html.parser")
    content = soup.find("div", id="bodyContent")
    if not content:
        print("❌ 본문 찾기 실패")
        return

    paragraphs = content.find_all(["p", "h2", "h3", "ul"])
    lines = [p.get_text().strip() for p in paragraphs if p.get_text().strip()]

    output = f"# {title}\n\n🔗 {url}\n\n" + "\n\n".join(lines[:10])  # 우선 10단락

    save_dir = "./memory/sources/wiki_raw/"
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, f"{title}.md")
    with open(save_path, "w", encoding="utf-8") as f:
        f.write(output)
    
    print(f"✅ 저장 완료: {save_path}")

if __name__ == "__main__":
    read_and_save("C_(programming_language)")
