import {getSelectPosition} from "../editor/getSelectPosition";
import {setSelectionByPosition, setSelectionFocus} from "../editor/setSelection";
import {uploadFiles} from "../upload";
import {isCtrl} from "../util/compatibility";
import {focusEvent, hotkeyEvent, selectEvent} from "../util/editorCommenEvent";
import {
    hasClosestBlock, hasClosestByAttribute,
    hasClosestByClassName, hasClosestByMatchTag,
} from "../util/hasClosest";
import {log} from "../util/log";
import {processPasteCode} from "../util/processPasteCode";
import {addP2Li} from "./addP2Li";
import {afterRenderEvent} from "./afterRenderEvent";
import {highlightToolbar} from "./highlightToolbar";
import {getRenderElementNextNode, modifyPre} from "./inlineTag";
import {input} from "./input";
import {insertHTML} from "./insertHTML";
import {processCodeRender, showCode} from "./processCodeRender";
import {isHeadingMD, isHrMD, isToC} from "./processMD";
import {setRangeByWbr} from "./setRangeByWbr";

class WYSIWYG {
    public element: HTMLPreElement;
    public popover: HTMLDivElement;
    public afterRenderTimeoutId: number;
    public hlToolbarTimeoutId: number;
    public preventInput: boolean;
    public composingLock: boolean = false;

    constructor(vditor: IVditor) {
        const divElement = document.createElement("div");
        divElement.className = "vditor-wysiwyg";

        divElement.innerHTML = `<pre class="vditor-reset" placeholder="${vditor.options.placeholder}"
 contenteditable="true" spellcheck="false"></pre>
<div class="vditor-panel vditor-panel--none"></div>`;

        this.element = divElement.firstElementChild as HTMLPreElement;

        this.popover = divElement.lastElementChild as HTMLDivElement;

        if (vditor.currentMode === "markdown") {
            this.element.parentElement.style.display = "none";
        }

        this.bindEvent(vditor);

        document.execCommand("DefaultParagraphSeparator", false, "p");

        focusEvent(vditor, this.element);
        hotkeyEvent(vditor, this.element);
        selectEvent(vditor, this.element);
    }

    public spinVditorDOM(vditor: IVditor, element: HTMLElement) {
        let html = "";
        if (element.getAttribute("data-type") === "link-ref-defs-block" || isToC(element.innerText)) {
            // 修改链接引用或 ToC
            element = this.element;
        }

        addP2Li(vditor.wysiwyg.element);

        const isWYSIWYGElement = element.isEqualNode(this.element);

        if (!isWYSIWYGElement) {
            // 修改脚注
            const footnoteElement = hasClosestByAttribute(element, "data-type", "footnotes-block");
            if (footnoteElement) {
                element = footnoteElement;
            }

            html = element.outerHTML;

            if (element.tagName === "UL" || element.tagName === "OL") {
                // 如果为列表的话，需要把上下的列表都重绘
                const listPrevElement = element.previousElementSibling;
                const listNextElement = element.nextElementSibling;
                if (listPrevElement && (listPrevElement.tagName === "UL" || listPrevElement.tagName === "OL")) {
                    html = listPrevElement.outerHTML + html;
                    listPrevElement.remove();
                }
                if (listNextElement && (listNextElement.tagName === "UL" || listNextElement.tagName === "OL")) {
                    html = html + listNextElement.outerHTML;
                    listNextElement.remove();
                }
                // firefox 列表回车不会产生新的 list item https://github.com/Vanessa219/vditor/issues/194
                html = html.replace("<div><wbr><br></div>", "<li><p><wbr><br></p></li>");
            }

            // 添加链接引用
            const allLinkRefDefsElement = this.element.querySelector("[data-type='link-ref-defs-block']");
            if (allLinkRefDefsElement && !element.isEqualNode(allLinkRefDefsElement)) {
                html += allLinkRefDefsElement.outerHTML;
                allLinkRefDefsElement.remove();
            }
            // 添加脚注
            const allFootnoteElement = this.element.querySelector("[data-type='footnotes-block']");
            if (allFootnoteElement && !element.isEqualNode(allFootnoteElement)) {
                html += allFootnoteElement.outerHTML;
                allFootnoteElement.remove();
            }
        } else {
            html = element.innerHTML;
        }

        // 合并多个 em， strong，s。以防止多个相同元素在一起时不满足 commonmark 规范，出现标记符
        html = html.replace(/<\/(strong|b)><strong data-marker="\W{2}">/g, "")
            .replace(/<\/(em|i)><em data-marker="\W{1}">/g, "")
            .replace(/<\/(s|strike)><s data-marker="~{1,2}">/g, "");

        log("SpinVditorDOM", html, "argument", vditor.options.debugger);

        html = vditor.lute.SpinVditorDOM(html);

        log("SpinVditorDOM", html, "result", vditor.options.debugger);

        if (isWYSIWYGElement) {
            element.innerHTML = html;
        } else {
            element.outerHTML = html;
            const allLinkRefDefsElement = this.element.querySelector("[data-type='link-ref-defs-block']");
            if (allLinkRefDefsElement) {
                this.element.insertAdjacentElement("beforeend", allLinkRefDefsElement);
            }

            const allFootnoteElement = this.element.querySelector("[data-type='footnotes-block']");
            if (allFootnoteElement) {
                this.element.insertAdjacentElement("beforeend", allFootnoteElement);
            }
        }
    }

