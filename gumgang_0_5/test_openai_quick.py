#!/usr/bin/env python3
"""
Quick OpenAI API Test Script
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
env_path = Path(__file__).parent / "backend" / ".env"
load_dotenv(env_path)

# Get API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("❌ No OpenAI API key found in backend/.env")
    sys.exit(1)

print(f"✅ API Key found: {api_key[:20]}...")

# Initialize OpenAI client
try:
    client = OpenAI(api_key=api_key)

    # Simple test
    print("\n🧪 Testing OpenAI API...")
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say 'Hello from Gumgang 2.0!' in Korean"}
        ],
        max_tokens=50
    )

    print(f"✅ Response: {response.choices[0].message.content}")
    print("\n🎉 OpenAI API is working!")

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
