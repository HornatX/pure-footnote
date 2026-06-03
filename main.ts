import { Plugin, ItemView, debounce, Menu, Modal, Setting, WorkspaceLeaf, App, MarkdownView, TFile } from 'obsidian';

const VIEW_TYPE_PURE_FOOTNOTE = "pure-footnote-view";

const BEAUTIFY_CSS = `
/* 1. 只在【非源码模式】下，且为【兄弟元素中的最后一个】后面插入符号 */
.pure-footnote-beautify-enabled .markdown-source-view:not(.is-source-mode) span.cm-footref.cm-hmd-barelink:last-child::after {
    content: "💬"; 
    font-size: 26px; 
    line-height: 1.1; 
    margin-left: -15px; 
    color: var(--text-normal);
    background-color: transparent; 
}
/* 选择所有【非源码模式】的 CodeMirror 编辑器内的脚注引用 span */
.pure-footnote-beautify-enabled .markdown-source-view:not(.is-source-mode) span.cm-footref.cm-hmd-barelink {
    font-size: 8px !important; 
    line-height: 3 !important; 
    color: #1E1E1E;
    margin: 0 !important; 
    padding: 0 !important;
    position: relative;
    display: inline-block; 
}

/* 3. 弹窗样式增强 (防止污染全局) */
.pure-footnote-beautify-enabled div.popover-titlebar {
    display: none !important;
}

.pure-footnote-beautify-enabled .popover.hover-popover .markdown-preview-view {
    font-size: 1.4em; 
    line-height: 1.6;
}
`;

interface PureFootnoteRef {
    type: 'footnote' | 'hover';
    key: string;
    content: string;
    line: number;
    col: number;
    len: number;
    el: HTMLElement | null;
}

interface PureFootnoteSettings {
    beautifyEnabled: boolean;
    isSortByKey: boolean;
}

class EditHoverModal extends Modal {
    ref: PureFootnoteRef;
    onSubmit: (newKey: string, newContent: string) => void;
    existingKeys: string[];
    resultKey: string;
    resultContent: string;
    currentX: number = 0;
    currentY: number = 0;
    startX: number = 0;
    startY: number = 0;
    isDragging: boolean = false;

    private onMouseDownBound: (e: MouseEvent) => void;
    private onMouseMoveBound: (e: MouseEvent) => void;
    private onMouseUpBound: () => void;

    constructor(app: App, ref: PureFootnoteRef, existingKeys: string[], onSubmit: (newKey: string, newContent: string) => void) {
        super(app);
        this.ref = ref;
        this.onSubmit = onSubmit;
        this.existingKeys = existingKeys;

        this.resultKey = ref.key;
        this.resultContent = ref.content;

        this.onMouseDownBound = this.onMouseDown.bind(this);
        this.onMouseMoveBound = this.onMouseMove.bind(this);
        this.onMouseUpBound = this.onMouseUp.bind(this);
    }

