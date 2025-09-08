import createLucideIcon from '../createLucideIcon';

/**
 * @component @name MoveDiagonal
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cG9seWxpbmUgcG9pbnRzPSIxMyA1IDE5IDUgMTkgMTEiIC8+CiAgPHBvbHlsaW5lIHBvaW50cz0iMTEgMTkgNSAxOSA1IDEzIiAvPgogIDxsaW5lIHgxPSIxOSIgeDI9IjUiIHkxPSI1IiB5Mj0iMTkiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/move-diagonal
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const MoveDiagonal = createLucideIcon('MoveDiagonal', [
  ['polyline', { points: '13 5 19 5 19 11', key: '11219e' }],
  ['polyline', { points: '11 19 5 19 5 13', key: 'sfq3wq' }],
  ['line', { x1: '19', x2: '5', y1: '5', y2: '19', key: '1x9vlm' }],
]);

export default MoveDiagonal;
