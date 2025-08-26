# wiki_read_deep.py

import os
import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md
import json
from urllib.parse import urlparse, unquote

# 🧠 사용자 입력 URL
URL = input("📥 읽을 Wikipedia URL을 입력하세요: ").strip()

# 📁 저장 루트
SAVE_ROOT = "../../memory/sources/wiki"

def extract_topic_name(url: str) -> str:
    parsed = urlparse(url)
    topic = parsed.path.split("/")[-1]
    return unquote(topic.replace("_", " "))

def fetch_html(url: str) -> str:
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.text

def extract_main_content(html: str) -> tuple[str, list[str]]:
    soup = BeautifulSoup(html, "html.parser")
    content_div = soup.find("div", {"id": "bodyContent"})
    links = []
    for a in content_div.find_all("a", href=True):
        href = a["href"]
        if href.startswith("/wiki/") and not href.startswith("/wiki/Special:"):
            links.append(f"https://en.wikipedia.org{href}")
    markdown_text = md(str(content_div), heading_style="ATX")
    return markdown_text, sorted(set(links))

def save_to_folder(topic: str, markdown: str, links: list[str], url: str):
    folder = os.path.join(SAVE_ROOT, topic.replace(" ", "_"))
    os.makedirs(folder, exist_ok=True)

    with open(os.path.join(folder, "main.md"), "w", encoding="utf-8") as f:
        f.write(markdown)

    with open(os.path.join(folder, "links.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(links))

    metadata = {
        "topic": topic,
        "url": url,
        "num_links": len(links)
    }
    with open(os.path.join(folder, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

def main():
    print(f"🔎 읽기 시작: {URL}")
    topic = extract_topic_name(URL)
    html = fetch_html(URL)
    markdown, links = extract_main_content(html)
    save_to_folder(topic, markdown, links, URL)
    print(f"✅ 저장 완료: {topic} ({len(links)}개의 링크)")

if __name__ == "__main__":
    main()