    onOpen() {
        const { contentEl, modalEl } = this;
        modalEl.style.border = "none";
        modalEl.style.setProperty("--modal-border-width", "0px");
        modalEl.style.boxShadow = "0 20px 40px rgba(0, 0, 0, 0.4)";

        this.setupDraggable();

        const title = this.ref.type === 'footnote' ? "编辑脚注" : "编辑注记";
        this.setTitle(title);

        const keyName = this.ref.type === 'footnote' ? "脚注标识" : "正文内容";
        const keyDesc = this.ref.type === 'footnote' ? "即 [^...] 中的内容" : "文档中方括号 [...] 内的文字";

        const errorMsgEl = contentEl.createDiv({
            cls: "pure-footnote-error-msg",
            text: "该序号已存在，请换一个"
        });
        errorMsgEl.style.color = "var(--text-error)";
        errorMsgEl.style.fontSize = "0.8em";
        errorMsgEl.style.marginBottom = "-10px";
        errorMsgEl.style.display = "none";

        let saveBtn: any;

        const keySetting = new Setting(contentEl)
            .setName(keyName)
            .setDesc(keyDesc)
            .addText(text => {
                text.setValue(this.resultKey)
                    .onChange(value => {
                        this.resultKey = value.trim();
                        if (this.ref.type === 'footnote' &&
                            this.existingKeys.includes(this.resultKey) &&
                            this.resultKey !== this.ref.key) {
                            errorMsgEl.style.display = "block";
                            saveBtn.setDisabled(true);
                            text.inputEl.style.border = "1px solid var(--text-error)";
                        } else {
                            errorMsgEl.style.display = "none";
                            saveBtn.setDisabled(false);
                            text.inputEl.style.border = "";
                        }
                    });
                text.inputEl.style.width = "100%";
            });
        keySetting.settingEl.style.display = "block";
        keySetting.controlEl.style.marginTop = "10px";

        const contentSetting = new Setting(contentEl)
            .setName("内容文字")
            .setDesc(this.ref.type === 'footnote' ? "脚注定义处的内容" : "悬浮时显示的内容")
            .addText(text => {
                text.setValue(this.resultContent)
                    .onChange(value => this.resultContent = value);
                text.inputEl.style.width = "100%";
            });
        contentSetting.settingEl.style.display = "block";
        contentSetting.controlEl.style.marginTop = "10px";

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText("取消")
                .onClick(() => this.close()))
            .addButton(btn => {
                saveBtn = btn;
                btn.setButtonText("保存修改")
                    .setCta()
                    .onClick(() => {
                        this.onSubmit(this.resultKey, this.resultContent);
                        this.close();
                    });
            });
    }

    setupDraggable() {
        this.modalEl.addEventListener("mousedown", this.onMouseDownBound);
    }

    onMouseDown(e: MouseEvent) {
        const target = e.target as HTMLElement;
        const targetTag = target.tagName.toLowerCase();
        const isInteractive = ["input", "textarea", "button"].includes(targetTag);
        const isSettingControl = target.closest(".setting-item-control") !== null;
        const isCloseButton = target.closest(".modal-close-button") !== null;
        if (isInteractive || isSettingControl || isCloseButton) return;
        this.isDragging = true;
        this.startX = e.clientX - this.currentX;
        this.startY = e.clientY - this.currentY;
        document.addEventListener("mousemove", this.onMouseMoveBound);
        document.addEventListener("mouseup", this.onMouseUpBound);
        this.modalEl.style.cursor = "grabbing";
        e.preventDefault();
    }

    onMouseMove(e: MouseEvent) {
        if (!this.isDragging) return;
        this.currentX = e.clientX - this.startX;
        this.currentY = e.clientY - this.startY;
        this.modalEl.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
    }

    onMouseUp() {
        this.isDragging = false;
        document.removeEventListener("mousemove", this.onMouseMoveBound);
        document.removeEventListener("mouseup", this.onMouseUpBound);
        this.modalEl.style.cursor = "default";
    }

    onClose() {
        this.contentEl.empty();
        this.modalEl.removeEventListener("mousedown", this.onMouseDownBound);
        document.removeEventListener("mousemove", this.onMouseMoveBound);
        document.removeEventListener("mouseup", this.onMouseUpBound);
    }
}

class PureFootnoteListView extends ItemView {
    plugin: PureFootnotePlugin;
    cachedRefs: PureFootnoteRef[] = [];
    lastActiveView: any = null;
    listRoot: HTMLElement | null = null;
    debouncedSync: Function;
    lastTextHash: string = "";

    constructor(leaf: WorkspaceLeaf, plugin: PureFootnotePlugin) {
        super(leaf);
        this.plugin = plugin;
        this.debouncedSync = debounce(() => {
            const activeLeaf = (this.app.workspace as any).activeLeaf;
            if (activeLeaf && activeLeaf.view) {
                this.syncHighlightWithCursor(activeLeaf.view);
            }
        }, 100, true);
    }

    getViewType() { return VIEW_TYPE_PURE_FOOTNOTE; }
    getDisplayText() { return "脚注 & 注记大纲"; }
    
    // ✨ 更换图标：换成了数字列表序号的图标，彻底与标注的气泡图标区分！
    getIcon() { return "list-ordered"; } 

