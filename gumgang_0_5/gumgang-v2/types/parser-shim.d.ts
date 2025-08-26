// Minimal parser type shims for code analysis
// To be replaced with official @types when properly configured

declare module "@typescript-eslint/parser" {
  export interface ParserOptions {
    ecmaVersion?: number | "latest";
    sourceType?: "script" | "module";
    ecmaFeatures?: {
      jsx?: boolean;
      globalReturn?: boolean;
      impliedStrict?: boolean;
    };
    range?: boolean;
    loc?: boolean;
    comment?: boolean;
    tokens?: boolean;
    project?: string | string[];
    tsconfigRootDir?: string;
    extraFileExtensions?: string[];
    warnOnUnsupportedTypeScriptVersion?: boolean;
    createDefaultProgram?: boolean;
  }

  export interface ParseResult {
    type: string;
    body: any[];
    sourceType: "script" | "module";
    range?: [number, number];
    loc?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    };
    tokens?: any[];
    comments?: any[];
  }

  export function parse(code: string, options?: ParserOptions): ParseResult;
  export function parseForESLint(code: string, options?: ParserOptions): {
    ast: ParseResult;
    services: any;
    visitorKeys: any;
    scopeManager: any;
  };
}

declare module "acorn" {
  export interface Position {
    line: number;
    column: number;
  }

  export interface SourceLocation {
    start: Position;
    end: Position;
    source?: string | null;
  }

  export interface Node {
    type: string;
    start: number;
    end: number;
    loc?: SourceLocation;
    range?: [number, number];
    [key: string]: any;
  }

  export interface Options {
    ecmaVersion?: number | "latest";
    sourceType?: "script" | "module";
    onInsertedSemicolon?: (lastTokEnd: number, lastTokEndLoc?: Position) => void;
    onTrailingComma?: (lastTokEnd: number, lastTokEndLoc?: Position) => void;
    allowReserved?: boolean | "never";
    allowReturnOutsideFunction?: boolean;
    allowImportExportEverywhere?: boolean;
    allowAwaitOutsideFunction?: boolean;
    allowHashBang?: boolean;
    locations?: boolean;
    onToken?: ((token: Token) => any) | Token[];
    onComment?: (
      isBlock: boolean,
      text: string,
      start: number,
      end: number,
      startLoc?: Position,
      endLoc?: Position
    ) => void | Comment[];
    ranges?: boolean;
    program?: Node;
    sourceFile?: string;
    directSourceFile?: string;
    preserveParens?: boolean;
  }

  export interface Token {
    type: {
      label: string;
      keyword?: string;
      beforeExpr?: boolean;
      startsExpr?: boolean;
      isLoop?: boolean;
      isAssign?: boolean;
      prefix?: boolean;
      postfix?: boolean;
      binop?: number;
      updateContext?: (prevType: TokenType) => void;
    };
    value: any;
    start: number;
    end: number;
    loc?: SourceLocation;
    range?: [number, number];
  }

  export interface TokenType {
    label: string;
    keyword?: string;
    beforeExpr?: boolean;
    startsExpr?: boolean;
    isLoop?: boolean;
    isAssign?: boolean;
    prefix?: boolean;
    postfix?: boolean;
    binop?: number;
    updateContext?: (prevType: TokenType) => void;
  }

  export interface Comment {
    type: "Line" | "Block";
    value: string;
    start: number;
    end: number;
    loc?: SourceLocation;
    range?: [number, number];
  }

  export function parse(input: string, options?: Options): Node;
  export function parseExpressionAt(input: string, pos: number, options?: Options): Node;
  export function tokenizer(input: string, options?: Options): {
    getToken(): Token | null;
    [Symbol.iterator](): Iterator<Token>;
  };

  export const version: string;
}

declare module "acorn-walk" {
  import { Node } from "acorn";

  export type WalkerCallback<TState = any> = (
    node: Node,
    state: TState,
    type?: string
  ) => void;

  export type RecursiveWalkerFn<TState = any> = (
    node: Node,
    state: TState,
    callback: WalkerCallback<TState>
  ) => void;

  export type SimpleWalkerFn<TState = any> = (
    node: Node,
    state: TState
  ) => void;

  export type AncestorWalkerFn<TState = any> = (
    node: Node,
    state: TState,
    ancestors: Node[]
  ) => void;

  export type FullWalkerCallback<TState = any> = (
    node: Node,
    state: TState,
    type: string
  ) => void;

  export type FullAncestorWalkerCallback<TState = any> = (
    node: Node,
    state: TState,
    ancestors: Node[],
    type: string
  ) => void;

  export interface SimpleVisitors<TState = any> {
    [nodeType: string]: SimpleWalkerFn<TState>;
  }

  export interface AncestorVisitors<TState = any> {
    [nodeType: string]: AncestorWalkerFn<TState>;
  }

  export interface RecursiveVisitors<TState = any> {
    [nodeType: string]: RecursiveWalkerFn<TState>;
  }

  export interface FindPredicate {
    (nodeType: string, node: Node): boolean;
  }

  export interface Found<TState = any> {
    node: Node;
    state: TState;
  }

  export function simple<TState>(
    node: Node,
    visitors: SimpleVisitors<TState>,
    baseVisitor?: SimpleVisitors<TState>,
    state?: TState,
    override?: boolean
  ): void;

  export function ancestor<TState>(
    node: Node,
    visitors: AncestorVisitors<TState>,
    baseVisitor?: AncestorVisitors<TState>,
    state?: TState,
    override?: boolean
  ): void;

  export function recursive<TState>(
    node: Node,
    state: TState,
    funcs: RecursiveVisitors<TState>,
    baseVisitor?: RecursiveVisitors<TState>,
    override?: boolean
  ): void;

  export function full<TState>(
    node: Node,
    callback: FullWalkerCallback<TState>,
    baseVisitor?: RecursiveVisitors<TState>,
    state?: TState,
    override?: boolean
  ): void;

  export function fullAncestor<TState>(
    node: Node,
    callback: FullAncestorWalkerCallback<TState>,
    baseVisitor?: RecursiveVisitors<TState>,
    state?: TState,
    override?: boolean
  ): void;

  export function make<TState>(
    funcs: RecursiveVisitors<TState>,
    baseVisitor?: RecursiveVisitors<TState>
  ): RecursiveVisitors<TState>;

  export function findNodeAt<TState>(
    node: Node,
    start: number | null,
    end: number | null,
    test: FindPredicate | string,
    baseVisitor?: RecursiveVisitors<TState>,
    state?: TState
  ): Found<TState> | undefined;

  export function findNodeAround<TState>(
    node: Node,
    pos: number,
    test: FindPredicate | string,
    baseVisitor?: RecursiveVisitors<TState>,
    state?: TState
  ): Found<TState> | undefined;

  export function findNodeAfter<TState>(
    node: Node,
    pos: number,
    test: FindPredicate | string,
    baseVisitor?: RecursiveVisitors<TState>,
    state?: TState
  ): Found<TState> | undefined;

  export function findNodeBefore<TState>(
    node: Node,
    pos: number,
    test: FindPredicate | string,
    baseVisitor?: RecursiveVisitors<TState>,
    state?: TState
  ): Found<TState> | undefined;

  export const base: RecursiveVisitors<any>;
}
