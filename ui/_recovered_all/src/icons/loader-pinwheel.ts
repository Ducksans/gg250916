import createLucideIcon from '../createLucideIcon';

/**
 * @component @name LoaderPinwheel
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMiAxMmMwLTIuOCAyLjItNSA1LTVzNSAyLjIgNSA1IDIuMiA1IDUgNSA1LTIuMiA1LTUiIC8+CiAgPHBhdGggZD0iTTcgMjAuN2ExIDEgMCAxIDEgNS04LjcgMSAxIDAgMSAwIDUtOC42IiAvPgogIDxwYXRoIGQ9Ik03IDMuM2ExIDEgMCAxIDEgNSA4LjYgMSAxIDAgMSAwIDUgOC42IiAvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/loader-pinwheel
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const LoaderPinwheel = createLucideIcon('LoaderPinwheel', [
  ['path', { d: 'M2 12c0-2.8 2.2-5 5-5s5 2.2 5 5 2.2 5 5 5 5-2.2 5-5', key: '1cg5zf' }],
  ['path', { d: 'M7 20.7a1 1 0 1 1 5-8.7 1 1 0 1 0 5-8.6', key: '1gnrpi' }],
  ['path', { d: 'M7 3.3a1 1 0 1 1 5 8.6 1 1 0 1 0 5 8.6', key: 'u9yy5q' }],
  ['circle', { cx: '12', cy: '12', r: '10', key: '1mglay' }],
]);

export default LoaderPinwheel;
