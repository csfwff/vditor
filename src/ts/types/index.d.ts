declare module "*.svg";

declare module "*.png";

declare const Lute: ILute;

interface ILuteRender {
    renderLinkDest: (node: {
        TokensStr: () => string;
        __internal_object__: {
            Parent: {
                Type: number,
            },
        }
    }, entering: boolean) => [string, number];
}

interface ILute {
    WalkStop: number;

    New(): ILute;

    SetJSRenderers(options?: {
        renderers: {
            HTML2VditorDOM?: ILuteRender,
            HTML2Md?: ILuteRender,
        },
    }): void;

    SetHeadingAnchor(enable: boolean): void;

    SetInlineMathAllowDigitAfterOpenMarker(enable: boolean): void;

    SetToC(enable: boolean): void;

    SetFootnotes(enable: boolean): void;

    SetAutoSpace(enable: boolean): void;

    SetChinesePunct(enable: boolean): void;

    SetFixTermTypo(enable: boolean): void;

    SetEmojiSite(emojiSite: string): void;

    PutEmojis(emojis: { [key: string]: string }): void;

    GetEmojis(): { [key: string]: string };

    FormatMd(markdown: string): string;

    // debugger md
    RenderEChartsJSON(text: string): string;

    // md 转换为 html
    Md2HTML(markdown: string): string;

    // 粘贴时将 html 转换为 md
    HTML2Md(html: string): string;

    // wysiwyg 转换为 html
    VditorDOM2HTML(vhtml: string): string;

    // wysiwyg 输入渲染
    SpinVditorDOM(html: string): string;

    // 粘贴时将 html 转换为 wysiwyg
    HTML2VditorDOM(html: string): string;

    // 将 wysiwyg 转换为 md
    VditorDOM2Md(html: string): string;

    // 将 md 转换为 wysiwyg
    Md2VditorDOM(markdown: string): string;
}

declare const webkitAudioContext: {
    prototype: AudioContext
    new(contextOptions?: AudioContextOptions): AudioContext,
};

interface IHTMLInputEvent extends Event {
    target: HTMLInputElement & EventTarget;
    screenX: number;
    isComposing: boolean;
    inputType: string;
    key: string;
}

interface II18nLang {
    en_US: string;
    ko_KR: string;
    zh_CN: string;
}

interface II18n {
    en_US: { [key: string]: string };
    ko_KR: { [key: string]: string };
    zh_CN: { [key: string]: string };
}

interface IClasses {
    preview?: string;
}

interface IUpload {
    url?: string;
    max?: number;
    linkToImgUrl?: string;
    token?: string;
    accept?: string;
    withCredentials?: boolean;
    headers?: { [key: string]: string };

    success?(editor: HTMLPreElement, msg: string): void;

    error?(msg: string): void;

    filename?(name: string): string;

    validate?(files: File[]): string | boolean;

    handler?(files: File[]): string | null;

    format?(files: File[], responseText: string): string;

    file?(files: File[]): File[];
}

interface IMenuItem {
    name: string;
    icon?: string;
    tip?: string;
    hotkey?: string;
    suffix?: string;
    prefix?: string;
    tipPosition?: string;

    click?(status?: boolean): void;
}

interface IPreviewMode {
    both: string;
    preview: string;
    editor: string;
}

interface IHljs {
    lineNumber?: boolean;
    style?: string;
    enable?: boolean;
}

interface IMath {
    inlineDigit: boolean;
    macros: object;
    engine: "KaTeX" | "MathJax";
}

interface IMarkdownConfig {
    autoSpace?: boolean;
    fixTermTypo?: boolean;
    chinesePunct?: boolean;
    toc?: boolean;
    footnotes?: boolean;
}

interface IPreview {
    delay?: number;
    maxWidth?: number;
    mode?: keyof IPreviewMode;
    url?: string;
    hljs?: IHljs;
    math?: IMath;
    markdown?: IMarkdownConfig;

