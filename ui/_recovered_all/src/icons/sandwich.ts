import createLucideIcon from '../createLucideIcon';

/**
 * @component @name Sandwich
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMyAxMXYzYTEgMSAwIDAgMCAxIDFoMTZhMSAxIDAgMCAwIDEtMXYtMyIgLz4KICA8cGF0aCBkPSJNMTIgMTlINGExIDEgMCAwIDEtMS0xdi0yYTEgMSAwIDAgMSAxLTFoMTZhMSAxIDAgMCAxIDEgMXYyYTEgMSAwIDAgMS0xIDFoLTMuODMiIC8+CiAgPHBhdGggZD0ibTMgMTEgNy43Ny02LjA0YTIgMiAwIDAgMSAyLjQ2IDBMMjEgMTFIM1oiIC8+CiAgPHBhdGggZD0iTTEyLjk3IDE5Ljc3IDcgMTVoMTIuNWwtMy43NSA0LjVhMiAyIDAgMCAxLTIuNzguMjdaIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/sandwich
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Sandwich = createLucideIcon('Sandwich', [
  ['path', { d: 'M3 11v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3', key: '34v9d7' }],
  [
    'path',
    {
      d: 'M12 19H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3.83',
      key: '1k5vfb',
    },
  ],
  ['path', { d: 'm3 11 7.77-6.04a2 2 0 0 1 2.46 0L21 11H3Z', key: '1oe7l6' }],
  ['path', { d: 'M12.97 19.77 7 15h12.5l-3.75 4.5a2 2 0 0 1-2.78.27Z', key: '1ts2ri' }],
]);

export default Sandwich;
