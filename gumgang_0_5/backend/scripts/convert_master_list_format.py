import os

# 입력 파일
INPUT_PATH = "/home/duksan/바탕화면/gumgang_0_5/backend/memory/sources/docs/memory_seed_master_list.md"
# 출력 파일 (변환된 버전)
OUTPUT_PATH = "/home/duksan/바탕화면/gumgang_0_5/backend/memory/sources/docs/memory_seed_master_list_converted.md"

with open(INPUT_PATH, "r", encoding="utf-8") as f:
    lines = [line.strip() for line in f.readlines() if line.strip()]

converted_lines = []
i = 0
while i < len(lines) - 2:
    title = lines[i]
    if "한국어" in lines[i + 1] and "영어" in lines[i + 2]:
        url_ko = lines[i + 1].split("|")[-1].strip()
        url_en = lines[i + 2].split("|")[-1].strip()
        converted_lines.append(f"{title} | {url_en} | {url_ko}")
        i += 3
    else:
        i += 1

with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(converted_lines))

print(f"✅ 변환 완료: {OUTPUT_PATH} (총 {len(converted_lines)}개 항목)")