    parse?(element: HTMLElement): void;

    transform?(html: string): string;
}

interface IPreviewOptions {
    theme?: "classic" | "dark";
    customEmoji?: { [key: string]: string };
    lang?: (keyof II18nLang);
    emojiPath?: string;
    hljs?: IHljs;
    speech?: {
        enable?: boolean,
    };
    anchor?: boolean;
    math?: IMath;
    cdn?: string;
    markdown?: IMarkdownConfig;

    transform?(html: string): string;
}

interface IHintData {
    html: string;
    value: string;
}

interface IHint {
    emojiTail?: string;
    delay?: number;
    emoji?: { [key: string]: string };
    emojiPath?: string;

    at?(value: string): IHintData[];
}

interface IResize {
    position?: string;
    enable?: boolean;

    after?(height: number): void;
}

interface IOptions {
    value?: string;
    debugger?: boolean;
    after?: () => void;
    typewriterMode?: boolean;
    keymap?: { [key: string]: string };
    height?: number | string;
    width?: number | string;
    placeholder?: string;
    lang?: (keyof II18nLang);
    toolbar?: Array<string | IMenuItem>;
    resize?: IResize;
    counter?: number;
    cache?: boolean;
    mode?: "wysiwyg-show" | "markdown-show" | "wysiwyg-only" | "markdown-only";
    preview?: IPreview;
    hint?: IHint;
    hideToolbar?: boolean;
    theme?: "classic" | "dark";
    upload?: IUpload;
    classes?: IClasses;
    cdn?: string;
    tab?: string;

    input?(value: string, previewElement?: HTMLElement): void;

    focus?(value: string): void;

    blur?(value: string): void;

    esc?(value: string): void;

    ctrlEnter?(value: string): void;

    select?(value: string): void;
}

interface IEChart {
    setOption(option: any): void;

    resize(): void;
}

interface IVditor {
    id: string;
    options: IOptions;
    originalInnerHTML: string;
    lute: ILute;
    currentMode: "markdown" | "wysiwyg";
    currentPreviewMode: keyof IPreviewMode;
    devtools?: {
        element: HTMLDivElement,
        ASTChart: IEChart,
        renderEchart(vditor: IVditor): void,
    };
    toolbar?: {
        elements?: { [key: string]: HTMLElement },
        element?: HTMLElement,
    };
    preview?: {
        element: HTMLElement
        render(vditor: IVditor, value?: string): void,
    };
    editor?: {
        element: HTMLPreElement,
    };
    counter?: {
        element: HTMLElement
        render(length: number, counter: number): void,
    };
    resize?: {
        element: HTMLElement,
    };
    hint?: {
        timeId: number
        element: HTMLDivElement
        fillEmoji(element: HTMLElement, vditor: IVditor): void
        render(vditor: IVditor): void,
    };
    tip: {
        element: HTMLElement
        show(text: string, time?: number): void
        hide(): void,
    };
    upload?: {
        element: HTMLElement
        isUploading: boolean
        range: Range,
    };
    undo: {
        redo(vditor: IVditor): void
        undo(vditor: IVditor): void
        addToUndoStack(vditor: IVditor): void
        recordFirstPosition(vditor: IVditor): void,
        enableIcon(vditor: IVditor): void,
    };
    wysiwygUndo: {
        redo(vditor: IVditor): void
        undo(vditor: IVditor): void
        addToUndoStack(vditor: IVditor): void
        recordFirstWbr(vditor: IVditor, event: KeyboardEvent): void,
        enableIcon(vditor: IVditor): void,
    };
    wysiwyg: {
        element: HTMLPreElement,
        popover: HTMLDivElement,
        afterRenderTimeoutId: number,
        hlToolbarTimeoutId: number,
        preventInput: boolean,
        composingLock: boolean,
        spinVditorDOM(vditor: IVditor, element: HTMLElement): void,
    };
}
