#!/usr/bin/env python3
import os
from PIL import Image, ImageDraw

# Create a simple 32x32 favicon
size = (32, 32)
img = Image.new('RGBA', size, (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Draw a simple blue square with "G" for Gumgang
draw.rectangle([0, 0, 31, 31], fill=(20, 30, 50, 255), outline=(40, 60, 100, 255))
draw.rectangle([4, 4, 27, 27], fill=(40, 60, 100, 255))
draw.text((10, 6), "G", fill=(255, 255, 255, 255))

# Save as ICO with proper format
output_paths = [
    'gumgang-v2/app/favicon.ico',
    'gumgang-v2/public/favicon.ico'
]

for path in output_paths:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, format='ICO', sizes=[(32, 32)])
    print(f"✅ Saved: {path}")

print("✅ Favicon created successfully!")
