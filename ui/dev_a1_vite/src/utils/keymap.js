const DEFAULT_KEYMAP = {
  'nav.chat': 'mod+1',
  'nav.ide': 'mod+2',
  'panel.explorer.toggle': 'mod+b',
  'panel.chat.toggle': 'mod+j',
  'editor.quickOpen': 'mod+p',
  'editor.tabClose': 'mod+w',
};

export function getKeymap() {
  try {
    const raw = localStorage.getItem('GG_KEYMAP');
    if (!raw) return { ...DEFAULT_KEYMAP };
    const user = JSON.parse(raw);
    return { ...DEFAULT_KEYMAP, ...(user || {}) };
  } catch {
    return { ...DEFAULT_KEYMAP };
  }
}

export function setKeymap(map) {
  try { localStorage.setItem('GG_KEYMAP', JSON.stringify(map || {})); } catch {}
}

function _norm(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.shiftKey) parts.push('shift');
  const k = (e.key || '').toLowerCase();
  parts.push(k);
  return parts.join('+');
}

export function matchKey(e, action) {
  const map = getKeymap();
  const seq = (map[action] || '').toLowerCase();
  if (!seq) return false;
  return _norm(e) === seq;
}

export const DEFAULT_ACTIONS = [
  { id: 'nav.chat', label: 'Go to Chat' },
  { id: 'nav.ide', label: 'Go to IDE' },
  { id: 'panel.explorer.toggle', label: 'Toggle Explorer' },
  { id: 'panel.chat.toggle', label: 'Toggle Chat' },
  { id: 'editor.quickOpen', label: 'Quick Open' },
  { id: 'editor.tabClose', label: 'Close Tab' },
];

