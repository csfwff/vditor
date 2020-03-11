import {getMarkdown} from "../util/getMarkdown";
import {formatRender} from "../editor/formatRender";
import {renderDomByMd} from "../wysiwyg/renderDomByMd";

export const setMode = (mode: "markdown" | "wysiwyg", vditor: IVditor) => {
    if (vditor.currentMode === mode) {
        return;
    }

    switch (mode) {
        case "markdown":
            vditor.wysiwyg.element.parentElement.style.display = "none";
            if (vditor.currentPreviewMode === "both") {
                vditor.editor.element.style.display = "block";
                vditor.preview.element.style.display = "block";
            } else if (vditor.currentPreviewMode === "preview") {
                vditor.preview.element.style.display = "block";
            } else if (vditor.currentPreviewMode === "editor") {
                vditor.editor.element.style.display = "block";
            }
            if (vditor.toolbar.elements.format) {
                vditor.toolbar.elements.format.style.display = "block";
            }
            if (vditor.toolbar.elements.both) {
                vditor.toolbar.elements.both.style.display = "block";
            }
            if (vditor.toolbar.elements.preview) {
                vditor.toolbar.elements.preview.style.display = "block";
            }
            const wysiwygMD = getMarkdown(vditor);
            vditor.currentMode = "markdown";
            formatRender(vditor, wysiwygMD, undefined);
            vditor.editor.element.focus();
            break;
        case "wysiwyg":
            vditor.editor.element.style.display = "none";
            vditor.preview.element.style.display = "none";
            vditor.wysiwyg.element.parentElement.style.display = "block";

            if (vditor.toolbar.elements.format) {
                vditor.toolbar.elements.format.style.display = "none";
            }
            if (vditor.toolbar.elements.both) {
                vditor.toolbar.elements.both.style.display = "none";
            }
            if (vditor.toolbar.elements.preview) {
                vditor.toolbar.elements.preview.style.display = "none";
            }
            const editorMD = getMarkdown(vditor);
            vditor.currentMode = "wysiwyg";
            renderDomByMd(vditor, editorMD);
            vditor.wysiwyg.element.focus();
            vditor.wysiwyg.popover.style.display = "none";
            break;

        default:
            break;
    }

    if (vditor.hint) {
        vditor.hint.element.style.display = "none";
    }
    if (vditor.toolbar.elements.headings) {
        (vditor.toolbar.elements.headings.children[1] as HTMLElement).style.display = "none";
    }
    if (vditor.toolbar.elements.emoji) {
        (vditor.toolbar.elements.emoji.children[1] as HTMLElement).style.display = "none";
    }
    if (vditor.devtools && vditor.devtools.ASTChart && vditor.devtools.element.style.display === "block") {
        vditor.devtools.ASTChart.resize();
    }

    if (vditor.devtools && vditor.devtools.ASTChart && vditor.devtools.element.style.display === "block") {
        vditor.devtools.ASTChart.resize();
    }
};
