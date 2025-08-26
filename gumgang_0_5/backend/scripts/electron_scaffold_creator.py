# 📄 ~/바탕화면/gumgang_0_5/backend/scripts/electron_scaffold_creator.py

import os

BASE_DIR = os.path.expanduser("~/바탕화면/gumgang_2_0/electron")
FILES = {
    "main.ts": """import { app, BrowserWindow } from 'electron'
import path from 'path'

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.loadFile(path.join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
""",
    "preload.ts": """import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('gumgang', {
  ping: () => 'pong'
})
"""
}

def create_electron_files() -> dict:
    os.makedirs(BASE_DIR, exist_ok=True)
    created = []
    for filename, content in FILES.items():
        path = os.path.join(BASE_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        created.append(path)

    return {
        "status": "success",
        "message": f"{len(created)}개 Electron scaffold 파일 생성 완료",
        "files": created
    }
