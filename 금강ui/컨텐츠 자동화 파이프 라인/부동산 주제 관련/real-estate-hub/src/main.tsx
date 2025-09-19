/**
 * title: App Entry (엔트리)
 * purpose: React 애플리케이션을 #root에 마운트하고 글로벌 스타일(index.css)을 불러옵니다.
 * created: 2025-09-18T16:20:00Z (2025-09-19T01:20:00+09:00 KST)
 * last_modified: 2025-09-18T16:20:00Z (2025-09-19T01:20:00+09:00 KST)
 * maintainer: Team GG
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
