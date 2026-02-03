declare module '@pm2/blessed' {
  export interface Screen {
    program: any;
    autoPadding: boolean;
    key(keys: string | string[], callback: (ch: string, key: any) => void): void;
    render(): void;
    destroy(): void;
  }
  
  export interface Box {
    content: string;
    setContent(text: string): void;
    focus(): void;
    hide(): void;
    show(): void;
  }
  
  export function screen(options?: any): Screen;
  export function box(options?: any): Box;
  export function list(options?: any): any;
  export function form(options?: any): any;
  export function input(options?: any): any;
  export function textarea(options?: any): any;
  export function button(options?: any): any;
  export function progressbar(options?: any): any;
  export function table(options?: any): any;
  export function log(options?: any): any;
  
  const blessed: {
    screen: typeof screen;
    box: typeof box;
    list: typeof list;
    form: typeof form;
    input: typeof input;
    textarea: typeof textarea;
    button: typeof button;
    progressbar: typeof progressbar;
    table: typeof table;
    log: typeof log;
  };
  
  export default blessed;
}

declare module 'puppeteer-screen-recorder' {
  export class PuppeteerScreenRecorder {
    constructor(page: any, config?: any);
    start(path: string): Promise<void>;
    stop(): Promise<void>;
  }
}
