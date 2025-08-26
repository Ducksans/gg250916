declare module 'xterm' {
  export interface ITerminalOptions {
    convertEol?: boolean;
    fontFamily?: string;
    fontSize?: number;
  }
  export class Terminal {
    constructor(opts?: ITerminalOptions);
    open(el: HTMLElement): void;
    write(data: string): void;
    dispose(): void;
    loadAddon(addon: { activate(t: Terminal): void; dispose?(): void }): void;
  }
}
declare module 'xterm-addon-fit' {
  export class FitAddon {
    activate(t: import('xterm').Terminal): void;
    fit(): void;
    dispose(): void;
  }
}
