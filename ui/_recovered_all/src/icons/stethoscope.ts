import createLucideIcon from '../createLucideIcon';

/**
 * @component @name Stethoscope
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNC44IDIuM0EuMy4zIDAgMSAwIDUgMkg0YTIgMiAwIDAgMC0yIDJ2NWE2IDYgMCAwIDAgNiA2YTYgNiAwIDAgMCA2LTZWNGEyIDIgMCAwIDAtMi0yaC0xYS4yLjIgMCAxIDAgLjMuMyIgLz4KICA8cGF0aCBkPSJNOCAxNXYxYTYgNiAwIDAgMCA2IDZhNiA2IDAgMCAwIDYtNnYtNCIgLz4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjEwIiByPSIyIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/stethoscope
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Stethoscope = createLucideIcon('Stethoscope', [
  [
    'path',
    {
      d: 'M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3',
      key: '10lez9',
    },
  ],
  ['path', { d: 'M8 15v1a6 6 0 0 0 6 6a6 6 0 0 0 6-6v-4', key: 'ce9bce' }],
  ['circle', { cx: '20', cy: '10', r: '2', key: 'ts1r5v' }],
]);

export default Stethoscope;
