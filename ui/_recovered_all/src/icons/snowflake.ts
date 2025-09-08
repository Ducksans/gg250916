import createLucideIcon from '../createLucideIcon';

/**
 * @component @name Snowflake
 * @description Lucide SVG icon component, renders SVG Element with children.
 *
 * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8bGluZSB4MT0iMiIgeDI9IjIyIiB5MT0iMTIiIHkyPSIxMiIgLz4KICA8bGluZSB4MT0iMTIiIHgyPSIxMiIgeTE9IjIiIHkyPSIyMiIgLz4KICA8cGF0aCBkPSJtMjAgMTYtNC00IDQtNCIgLz4KICA8cGF0aCBkPSJtNCA4IDQgNC00IDQiIC8+CiAgPHBhdGggZD0ibTE2IDQtNCA0LTQtNCIgLz4KICA8cGF0aCBkPSJtOCAyMCA0LTQgNCA0IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/snowflake
 * @see https://lucide.dev/guide/packages/lucide-react - Documentation
 *
 * @param {Object} props - Lucide icons props and any valid SVG attribute
 * @returns {JSX.Element} JSX Element
 *
 */
const Snowflake = createLucideIcon('Snowflake', [
  ['line', { x1: '2', x2: '22', y1: '12', y2: '12', key: '1dnqot' }],
  ['line', { x1: '12', x2: '12', y1: '2', y2: '22', key: '7eqyqh' }],
  ['path', { d: 'm20 16-4-4 4-4', key: 'rquw4f' }],
  ['path', { d: 'm4 8 4 4-4 4', key: '12s3z9' }],
  ['path', { d: 'm16 4-4 4-4-4', key: '1tumq1' }],
  ['path', { d: 'm8 20 4-4 4 4', key: '9p200w' }],
]);

export default Snowflake;
