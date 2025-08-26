/** 공용 에디터 테마 타입 정의 */

/**
 * Monaco Editor 기본 테마 + 커스텀 테마 지원
 * - vs-dark: Visual Studio Dark (기본)
 * - vs-light: Visual Studio Light
 * - hc-black: High Contrast Black
 * - hc-light: High Contrast Light
 * - 커스텀 문자열 테마도 허용
 */
export type EditorTheme =
  | 'vs-dark'
  | 'vs-light'
  | 'hc-black'
  | 'hc-light'
  | 'vs'  // 레거시 호환
  | 'light'  // 레거시 호환
  | (string & {});  // 커스텀 테마 문자열 허용

/**
 * FileEditor 컴포넌트용 테마 (제한적)
 */
export type FileEditorTheme = 'vs-dark' | 'light';

/**
 * 테마 변환 헬퍼 타입
 */
export type ThemeResolver = (theme: EditorTheme) => FileEditorTheme;

/**
 * 기본 테마 상수
 */
export const DEFAULT_THEME: EditorTheme = 'vs-dark';

/**
 * 테마 매핑 헬퍼
 */
export const resolveFileEditorTheme = (theme?: EditorTheme): FileEditorTheme => {
  if (!theme) return 'vs-dark';

  switch (theme) {
    case 'vs-light':
    case 'light':
    case 'hc-light':
      return 'light';
    case 'vs-dark':
    case 'vs':
    case 'hc-black':
    default:
      return 'vs-dark';
  }
};
