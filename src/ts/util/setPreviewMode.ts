import {removeCurrentToolbar} from "../toolbar/removeCurrentToolbar";
import {setCurrentToolbar} from "../toolbar/setCurrentToolbar";

export const setPreviewMode = (mode: keyof IPreviewMode, vditor: IVditor) => {
    if (vditor.currentPreviewMode === mode) {
        return;
    }
    vditor.currentPreviewMode = mode;

    switch (mode) {
        case "both":
            vditor.editor.element.style.display = "block";
            vditor.preview.element.style.display = "block";
            vditor.preview.render(vditor);

            setCurrentToolbar(vditor.toolbar.elements, ["both"]);
            removeCurrentToolbar(vditor.toolbar.elements, ["preview"]);

            break;
        case "editor":
            vditor.editor.element.style.display = "block";
            vditor.preview.element.style.display = "none";

            removeCurrentToolbar(vditor.toolbar.elements, ["preview"]);
            removeCurrentToolbar(vditor.toolbar.elements, ["both"]);

            break;
        case "preview":
            vditor.editor.element.style.display = "none";
            vditor.preview.element.style.display = "block";
            vditor.preview.render(vditor);
            vditor.editor.element.blur();

            setCurrentToolbar(vditor.toolbar.elements, ["preview"]);
            removeCurrentToolbar(vditor.toolbar.elements, ["both"]);

            break;
        default:
            break;
    }

    if (vditor.devtools && vditor.devtools.ASTChart && vditor.devtools.element.style.display === "block") {
        vditor.devtools.ASTChart.resize();
    }
};
