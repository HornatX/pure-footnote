var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PureFootnotePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var VIEW_TYPE_PURE_FOOTNOTE = "pure-footnote-view";
var BEAUTIFY_CSS = `
/* 1. \u53EA\u5728\u3010\u975E\u6E90\u7801\u6A21\u5F0F\u3011\u4E0B\uFF0C\u4E14\u4E3A\u3010\u5144\u5F1F\u5143\u7D20\u4E2D\u7684\u6700\u540E\u4E00\u4E2A\u3011\u540E\u9762\u63D2\u5165\u7B26\u53F7 */
.pure-footnote-beautify-enabled .markdown-source-view:not(.is-source-mode) span.cm-footref.cm-hmd-barelink:last-child::after {
    content: "\u{1F4AC}"; 
    font-size: 26px; 
    line-height: 1.1; 
    margin-left: -15px; 
    color: var(--text-normal);
    background-color: transparent; 
}
/* \u9009\u62E9\u6240\u6709\u3010\u975E\u6E90\u7801\u6A21\u5F0F\u3011\u7684 CodeMirror \u7F16\u8F91\u5668\u5185\u7684\u811A\u6CE8\u5F15\u7528 span */
.pure-footnote-beautify-enabled .markdown-source-view:not(.is-source-mode) span.cm-footref.cm-hmd-barelink {
    font-size: 8px !important; 
    line-height: 3 !important; 
    color: #1E1E1E;
    margin: 0 !important; 
    padding: 0 !important;
    position: relative;
    display: inline-block; 
}

/* 3. \u5F39\u7A97\u6837\u5F0F\u589E\u5F3A (\u9632\u6B62\u6C61\u67D3\u5168\u5C40) */
.pure-footnote-beautify-enabled div.popover-titlebar {
    display: none !important;
}

.pure-footnote-beautify-enabled .popover.hover-popover .markdown-preview-view {
    font-size: 1.4em; 
    line-height: 1.6;
}
`;
var EditHoverModal = class extends import_obsidian.Modal {
  constructor(app, ref, existingKeys, onSubmit) {
    super(app);
    this.currentX = 0;
    this.currentY = 0;
    this.startX = 0;
    this.startY = 0;
    this.isDragging = false;
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
    const title = this.ref.type === "footnote" ? "\u7F16\u8F91\u811A\u6CE8" : "\u7F16\u8F91\u6CE8\u8BB0";
    this.setTitle(title);
    const keyName = this.ref.type === "footnote" ? "\u811A\u6CE8\u6807\u8BC6" : "\u6B63\u6587\u5185\u5BB9";
    const keyDesc = this.ref.type === "footnote" ? "\u5373 [^...] \u4E2D\u7684\u5185\u5BB9" : "\u6587\u6863\u4E2D\u65B9\u62EC\u53F7 [...] \u5185\u7684\u6587\u5B57";
    const errorMsgEl = contentEl.createDiv({
      cls: "pure-footnote-error-msg",
      text: "\u8BE5\u5E8F\u53F7\u5DF2\u5B58\u5728\uFF0C\u8BF7\u6362\u4E00\u4E2A"
    });
    errorMsgEl.style.color = "var(--text-error)";
    errorMsgEl.style.fontSize = "0.8em";
    errorMsgEl.style.marginBottom = "-10px";
    errorMsgEl.style.display = "none";
    let saveBtn;
    const keySetting = new import_obsidian.Setting(contentEl).setName(keyName).setDesc(keyDesc).addText((text) => {
      text.setValue(this.resultKey).onChange((value) => {
        this.resultKey = value.trim();
        if (this.ref.type === "footnote" && this.existingKeys.includes(this.resultKey) && this.resultKey !== this.ref.key) {
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
    const contentSetting = new import_obsidian.Setting(contentEl).setName("\u5185\u5BB9\u6587\u5B57").setDesc(this.ref.type === "footnote" ? "\u811A\u6CE8\u5B9A\u4E49\u5904\u7684\u5185\u5BB9" : "\u60AC\u6D6E\u65F6\u663E\u793A\u7684\u5185\u5BB9").addText((text) => {
      text.setValue(this.resultContent).onChange((value) => this.resultContent = value);
      text.inputEl.style.width = "100%";
    });
    contentSetting.settingEl.style.display = "block";
    contentSetting.controlEl.style.marginTop = "10px";
    new import_obsidian.Setting(contentEl).addButton((btn) => btn.setButtonText("\u53D6\u6D88").onClick(() => this.close())).addButton((btn) => {
      saveBtn = btn;
      btn.setButtonText("\u4FDD\u5B58\u4FEE\u6539").setCta().onClick(() => {
        this.onSubmit(this.resultKey, this.resultContent);
        this.close();
      });
    });
  }
  setupDraggable() {
    this.modalEl.addEventListener("mousedown", this.onMouseDownBound);
  }
  onMouseDown(e) {
    const target = e.target;
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
  onMouseMove(e) {
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
};
var PureFootnoteListView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.cachedRefs = [];
    this.lastActiveView = null;
    this.listRoot = null;
    this.lastTextHash = "";
    this.plugin = plugin;
    this.debouncedSync = (0, import_obsidian.debounce)(() => {
      const activeLeaf = this.app.workspace.activeLeaf;
      if (activeLeaf && activeLeaf.view) {
        this.syncHighlightWithCursor(activeLeaf.view);
      }
    }, 100, true);
  }
  getViewType() {
    return VIEW_TYPE_PURE_FOOTNOTE;
  }
  getDisplayText() {
    return "\u811A\u6CE8 & \u6CE8\u8BB0\u5927\u7EB2";
  }
  // ✨ 更换图标：换成了数字列表序号的图标，彻底与标注的气泡图标区分！
  getIcon() {
    return "list-ordered";
  }
  async onOpen() {
    this.renderStructure();
    this.scopeListeners();
    setTimeout(() => this.checkAndUpdate(), 100);
  }
  scopeListeners() {
    this.registerDomEvent(document, "click", () => {
      if (this.isViewVisible()) this.debouncedSync();
    });
    this.registerDomEvent(document, "keyup", () => {
      if (this.isViewVisible()) this.debouncedSync();
    });
  }
  isViewVisible() {
    return this.containerEl.isShown ? this.containerEl.isShown() : this.containerEl.offsetParent !== null;
  }
  renderStructure() {
    const container = this.containerEl.children[1];
    container.empty();
    container.classList.add("pure-footnote-view-container");
    this.listRoot = container.createDiv({ cls: "pure-footnote-list-root" });
    this.listRoot.addEventListener("contextmenu", (e) => {
      this.showContextMenu(e);
    });
  }
  getIsSortByKey() {
    return !!this.plugin.settings.isSortByKey;
  }
  async toggleSort(val) {
    this.plugin.settings.isSortByKey = val;
    await this.plugin.saveSettings();
    this.renderRefList();
  }
  findBestLeaf() {
    const active = this.app.workspace.activeLeaf;
    if (active && (active.view.getViewType() === "markdown" || active.view.getViewType() === "kanban")) return active;
    if (this.lastActiveView && this.lastActiveView.leaf && this.lastActiveView.leaf.view.getViewType()) return this.lastActiveView.leaf;
    const leaves = this.app.workspace.getLeavesOfType("markdown").concat(this.app.workspace.getLeavesOfType("kanban"));
    return leaves.length > 0 ? leaves[0] : null;
  }
  async checkAndUpdate() {
    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf) return;
    const viewType = activeLeaf.view.getViewType();
    if (viewType === "canvas") {
      if (this.listRoot) {
        this.listRoot.empty();
        this.listRoot.createDiv({ cls: "pure-footnote-empty", text: "\u5F53\u524D\u662F\u767D\u677F (Canvas)" });
      }
      return;
    }
    if (viewType === "markdown" || viewType === "kanban") {
      this.lastActiveView = activeLeaf.view;
      await this.updateView(activeLeaf.view);
      return;
    }
    const bestLeaf = this.findBestLeaf();
    if (bestLeaf) await this.updateView(bestLeaf.view);
  }
  async updateView(view) {
    if (!this.listRoot || !this.isViewVisible()) return;
    let text = "";
    let file = view.file;
    if (!file) return;
    if (view.editor) {
      text = view.editor.getValue();
    } else {
      text = await this.app.vault.read(file);
    }
    if (this.lastTextHash === text) {
      this.syncHighlightWithCursor(view);
      return;
    }
    this.lastTextHash = text;
    const lines = text.split("\n");
    const definitionMap = /* @__PURE__ */ new Map();
    const defRegex = /^\[\^([^\]]+)\]:\s*(.*)$/;
    lines.forEach((line) => {
      if (line.startsWith("[^")) {
        const match = line.match(defRegex);
        if (match) definitionMap.set(match[1], match[2]);
      }
    });
    this.cachedRefs = [];
    const footRefRegex = /\[\^([^\]]+)\](?!:)/g;
    const hoverRegex = /\[(?!\^)((?:\\\]|[^\]])+)\]\{((?:\\\}|[^}])+)\}/g;
    let inMultiLineCode = false;
    lines.forEach((line, lineIndex) => {
      if (line.trim().startsWith("```") || line.trim().startsWith("~~~")) {
        inMultiLineCode = !inMultiLineCode;
        return;
      }
      if (inMultiLineCode) return;
      let cleanLine = line.replace(/`[^`\n]+`/g, (match) => " ".repeat(match.length));
      if (!cleanLine.includes("[")) return;
      if (cleanLine.startsWith("[^") && cleanLine.includes("]:")) return;
      let fMatch;
      while ((fMatch = footRefRegex.exec(cleanLine)) !== null) {
        const key = fMatch[1];
        this.cachedRefs.push({
          type: "footnote",
          key,
          content: definitionMap.get(key) || "(\u672A\u627E\u5230\u5B9A\u4E49\u5185\u5BB9)",
          line: lineIndex,
          col: fMatch.index,
          len: fMatch[0].length,
          el: null
        });
      }
      let hMatch;
      while ((hMatch = hoverRegex.exec(cleanLine)) !== null) {
        this.cachedRefs.push({
          type: "hover",
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
      this.listRoot.createDiv({ cls: "pure-footnote-empty", text: "\u5F53\u524D\u6587\u6863\u6CA1\u6709\u811A\u6CE8\u6216\u6CE8\u8BB0" });
      return;
    }
    let displayRefs = [...this.cachedRefs];
    if (this.getIsSortByKey()) {
      displayRefs.sort((a, b) => a.key.localeCompare(b.key, void 0, { numeric: true, sensitivity: "base" }));
    }
    const listContainer = this.listRoot.createDiv({ cls: "pure-footnote-container" });
    displayRefs.forEach((ref) => {
      const itemEl = listContainer.createDiv({
        cls: `pure-footnote-item ${ref.type === "hover" ? "is-hover-note" : ""}`
      });
      ref.el = itemEl;
      const prefix = ref.type === "footnote" ? `[^${ref.key}]` : `[\u6CE8]`;
      itemEl.createDiv({ cls: "pure-footnote-key", text: prefix });
      itemEl.createDiv({ cls: "pure-footnote-content", text: `${ref.key}: ${ref.content}` });
      itemEl.addEventListener("click", () => {
        const view = this.lastActiveView || this.findBestLeaf()?.view;
        const isKanban = view && view.getViewType() === "kanban";
        if (isKanban && ref.type === "hover") {
          this.openEditModal(ref);
        } else {
          this.handleJump(ref);
        }
      });
      itemEl.addEventListener("contextmenu", (e) => {
        e.stopPropagation();
        this.showContextMenu(e, ref);
      });
    });
  }
  showContextMenu(e, ref = null) {
    const menu = new import_obsidian.Menu();
    if (ref) {
      menu.addItem((item) => {
        item.setTitle(ref.type === "footnote" ? "\u7F16\u8F91\u811A\u6CE8" : "\u7F16\u8F91\u6CE8\u8BB0").setIcon("pencil").onClick(() => this.openEditModal(ref));
      });
      menu.addSeparator();
    }
    const isCurrentlySorted = this.getIsSortByKey();
    menu.addItem((item) => {
      item.setTitle("\u6570\u5B57\u6392\u5E8F").setIcon("sort-asc").setChecked(isCurrentlySorted).onClick(() => this.toggleSort(!isCurrentlySorted));
    });
    menu.addItem((item) => {
      item.setTitle("\u811A\u6CE8\u7F8E\u5316").setIcon("wand-2").setChecked(this.plugin.settings.beautifyEnabled).onClick(async () => {
        this.plugin.settings.beautifyEnabled = !this.plugin.settings.beautifyEnabled;
        await this.plugin.saveSettings();
        this.plugin.applyBeautifyStyle();
      });
    });
    menu.showAtMouseEvent(e);
  }
  async handleJump(ref) {
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
  async openEditModal(ref) {
    const file = this.lastActiveView?.file || this.app.workspace.getActiveFile();
    if (!file) return;
    const existingKeys = this.cachedRefs.filter((r) => r.type === "footnote").map((r) => r.key);
    new EditHoverModal(this.app, ref, existingKeys, async (newKey, newContent) => {
      await this.app.vault.process(file, (data) => {
        let lines = data.split("\n");
        if (ref.type === "hover") {
          const newStr = `[${newKey}]{${newContent}}`;
          const line = lines[ref.line];
          const before = line.substring(0, ref.col);
          const after = line.substring(ref.col + ref.len);
          lines[ref.line] = before + newStr + after;
        } else {
          const oldKey = ref.key;
          const regex = new RegExp(`\\[\\^${oldKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\](?![\\d\\w])`, "g");
          lines = lines.map((l) => {
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
  syncHighlightWithCursor(view) {
    if (!this.cachedRefs.length || !view || !view.editor) return;
    const cursor = view.editor.getCursor();
    const currentLine = cursor.line;
    let activeRef = null;
    const sortedRefs = [...this.cachedRefs].sort((a, b) => a.line - b.line || a.col - b.col);
    for (let i = 0; i < sortedRefs.length; i++) {
      const ref = sortedRefs[i];
      if (ref.line <= currentLine) {
        activeRef = ref;
      } else {
        break;
      }
    }
    if (activeRef) this.highlightSpecificRef(activeRef);
  }
  highlightSpecificRef(targetRef) {
    this.cachedRefs.forEach((ref) => {
      if (!ref.el) return;
      if (ref === targetRef) {
        if (!ref.el.classList.contains("is-active")) {
          ref.el.classList.add("is-active");
          ref.el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      } else {
        ref.el.classList.remove("is-active");
      }
    });
  }
};
var PureFootnotePlugin = class extends import_obsidian.Plugin {
  async onload() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({
      beautifyEnabled: false,
      isSortByKey: false
    }, loadedData);
    this.registerView(VIEW_TYPE_PURE_FOOTNOTE, (leaf) => new PureFootnoteListView(leaf, this));
    this.addRibbonIcon("list-ordered", "\u6253\u5F00\u811A\u6CE8\u5927\u7EB2", () => {
      this.activateView();
    });
    const debouncedUpdate = (0, import_obsidian.debounce)(() => {
      this.app.workspace.getLeavesOfType(VIEW_TYPE_PURE_FOOTNOTE).forEach((leaf) => {
        if (leaf.view instanceof PureFootnoteListView) leaf.view.checkAndUpdate();
      });
    }, 500, true);
    this.registerEvent(this.app.workspace.on("active-leaf-change", debouncedUpdate));
    this.registerEvent(this.app.workspace.on("editor-change", debouncedUpdate));
    this.registerEvent(this.app.vault.on("modify", (file) => {
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
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        styleEl.textContent = BEAUTIFY_CSS;
        document.head.appendChild(styleEl);
      }
      document.body.classList.add("pure-footnote-beautify-enabled");
    } else {
      if (styleEl) styleEl.remove();
      document.body.classList.remove("pure-footnote-beautify-enabled");
    }
  }
  onunload() {
    const styleEl = document.getElementById("pure-footnote-beautify-style");
    if (styleEl) styleEl.remove();
    document.body.classList.remove("pure-footnote-beautify-enabled");
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_PURE_FOOTNOTE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_PURE_FOOTNOTE, active: true });
    }
    workspace.revealLeaf(leaf);
    if (leaf.view instanceof PureFootnoteListView) leaf.view.checkAndUpdate();
  }
};