    private bindEvent(vditor: IVditor) {
        if (vditor.options.upload.url || vditor.options.upload.handler) {
            this.element.addEventListener("drop",
                (event: CustomEvent & { dataTransfer?: DataTransfer, target: HTMLElement }) => {
                    if (event.dataTransfer.types[0] !== "Files") {
                        return;
                    }
                    const files = event.dataTransfer.items;
                    if (files.length > 0) {
                        uploadFiles(vditor, files);
                    }
                    event.preventDefault();
                });
        }

        this.element.addEventListener("scroll", () => {
            if (this.popover.style.display !== "block") {
                return;
            }
            this.popover.style.top = Math.max(-11,
                parseInt(this.popover.getAttribute("data-top"), 10) - vditor.wysiwyg.element.scrollTop) + "px";
        });

        this.element.addEventListener("copy", (event: ClipboardEvent & { target: HTMLElement }) => {
            const range = getSelection().getRangeAt(0);
            if (range.toString() === "") {
                return;
            }
            event.stopPropagation();
            event.preventDefault();

            const codeElement = hasClosestByMatchTag(range.startContainer, "CODE");
            if (codeElement) {
                let codeText = "";
                if (codeElement.parentElement.tagName === "PRE") {
                    codeText = range.toString();
                } else {
                    codeText = "`" + range.toString() + "`";
                }
                event.clipboardData.setData("text/plain", codeText);
                event.clipboardData.setData("text/html", "");
                return;
            }

            const aElement = hasClosestByMatchTag(range.startContainer, "A");
            const aEndElement = hasClosestByMatchTag(range.endContainer, "A");
            if (aElement && aEndElement && aEndElement.isEqualNode(aElement)) {
                let aTitle = aElement.getAttribute("title") || "";
                if (aTitle) {
                    aTitle = ` "${aTitle}"`;
                }
                event.clipboardData.setData("text/plain",
                    `[${range.toString()}](${aElement.getAttribute("href")}${aTitle})`);
                event.clipboardData.setData("text/html", "");
                return;
            }

            const tempElement = document.createElement("div");
            tempElement.appendChild(range.cloneContents());

            addP2Li(tempElement);

            event.clipboardData.setData("text/plain", vditor.lute.VditorDOM2Md(tempElement.innerHTML).trim());
            event.clipboardData.setData("text/html", "");
        });

        this.element.addEventListener("paste", (event: ClipboardEvent & { target: HTMLElement }) => {
            event.stopPropagation();
            event.preventDefault();
            let textHTML = event.clipboardData.getData("text/html");
            const textPlain = event.clipboardData.getData("text/plain");

            // 浏览器地址栏拷贝处理
            if (textHTML.replace(/<(|\/)(html|body|meta)[^>]*?>/ig, "").trim() ===
                `<a href="${textPlain}">${textPlain}</a>` ||
                textHTML.replace(/<(|\/)(html|body|meta)[^>]*?>/ig, "").trim() ===
                `<!--StartFragment--><a href="${textPlain}">${textPlain}</a><!--EndFragment-->`) {
                textHTML = "";
            }

            // process word
            const doc = new DOMParser().parseFromString(textHTML, "text/html");
            if (doc.body) {
                textHTML = doc.body.innerHTML;
            }

            // process code
            const code = processPasteCode(textHTML, textPlain, "wysiwyg");
            const range = getSelection().getRangeAt(0);
            const codeElement = hasClosestByMatchTag(event.target, "CODE");
            if (codeElement) {
                // 粘贴在代码位置
                const position = getSelectPosition(event.target);
                codeElement.textContent = codeElement.textContent.substring(0, position.start)
                    + textPlain + codeElement.textContent.substring(position.end);
                setSelectionByPosition(position.start + textPlain.length, position.start + textPlain.length,
                    codeElement.parentElement);
            } else if (code) {
                const node = document.createElement("div");
                node.innerHTML = `<div class="vditor-wysiwyg__block" data-block="0" data-type="code-block"><pre><code>${
                    code.replace(/&/g, "&amp;").replace(/</g, "&lt;")}<wbr></code></pre></div>`;
                range.insertNode(node.firstChild);
                const blockElement = hasClosestByAttribute(range.startContainer, "data-block", "0");
                if (blockElement) {
                    blockElement.outerHTML = vditor.lute.SpinVditorDOM(blockElement.outerHTML);
                }
                vditor.wysiwyg.element.querySelectorAll(".vditor-wysiwyg__block").forEach(
                    (blockRenderItem: HTMLElement) => {
                        processCodeRender(blockRenderItem, vditor);
                    });
                setRangeByWbr(vditor.wysiwyg.element, range);
            } else {
                if (textHTML.trim() !== "") {
                    const tempElement = document.createElement("div");
                    tempElement.innerHTML = textHTML;
                    tempElement.querySelectorAll("[style]").forEach((e) => {
                        e.removeAttribute("style");
                    });
                    addP2Li(tempElement);
                    vditor.lute.SetJSRenderers({
                        renderers: {
                            HTML2VditorDOM: {
                                renderLinkDest: (node) => {
                                    const src = node.TokensStr();
                                    if (node.__internal_object__.Parent.Type === 34 && src
                                        && src.indexOf("file://") === -1 && vditor.options.upload.linkToImgUrl) {
                                        const xhr = new XMLHttpRequest();
                                        xhr.open("POST", vditor.options.upload.linkToImgUrl);
                                        xhr.onreadystatechange = () => {
                                            if (xhr.readyState === XMLHttpRequest.DONE) {
                                                const responseJSON = JSON.parse(xhr.responseText);
                                                if (xhr.status === 200) {
                                                    if (responseJSON.code !== 0) {
                                                        vditor.tip.show(responseJSON.msg);
                                                        return;
                                                    }
                                                    const original = responseJSON.data.originalURL;
                                                    const imgElement: HTMLImageElement =
                                                        this.element.querySelector(`img[src="${original}"]`);
                                                    imgElement.src = responseJSON.data.url;
                                                    afterRenderEvent(vditor);
                                                } else {
                                                    vditor.tip.show(responseJSON.msg);
                                                }
                                            }
                                        };
                                        xhr.send(JSON.stringify({url: src}));
                                    }
                                    return ["", Lute.WalkStop];
                                },
                            },
                        },
                    });
                    const pasteHTML = vditor.lute.HTML2VditorDOM(tempElement.innerHTML);
                    insertHTML(pasteHTML, vditor);
                } else if (event.clipboardData.files.length > 0 && vditor.options.upload.url) {
                    uploadFiles(vditor, event.clipboardData.files);
                } else if (textPlain.trim() !== "" && event.clipboardData.files.length === 0) {
                    const vditorDomHTML = vditor.lute.Md2VditorDOM(textPlain);
                    insertHTML(vditorDomHTML, vditor);
                }
            }

            this.element.querySelectorAll(".vditor-wysiwyg__block").forEach((blockElement: HTMLElement) => {
                processCodeRender(blockElement, vditor);
            });

            afterRenderEvent(vditor);
        });

        // 中文处理
        this.element.addEventListener("compositionstart", (event: IHTMLInputEvent) => {
            this.composingLock = true;
        });

        this.element.addEventListener("compositionend", (event: IHTMLInputEvent) => {
            const blockElement = hasClosestBlock(getSelection().getRangeAt(0).startContainer);
            if (blockElement && blockElement.tagName.indexOf("H") === 0 && blockElement.textContent === ""
                && blockElement.tagName.length === 2) {
                // heading 为空删除 https://github.com/Vanessa219/vditor/issues/150
                return;
            }
            input(vditor, getSelection().getRangeAt(0).cloneRange(), event);
        });

        this.element.addEventListener("input", (event: IHTMLInputEvent) => {
            if (this.preventInput) {
                this.preventInput = false;
                return;
            }
            if (this.composingLock) {
                return;
            }
            const range = getSelection().getRangeAt(0);
            let blockElement = hasClosestBlock(range.startContainer);
            if (!blockElement) {
                // 没有被块元素包裹
                modifyPre(vditor, range);
                blockElement = hasClosestBlock(range.startContainer);
            }
            if (!blockElement) {
                return;
            }

            // 前后空格处理
            const startOffset = getSelectPosition(blockElement, range).start;

            // 开始可以输入空格
            let startSpace = true;
            for (let i = startOffset - 1; i >= 0; i--) {
                if (blockElement.textContent.charAt(i) !== " " &&
                    // 多个 tab 前删除不形成代码块 https://github.com/Vanessa219/vditor/issues/162 1
                    blockElement.textContent.charAt(i) !== "\t") {
                    startSpace = false;
                    break;
                }
            }
            if (startOffset === 0) {
                startSpace = false;
            }

            // 结尾可以输入空格
            let endSpace = true;
            for (let i = startOffset - 1; i < blockElement.textContent.length; i++) {
                if (blockElement.textContent.charAt(i) !== " " && blockElement.textContent.charAt(i) !== "\n") {
                    endSpace = false;
                    break;
                }
            }

            if (blockElement.tagName.indexOf("H") === 0 && blockElement.textContent === ""
                && blockElement.tagName.length === 2) {
                // heading 为空删除 https://github.com/Vanessa219/vditor/issues/150
                return;
            }

            if (startSpace || endSpace || isHrMD(blockElement.innerHTML) || isHeadingMD(blockElement.innerHTML)) {
                return;
            }

            input(vditor, range, event);
        });

        this.element.addEventListener("click", (event: IHTMLInputEvent) => {
            if (event.target.tagName === "INPUT") {
                if (event.target.checked) {
                    event.target.setAttribute("checked", "checked");
                } else {
                    event.target.removeAttribute("checked");
                }
                this.preventInput = true;
                afterRenderEvent(vditor);
                return;
            }

            if (event.target.tagName === "IMG") {
                const range = this.element.ownerDocument.createRange();
                range.selectNode(event.target);
                range.collapse(true);
                setSelectionFocus(range);
            }

            highlightToolbar(vditor);

            // 点击后光标落于预览区，需展开代码块
            let previewElement = hasClosestByClassName(event.target, "vditor-wysiwyg__preview");
            if (!previewElement) {
                previewElement = hasClosestByClassName(getSelection().getRangeAt(0).startContainer, "vditor-wysiwyg__preview");
            }
            if (previewElement) {
                showCode(previewElement);
            }
        });

        this.element.addEventListener("keyup", (event: KeyboardEvent & { target: HTMLElement }) => {
            if (event.isComposing || isCtrl(event)) {
                return;
            }

            if ((event.key === "Backspace" || event.key === "Delete") &&
                vditor.wysiwyg.element.innerHTML !== "" && vditor.wysiwyg.element.childNodes.length === 1 &&
                vditor.wysiwyg.element.firstElementChild && vditor.wysiwyg.element.firstElementChild.tagName === "P"
                && (vditor.wysiwyg.element.textContent === "" || vditor.wysiwyg.element.textContent === "\n")) {
                // 为空时显示 placeholder
                vditor.wysiwyg.element.innerHTML = "";
            }

            const range = getSelection().getRangeAt(0);

            // 没有被块元素包裹
            modifyPre(vditor, range);

            highlightToolbar(vditor);

            if (event.key !== "ArrowDown" && event.key !== "ArrowRight" && event.key !== "Backspace"
                && event.key !== "ArrowLeft" && event.key !== "ArrowUp") {
                return;
            }

            // 上下左右，删除遇到块预览的处理
            let previewElement = hasClosestByClassName(range.startContainer, "vditor-wysiwyg__preview");
            if (!previewElement && range.startContainer.nodeType !== 3 && range.startOffset > 0) {
                // table 前删除遇到代码块
                const blockRenderElement = range.startContainer as HTMLElement;
                if (blockRenderElement.classList.contains("vditor-wysiwyg__block")) {
                    previewElement = blockRenderElement.lastElementChild as HTMLElement;
                }
            }
            if (!previewElement) {
                return;
            }
            const previousElement = previewElement.previousElementSibling as HTMLElement;
            if (previousElement.style.display === "none") {
                if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    showCode(previewElement);
                } else {
                    showCode(previewElement, false);
                }
                return;
            }

            let codeElement = previewElement.previousElementSibling as HTMLElement;
            if (codeElement.tagName === "PRE") {
                codeElement = codeElement.firstElementChild as HTMLElement;
            }

            if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                const blockRenderElement = previewElement.parentElement;
                let nextNode = getRenderElementNextNode(blockRenderElement) as HTMLElement;
                if (nextNode && nextNode.nodeType !== 3) {
                    // 下一节点依旧为代码渲染块
                    const nextRenderElement = nextNode.querySelector(".vditor-wysiwyg__preview") as HTMLElement;
                    if (nextRenderElement) {
                        showCode(nextRenderElement);
                        return;
                    }
                }
                // 跳过渲染块，光标移动到下一个节点
                if (nextNode.nodeType === 3) {
                    // inline
                    while (nextNode.textContent.length === 0 && nextNode.nextSibling) {
                        // https://github.com/Vanessa219/vditor/issues/100 2
                        nextNode = nextNode.nextSibling as HTMLElement;
                    }
                    range.setStart(nextNode, 1);
                } else {
                    // block
                    range.setStart(nextNode.firstChild, 0);
                }
            } else {
                range.selectNodeContents(codeElement);
                range.collapse(false);
            }
        });
    }
}

export {WYSIWYG};