    async onOpen() {
        this.renderStructure();
        this.scopeListeners();
        setTimeout(() => this.checkAndUpdate(), 100);
    }

    scopeListeners() {
        this.registerDomEvent(document, 'click', () => {
            if (this.isViewVisible()) this.debouncedSync();
        });
        this.registerDomEvent(document, 'keyup', () => {
            if (this.isViewVisible()) this.debouncedSync();
        });
    }

    isViewVisible() {
        return (this.containerEl as any).isShown ? (this.containerEl as any).isShown() : this.containerEl.offsetParent !== null;
    }

    renderStructure() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.classList.add("pure-footnote-view-container");
        this.listRoot = container.createDiv({ cls: "pure-footnote-list-root" });
        this.listRoot.addEventListener("contextmenu", (e) => {
            this.showContextMenu(e);
        });
    }

    getIsSortByKey(): boolean {
        return !!this.plugin.settings.isSortByKey;
    }

    async toggleSort(val: boolean) {
        this.plugin.settings.isSortByKey = val;
        await this.plugin.saveSettings();
        this.renderRefList();
    }

    findBestLeaf() {
        const active = (this.app.workspace as any).activeLeaf;
        if (active && (active.view.getViewType() === 'markdown' || active.view.getViewType() === 'kanban')) return active;
        if (this.lastActiveView && this.lastActiveView.leaf && this.lastActiveView.leaf.view.getViewType()) return this.lastActiveView.leaf;
        const leaves = this.app.workspace.getLeavesOfType('markdown').concat(this.app.workspace.getLeavesOfType('kanban'));
        return leaves.length > 0 ? leaves[0] : null;
    }

    async checkAndUpdate() {
        const activeLeaf = (this.app.workspace as any).activeLeaf;
        if (!activeLeaf) return;
        const viewType = activeLeaf.view.getViewType();
        if (viewType === 'canvas') {
            if (this.listRoot) {
                this.listRoot.empty();
                this.listRoot.createDiv({ cls: "pure-footnote-empty", text: "当前是白板 (Canvas)" });
            }
            return;
        }
        if (viewType === 'markdown' || viewType === 'kanban') {
            this.lastActiveView = activeLeaf.view;
            await this.updateView(activeLeaf.view);
            return;
        }
        const bestLeaf = this.findBestLeaf();
        if (bestLeaf) await this.updateView(bestLeaf.view);
    }

    async updateView(view: any) {
        if (!this.listRoot || !this.isViewVisible()) return;
        let text = "";
        let file = view.file;
        if (!file) return;

        if (view.editor) { text = view.editor.getValue(); } else { text = await this.app.vault.read(file); }

        if (this.lastTextHash === text) {
            this.syncHighlightWithCursor(view);
            return;
        }
        this.lastTextHash = text;

        const lines = text.split("\n");
        const definitionMap = new Map<string, string>();
        const defRegex = /^\[\^([^\]]+)\]:\s*(.*)$/;

        lines.forEach((line) => {
            if (line.startsWith('[^')) {
                const match = line.match(defRegex);
                if (match) definitionMap.set(match[1], match[2]);
            }
        });

        this.cachedRefs = [];
        const footRefRegex = /\[\^([^\]]+)\](?!:)/g;
        const hoverRegex = /\[(?!\^)((?:\\\]|[^\]])+)\]\{((?:\\\}|[^}])+)\}/g;

        let inMultiLineCode = false;

        lines.forEach((line, lineIndex) => {
            if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
                inMultiLineCode = !inMultiLineCode;
                return;
            }
            if (inMultiLineCode) return;

            let cleanLine = line.replace(/`[^`\n]+`/g, (match) => " ".repeat(match.length));

            if (!cleanLine.includes('[')) return;
            if (cleanLine.startsWith('[^') && cleanLine.includes(']:')) return;

            let fMatch;
            while ((fMatch = footRefRegex.exec(cleanLine)) !== null) {
                const key = fMatch[1];
                this.cachedRefs.push({
                    type: 'footnote',
                    key: key,
                    content: definitionMap.get(key) || "(未找到定义内容)",
                    line: lineIndex,
                    col: fMatch.index,
                    len: fMatch[0].length,
                    el: null
                });
            }

            let hMatch;
            while ((hMatch = hoverRegex.exec(cleanLine)) !== null) {
                this.cachedRefs.push({
                    type: 'hover',
                    key: hMatch[1],
                    content: hMatch[2],
                    line: lineIndex,
                    col: hMatch.index,
                    len: hMatch[0].length,
                    el: null
                });
            }
        });

        this.renderRefList();
        this.syncHighlightWithCursor(view);
    }

    renderRefList() {
        if (!this.listRoot) return;
        this.listRoot.empty();
        if (this.cachedRefs.length === 0) {
            this.listRoot.createDiv({ cls: "pure-footnote-empty", text: "当前文档没有脚注或注记" });
            return;
        }
        let displayRefs = [...this.cachedRefs];
        if (this.getIsSortByKey()) {
            displayRefs.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' }));
        }
        const listContainer = this.listRoot.createDiv({ cls: "pure-footnote-container" });
        displayRefs.forEach((ref) => {
            const itemEl = listContainer.createDiv({
                cls: `pure-footnote-item ${ref.type === 'hover' ? 'is-hover-note' : ''}`
            });
            ref.el = itemEl;
            const prefix = ref.type === 'footnote' ? `[^${ref.key}]` : `[注]`;
            itemEl.createDiv({ cls: "pure-footnote-key", text: prefix });
            itemEl.createDiv({ cls: "pure-footnote-content", text: `${ref.key}: ${ref.content}` });
            itemEl.addEventListener("click", () => {
                const view = this.lastActiveView || this.findBestLeaf()?.view;
                const isKanban = view && view.getViewType() === 'kanban';
                if (isKanban && ref.type === 'hover') { this.openEditModal(ref); } else { this.handleJump(ref); }
            });
            itemEl.addEventListener("contextmenu", (e) => {
                e.stopPropagation();
                this.showContextMenu(e, ref);
            });
        });
    }

    showContextMenu(e: MouseEvent, ref: PureFootnoteRef | null = null) {
        const menu = new Menu();
        if (ref) {
            menu.addItem((item) => {
                item.setTitle(ref.type === 'footnote' ? "编辑脚注" : "编辑注记")
                    .setIcon("pencil")
                    .onClick(() => this.openEditModal(ref));
            });
            menu.addSeparator();
        }

        const isCurrentlySorted = this.getIsSortByKey();
        menu.addItem((item) => {
            item.setTitle("数字排序")
                .setIcon("sort-asc")
                .setChecked(isCurrentlySorted)
                .onClick(() => this.toggleSort(!isCurrentlySorted));
        });

        menu.addItem((item) => {
            item.setTitle("脚注美化")
                .setIcon("wand-2")
                .setChecked(this.plugin.settings.beautifyEnabled)
                .onClick(async () => {
                    this.plugin.settings.beautifyEnabled = !this.plugin.settings.beautifyEnabled;
                    await this.plugin.saveSettings();
                    this.plugin.applyBeautifyStyle();
                });
        });

        menu.showAtMouseEvent(e);
    }

    async handleJump(ref: PureFootnoteRef) {
        const view = this.lastActiveView || this.findBestLeaf()?.view;
        if (!view) return;
        this.app.workspace.setActiveLeaf(view.leaf, { focus: true });
        if (view.editor) {
            view.setEphemeralState({
                line: ref.line,
                cursor: {
                    from: { line: ref.line, ch: ref.col },
                    to: { line: ref.line, ch: ref.col + ref.len }
                }
            });
        }
        this.highlightSpecificRef(ref);
    }

    async openEditModal(ref: PureFootnoteRef) {
        const file = this.lastActiveView?.file || this.app.workspace.getActiveFile();
        if (!file) return;

        const existingKeys = this.cachedRefs
            .filter(r => r.type === 'footnote')
            .map(r => r.key);

        new EditHoverModal(this.app, ref, existingKeys, async (newKey: string, newContent: string) => {
            await this.app.vault.process(file, (data) => {
                let lines = data.split("\n");
                if (ref.type === 'hover') {
                    const newStr = `[${newKey}]{${newContent}}`;
                    const line = lines[ref.line];
                    const before = line.substring(0, ref.col);
                    const after = line.substring(ref.col + ref.len);
                    lines[ref.line] = before + newStr + after;
                } else {
                    const oldKey = ref.key;
                    const regex = new RegExp(`\\[\\^${oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\](?![\\d\\w])`, 'g');
                    lines = lines.map(l => {
                        if (l.startsWith(`[^${oldKey}]:`)) return l;
                        return l.replace(regex, `[^${newKey}]`);
                    });
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].startsWith(`[^${oldKey}]:`)) {
                            lines[i] = `[^${newKey}]: ${newContent}`;
                            break;
                        }
                    }
                }
                return lines.join("\n");
            });
            setTimeout(() => this.checkAndUpdate(), 100);
        }).open();
    }

    syncHighlightWithCursor(view: any) {
        if (!this.cachedRefs.length || !view || !view.editor) return;
        const cursor = view.editor.getCursor();
        const currentLine = cursor.line;
        let activeRef: PureFootnoteRef | null = null;
        const sortedRefs = [...this.cachedRefs].sort((a, b) => a.line - b.line || a.col - b.col);
        for (let i = 0; i < sortedRefs.length; i++) {
            const ref = sortedRefs[i];
            if (ref.line <= currentLine) { activeRef = ref; } else { break; }
        }
        if (activeRef) this.highlightSpecificRef(activeRef);
    }

    highlightSpecificRef(targetRef: PureFootnoteRef) {
        this.cachedRefs.forEach((ref) => {
            if (!ref.el) return;
            if (ref === targetRef) {
                if (!ref.el.classList.contains("is-active")) {
                    ref.el.classList.add("is-active");
                    ref.el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else { ref.el.classList.remove("is-active"); }
        });
    }
}

export default class PureFootnotePlugin extends Plugin {
    settings: PureFootnoteSettings;

    async onload() {
        const loadedData = await this.loadData();
        this.settings = Object.assign({
            beautifyEnabled: false,
            isSortByKey: false
        }, loadedData);

        this.registerView(VIEW_TYPE_PURE_FOOTNOTE, (leaf) => new PureFootnoteListView(leaf, this));
        
        // ✨ 更换左侧侧边栏按钮图标
        this.addRibbonIcon('list-ordered', '打开脚注大纲', () => { this.activateView(); });

        const debouncedUpdate = debounce(() => {
            this.app.workspace.getLeavesOfType(VIEW_TYPE_PURE_FOOTNOTE).forEach(leaf => {
                if (leaf.view instanceof PureFootnoteListView) leaf.view.checkAndUpdate();
            });
        }, 500, true);

        this.registerEvent(this.app.workspace.on('active-leaf-change', debouncedUpdate));
        this.registerEvent(this.app.workspace.on('editor-change', debouncedUpdate));
        this.registerEvent(this.app.vault.on('modify', (file) => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile && file.path === activeFile.path) debouncedUpdate();
        }));

        this.applyBeautifyStyle();
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    applyBeautifyStyle() {
        const styleId = "pure-footnote-beautify-style";
        let styleEl = document.getElementById(styleId);

        if (this.settings.beautifyEnabled) {
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                styleEl.textContent = BEAUTIFY_CSS;
                document.head.appendChild(styleEl);
            }
            document.body.classList.add('pure-footnote-beautify-enabled');
        } else {
            if (styleEl) styleEl.remove();
            document.body.classList.remove('pure-footnote-beautify-enabled');
        }
    }

    onunload() {
        const styleEl = document.getElementById("pure-footnote-beautify-style");
        if (styleEl) styleEl.remove();
        document.body.classList.remove('pure-footnote-beautify-enabled');
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_PURE_FOOTNOTE)[0];
        if (!leaf) {
            leaf = workspace.getRightLeaf(false)!;
            await leaf.setViewState({ type: VIEW_TYPE_PURE_FOOTNOTE, active: true });
        }
        workspace.revealLeaf(leaf);
        if (leaf.view instanceof PureFootnoteListView) leaf.view.checkAndUpdate();
    }
}