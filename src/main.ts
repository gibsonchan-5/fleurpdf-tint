import { Plugin, ItemView, WorkspaceLeaf, Setting, PluginSettingTab, App, Modal, SettingDefinition, SliderComponent, ColorComponent } from 'obsidian';

// ============ Types ============

interface PDFTemplate {
  id: string;
  name: string;
  color: string;
  pattern: string;
  patternGap: number;
  patternSize: number;
  patternColor: string;
  patternOpacity: number;
}

interface PDFBackgroundTintSettings {
  enabled: boolean;
  activePreset: string;
  customTemplates: PDFTemplate[];
}

const DEFAULT_SETTINGS: PDFBackgroundTintSettings = {
  enabled: true,
  activePreset: 'none',
  customTemplates: [],
};

const PRESETS: Record<string, { name: string; color: string; dark?: boolean }> = {
  'none':         { name: 'None',          color: '#FFFFFF' },
  'eye-green':    { name: 'Eye Green',     color: '#C7EDCC' },
  'warm-yellow':  { name: 'Warm Yellow',   color: '#F5EED6' },
  'cream':        { name: 'Cream',         color: '#F5F0E1' },
  'sky-blue':     { name: 'Sky Blue',      color: '#D6EBF5' },
  'parchment':    { name: 'Parchment',     color: '#E8DCC5' },
  'rose-beige':   { name: 'Rose Beige',    color: '#F0E0D6' },
  'ink-gray':     { name: 'Ink Gray',      color: '#E8E8E0' },
  'dark':         { name: 'Dark',          color: '#2C2C2C', dark: true },
};

const PATTERN_OPTIONS: Record<string, { name: string; icon: string }> = {
  'none':      { name: 'None',      icon: '○' },
  'dot':       { name: 'Dot',       icon: '·' },
  'grid':      { name: 'Grid',      icon: '#' },
  'line':      { name: 'Line',      icon: '—' },
  'diagonal':  { name: 'Diagonal',  icon: '/' },
  'cross':     { name: 'Cross',     icon: '✕' },
  'zigzag':    { name: 'Zigzag',    icon: '' },
  'stripe':    { name: 'Stripe',    icon: '‖' },
};

const VIEW_TYPE = 'fleurpdf-tint-view';
const CUSTOM_PREFIX = 'custom-';

function makeDefaultTemplate(): PDFTemplate {
  return {
    id: Date.now().toString(36),
    name: 'New Template',
    color: '#F5F0E1',
    pattern: 'none',
    patternGap: 28,
    patternSize: 1.2,
    patternColor: '#968c82',
    patternOpacity: 0.35,
  };
}

// ============ Plugin ============

export default class FleurPdfTintPlugin extends Plugin {
  settings: PDFBackgroundTintSettings = DEFAULT_SETTINGS;
  statusBarItem: HTMLElement;
  private isDragging = false;
  private currentPattern: string = 'none';
  private currentPatternGap: number = 28;
  private currentPatternSize: number = 1.2;
  private currentPatternColor: string = '#968c82';
  private currentPatternOpacity: number = 0.35;

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE, (leaf: WorkspaceLeaf) => {
      return new PDFBackgroundTintView(leaf, this);
    });

    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf) => this.onLeafChange(leaf))
    );

    if (this.settings.enabled) this.applyTint();

    this.addRibbonIcon('palette', 'FleurPDF tint', () => {
      void this.activateSidebar();
    });

    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();

    this.addSettingTab(new PDFBackgroundTintSettingTab(this.app, this));

    window.setTimeout(() => {
      if (this.settings.enabled) this.applyTint();
    }, 1000);
  }

  onunload() {
    this.removeTint();
  }

  async loadSettings() {
    const data = await this.loadData() as Partial<PDFBackgroundTintSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateStatusBar();
    this.refreshSidebarView();
  }

  refreshSidebarView() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    for (const leaf of leaves) {
      const view = leaf.view as PDFBackgroundTintView;
      if (typeof view.render === 'function') {
        view.render();
      }
    }
  }

  async activateSidebar() {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE);
    if (leaves.length > 0) {
      await workspace.revealLeaf(leaves[0]);
    } else {
      const leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: VIEW_TYPE, active: true });
        await workspace.revealLeaf(leaf);
      }
    }
  }

  onLeafChange(leaf: WorkspaceLeaf | null) {
    if (!leaf) return;
    const view = leaf.view;
    if (!view) return;
    if (view.getViewType() === 'pdf') {
      window.setTimeout(() => {
        if (this.settings.enabled) this.applyTint();
      }, 500);
    }
  }

  updateStatusBar() {
    if (!this.statusBarItem) return;
    if (!this.settings.enabled) {
      this.statusBarItem.setText('PDF Tint: off');
      return;
    }
    const tpl = this.resolveActiveTemplate();
    this.statusBarItem.setText(`PDF Tint: ${tpl ? tpl.name : 'None'}`);
  }

  resolveActiveTemplate(): { id: string; name: string; color: string; dark?: boolean; pattern?: string; gap?: number; size?: number; pColor?: string; pOpacity?: number } | null {
    if (!this.settings.enabled) return null;
    const key = this.settings.activePreset;
    if (!key || key === 'none') return null;
    if (key.startsWith(CUSTOM_PREFIX)) {
      const id = key.slice(CUSTOM_PREFIX.length);
      const tpl = this.settings.customTemplates.find(t => t.id === id);
      if (tpl) return { id: tpl.id, name: tpl.name, color: tpl.color, pattern: tpl.pattern, gap: tpl.patternGap, size: tpl.patternSize, pColor: tpl.patternColor, pOpacity: tpl.patternOpacity };
      return null;
    }
    const preset = PRESETS[key];
    return preset ? { id: key, name: preset.name, color: preset.color, dark: preset.dark } : null;
  }

  getActiveColor(): string {
    const tpl = this.resolveActiveTemplate();
    return tpl ? tpl.color : '';
  }

  isDarkMode(color: string): boolean {
    if (!color) return false;
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }

  private buildPatternCss(pattern: string): { image: string; size: string } {
    if (pattern === 'none') return { image: 'none', size: 'auto' };

    const c = 'rgba(var(--pbt-r), var(--pbt-g), var(--pbt-b), var(--pbt-a))';
    const dot = 'calc(var(--pbt-dot) * 1px)';
    const gap = 'calc(var(--pbt-gap) * 1px)';

    switch (pattern) {
      case 'dot':
        return {
          image: `radial-gradient(circle at center, ${c} ${dot}, transparent ${dot})`,
          size: `${gap} ${gap}`,
        };
      case 'grid':
        return {
          image: `linear-gradient(to right, ${c} 1px, transparent 1px), linear-gradient(to bottom, ${c} 1px, transparent 1px)`,
          size: `${gap} ${gap}`,
        };
      case 'line':
        return {
          image: `linear-gradient(to bottom, transparent calc(var(--pbt-gap) * 1px - 1px), ${c} calc(var(--pbt-gap) * 1px - 1px), ${c} ${gap})`,
          size: `100% ${gap}`,
        };
      case 'diagonal':
        return {
          image: `repeating-linear-gradient(45deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${gap})`,
          size: `${gap} ${gap}`,
        };
      case 'cross':
        return {
          image: `linear-gradient(45deg, ${c} 1px, transparent 1px), linear-gradient(-45deg, ${c} 1px, transparent 1px)`,
          size: `${gap} ${gap}`,
        };
      case 'zigzag':
        return {
          image: `linear-gradient(135deg, ${c} 25%, transparent 25%) -${gap} 0, linear-gradient(225deg, ${c} 25%, transparent 25%) -${gap} 0, linear-gradient(315deg, ${c} 25%, transparent 25%), linear-gradient(45deg, ${c} 25%, transparent 25%)`,
          size: `${gap} ${gap}`,
        };
      case 'stripe':
        return {
          image: `repeating-linear-gradient(90deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${gap})`,
          size: `${gap} 100%`,
        };
      default:
        return { image: 'none', size: 'auto' };
    }
  }

  applyTint() {
    const color = this.getActiveColor();
    if (!color) {
      this.removeTint();
      return;
    }

    const isDark = this.isDarkMode(color);
    const blendMode = isDark ? 'screen' : 'multiply';

    const tpl = this.resolveActiveTemplate();
    const pattern = tpl?.pattern || 'none';
    this.currentPattern = pattern;
    this.currentPatternGap = tpl?.gap ?? 28;
    this.currentPatternSize = tpl?.size ?? 1.2;
    this.currentPatternColor = tpl?.pColor || '#968c82';
    this.currentPatternOpacity = tpl?.pOpacity ?? 0.35;

    // Build pattern CSS using CSS variables
    const c = 'rgba(var(--pbt-r), var(--pbt-g), var(--pbt-b), var(--pbt-a))';
    const dot = 'calc(var(--pbt-dot) * 1px)';
    const gap = 'calc(var(--pbt-gap) * 1px)';

    let patternImage = 'none';
    let patternSize = 'auto';

    switch (pattern) {
      case 'dot':
        patternImage = `radial-gradient(circle at center, ${c} ${dot}, transparent ${dot})`;
        patternSize = `${gap} ${gap}`;
        break;
      case 'grid':
        patternImage = `linear-gradient(to right, ${c} 1px, transparent 1px), linear-gradient(to bottom, ${c} 1px, transparent 1px)`;
        patternSize = `${gap} ${gap}`;
        break;
      case 'line':
        patternImage = `linear-gradient(to bottom, transparent calc(var(--pbt-gap) * 1px - 1px), ${c} calc(var(--pbt-gap) * 1px - 1px), ${c} ${gap})`;
        patternSize = `100% ${gap}`;
        break;
      case 'diagonal':
        patternImage = `repeating-linear-gradient(45deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${gap})`;
        patternSize = `${gap} ${gap}`;
        break;
      case 'cross':
        patternImage = `linear-gradient(45deg, ${c} 1px, transparent 1px), linear-gradient(-45deg, ${c} 1px, transparent 1px)`;
        patternSize = `${gap} ${gap}`;
        break;
      case 'zigzag':
        patternImage = `linear-gradient(135deg, ${c} 25%, transparent 25%) -${gap} 0, linear-gradient(225deg, ${c} 25%, transparent 25%) -${gap} 0, linear-gradient(315deg, ${c} 25%, transparent 25%), linear-gradient(45deg, ${c} 25%, transparent 25%)`;
        patternSize = `${gap} ${gap}`;
        break;
      case 'stripe':
        patternImage = `repeating-linear-gradient(90deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${gap})`;
        patternSize = `${gap} 100%`;
        break;
    }

    // Use setCssProps to set CSS variables consumed by styles.css
    document.body.setCssProps({
      '--pbt-bg-color': color,
      '--pbt-blend': blendMode,
      '--pbt-pattern-image': patternImage,
      '--pbt-pattern-size': patternSize,
    });

    this.updatePatternVars();
  }

  updatePatternVars() {
    const baseColor = this.currentPatternColor || '#968c82';
    const hex = baseColor.replace('#', '');
    document.body.setCssProps({
      '--pbt-r': String(parseInt(hex.slice(0, 2), 16) || 150),
      '--pbt-g': String(parseInt(hex.slice(2, 4), 16) || 140),
      '--pbt-b': String(parseInt(hex.slice(4, 6), 16) || 130),
      '--pbt-a': String(this.currentPatternOpacity ?? 0.35),
      '--pbt-gap': String(this.currentPatternGap || 28),
      '--pbt-dot': String(this.currentPatternSize || 1.2),
    });
  }

  startDragging() {
    this.isDragging = true;
    document.body.setCssProps({ '--pbt-blend': 'normal' });
  }

  stopDragging() {
    this.isDragging = false;
    const color = this.getActiveColor();
    const blendMode = color && this.isDarkMode(color) ? 'screen' : 'multiply';
    document.body.setCssProps({ '--pbt-blend': blendMode });
  }

  removeTint() {
    document.body.setCssProps({
      '--pbt-bg-color': '',
      '--pbt-blend': '',
      '--pbt-pattern-image': '',
      '--pbt-pattern-size': '',
    });
  }

  async applyTemplate(key: string) {
    this.settings.activePreset = key;
    await this.saveSettings();
    if (this.settings.enabled) this.applyTint();
  }
}

// ============ Sidebar View ============

class PDFBackgroundTintView extends ItemView {
  private plugin: FleurPdfTintPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: FleurPdfTintPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return 'FleurPDF tint'; }
  getIcon(): string { return 'palette'; }

  async onOpen(): Promise<void> {
    this.render();
    const handleCardClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest('.pbt-card');
      if (card) {
        const htmlCard = card as HTMLElement;
        const key = htmlCard.dataset.key;
        if (key !== undefined) {
          void this.plugin.applyTemplate(key);
          this.updateActiveCard(key);
        }
      }
    };
    this.contentEl.addEventListener('click', handleCardClick);
  }

  async onClose(): Promise<void> {}

  refresh(): void { this.render(); }

  private updateActiveCard(key: string) {
    const cards = this.contentEl.querySelectorAll('.pbt-card');
    cards.forEach(card => {
      const htmlCard = card as HTMLElement;
      if (htmlCard.dataset.key === key) {
        htmlCard.classList.add('active');
      } else {
        htmlCard.classList.remove('active');
      }
    });
  }

  private render(): void {
    const container = this.contentEl;
    container.empty();
    container.addClass('pbt-sidebar');

    const activeKey = this.plugin.settings.activePreset;

    // === Header ===
    const header = container.createDiv({ cls: 'pbt-header' });
    const top = header.createDiv({ cls: 'pbt-header-top' });
    top.createEl('h2', { text: 'FleurPDF tint' });

    const icons = top.createDiv({ cls: 'pbt-header-icons' });

    const resetBtn = icons.createEl('button', {
      cls: 'pbt-icon-btn',
      attr: { 'aria-label': 'Reset', title: 'Reset to None' },
    });
    resetBtn.setText('↺');
    const handleReset = async () => {
      await this.plugin.applyTemplate('none');
      this.render();
    };
    resetBtn.addEventListener('click', () => { void handleReset(); });

    const settingsBtn = icons.createEl('button', {
      cls: 'pbt-icon-btn',
      attr: { 'aria-label': 'Settings', title: 'Open settings' },
    });
    settingsBtn.setText('⚙');
    settingsBtn.addEventListener('click', () => {
      // Use type assertion to avoid unsafe-call warnings (Obsidian types setting as any)
      const setting = this.app.setting as { open: () => void; openTabById: (id: string) => void };
      setting.open();
      setting.openTabById('fleurpdf-tint');
    });

    // === Built-in Presets (read-only) ===
    const presetSection = container.createDiv({ cls: 'pbt-section' });
    presetSection.createEl('h3', { text: 'Presets', cls: 'pbt-section-title' });
    const presetGrid = presetSection.createDiv({ cls: 'pbt-grid' });

    for (const [key, preset] of Object.entries(PRESETS)) {
      this.createCard(presetGrid, key, preset.name, preset.color, key === activeKey, 'none');
    }

    // === Custom Templates ===
    const customSection = container.createDiv({ cls: 'pbt-section' });
    const customTitleEl = customSection.createEl('h3', { cls: 'pbt-section-title' });
    customTitleEl.createSpan({ text: 'Custom Templates' });
    if (this.plugin.settings.customTemplates.length === 0) {
      customTitleEl.createSpan({ text: ' (none)', cls: 'pbt-section-hint' });
    }

    if (this.plugin.settings.customTemplates.length > 0) {
      const customGrid = customSection.createDiv({ cls: 'pbt-grid' });
      for (const tpl of this.plugin.settings.customTemplates) {
        const key = CUSTOM_PREFIX + tpl.id;
        this.createCard(customGrid, key, tpl.name, tpl.color, key === activeKey, tpl.pattern, tpl.patternColor, tpl.patternOpacity, tpl.patternGap, tpl.patternSize);
      }
    }
  }

  private createCard(parent: HTMLElement, key: string, name: string, color: string, isActive: boolean, pattern: string, pColor?: string, pOpacity?: number, pGap?: number, pSize?: number) {
    const card = parent.createDiv({ cls: `pbt-card ${isActive ? 'active' : ''}` });
    card.dataset.key = key;

    const thumb = card.createDiv({ cls: 'pbt-thumb' });
    this.renderPatternPreview(thumb, color, pattern, pGap, pSize, pColor, pOpacity);

    card.createDiv({ cls: 'pbt-name', text: name });
  }

  private renderPatternPreview(
    el: HTMLElement,
    color: string,
    pattern: string,
    gap?: number,
    size?: number,
    pColor?: string,
    pOpacity?: number
  ) {
    if (!color) {
      el.setCssStyles({ backgroundColor: '#ffffff' });
      return;
    }
    el.setCssStyles({ backgroundColor: color });

    if (pattern === 'none') return;

    const opacity = pOpacity ?? this.plugin.currentPatternOpacity ?? 0.35;
    const baseColor = pColor || this.plugin.currentPatternColor || '#968c82';
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) || 150;
    const g = parseInt(hex.slice(2, 4), 16) || 140;
    const b = parseInt(hex.slice(4, 6), 16) || 130;
    const c = `rgba(${r}, ${g}, ${b}, ${opacity})`;

    const gapPx = gap || this.plugin.currentPatternGap || 8;
    const dot = size || this.plugin.currentPatternSize || 0.5;

    switch (pattern) {
      case 'dot': {
        const bgImage = `radial-gradient(circle at center, ${c} ${dot}px, transparent ${dot}px)`;
        el.setCssStyles({ backgroundColor: color, backgroundImage: bgImage, backgroundSize: `${gapPx}px ${gapPx}px`, backgroundRepeat: 'repeat' });
        break;
      }
      case 'grid': {
        const bgImage = `linear-gradient(to right, ${c} 1px, transparent 1px), linear-gradient(to bottom, ${c} 1px, transparent 1px)`;
        el.setCssStyles({ backgroundColor: color, backgroundImage: bgImage, backgroundSize: `${gapPx}px ${gapPx}px`, backgroundRepeat: 'repeat' });
        break;
      }
      case 'line': {
        const bgImage = `linear-gradient(to bottom, transparent ${gapPx - 1}px, ${c} ${gapPx - 1}px, ${c} ${gapPx}px)`;
        el.setCssStyles({ backgroundColor: color, backgroundImage: bgImage, backgroundSize: `100% ${gapPx}px`, backgroundRepeat: 'repeat' });
        break;
      }
    }
  }
}

// ============ Template Edit Modal ============

class TemplateEditModal extends Modal {
  private plugin: FleurPdfTintPlugin;
  private template: PDFTemplate;
  private isNew: boolean;
  private onSave: (tpl: PDFTemplate) => Promise<void>;
  private paramsEl: HTMLElement;

  constructor(app: App, plugin: FleurPdfTintPlugin, template: PDFTemplate, isNew: boolean, onSave: (tpl: PDFTemplate) => Promise<void>) {
    super(app);
    this.plugin = plugin;
    this.template = { ...template };
    this.isNew = isNew;
    this.onSave = onSave;
    this.paramsEl = null as unknown as HTMLElement;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('pbt-modal');

    const title = this.isNew ? 'Create Template' : 'Edit Template';
    new Setting(contentEl).setName(title).setHeading();

    new Setting(contentEl)
      .setName('Template name')
      .addText(text => text
        .setValue(this.template.name)
        .setPlaceholder('Enter template name')
        .onChange(val => { this.template.name = val; }));

    new Setting(contentEl)
      .setName('Background color')
      .addColorPicker(picker => {
        picker.setValue(this.template.color);
        picker.onChange(val => { this.template.color = val; });
      });

    new Setting(contentEl)
      .setName('Pattern overlay')
      .setDesc('Select a pattern to overlay on the background')
      .addDropdown(dropdown => {
        for (const [key, opt] of Object.entries(PATTERN_OPTIONS)) {
          dropdown.addOption(key, `${opt.icon} ${opt.name}`);
        }
        dropdown.setValue(this.template.pattern);
        dropdown.onChange(val => {
          this.template.pattern = val;
          this.refresh();
        });
      });

    this.paramsEl = contentEl.createDiv({ cls: 'pbt-modal-params' });
    this.refreshParams();

    const footer = contentEl.createDiv({ cls: 'pbt-modal-footer' });
    footer.createEl('button', { text: this.isNew ? 'Create' : 'Save', cls: 'mod-cta' })
      .addEventListener('click', () => {
        if (!this.template.name.trim()) {
          this.template.name = 'Untitled';
        }
        void this.onSave(this.template);
        this.close();
      });
    footer.createEl('button', { text: 'Cancel' })
      .addEventListener('click', () => this.close());
  }

  private refresh() {
    this.refreshParams();
  }

  private refreshParams() {
    this.paramsEl.empty();
    if (this.template.pattern === 'none') return;

    new Setting(this.paramsEl)
      .setName('Spacing')
      .setDesc('Distance between pattern elements')
      .addSlider((slider: SliderComponent) => {
        slider.setLimits(14, 60, 2);
        slider.setValue(this.template.patternGap);
        slider.onChange((val: number) => { this.template.patternGap = val; });
      });

    new Setting(this.paramsEl)
      .setName('Size')
      .setDesc('Size of pattern elements')
      .addSlider((slider: SliderComponent) => {
        slider.setLimits(0.5, 4, 0.1);
        slider.setValue(this.template.patternSize);
        slider.onChange((val: number) => { this.template.patternSize = val; });
      });

    new Setting(this.paramsEl)
      .setName('Pattern color')
      .addColorPicker((picker: ColorComponent) => {
        picker.setValue(this.template.patternColor);
        picker.onChange((val: string) => { this.template.patternColor = val; });
      });

    new Setting(this.paramsEl)
      .setName('Pattern opacity')
      .addSlider((slider: SliderComponent) => {
        slider.setLimits(0, 100, 5);
        slider.setValue(Math.round(this.template.patternOpacity * 100));
        slider.onChange((val: number) => { this.template.patternOpacity = val / 100; });
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ============ Settings Tab ============

class PDFBackgroundTintSettingTab extends PluginSettingTab {
  plugin: FleurPdfTintPlugin;

  constructor(app: App, plugin: FleurPdfTintPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinition[] {
    return [];
  }

  display(): void {
    this.update();
  }

  update(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('pbt-setting-tab');

    new Setting(containerEl).setName('Templates').setHeading();

    new Setting(containerEl)
      .setName('Enable background tint')
      .setDesc('Toggle the background color effect on PDF pages')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enabled)
        .onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
          if (value) this.plugin.applyTint();
          else this.plugin.removeTint();
        }));

    new Setting(containerEl).setName('Custom Templates').setHeading();

    const customTemplates = this.plugin.settings.customTemplates;

    if (customTemplates.length === 0) {
      new Setting(containerEl)
        .setDesc('No custom templates yet. Click the button below to create one.')
        .setClass('pbt-readonly-hint');
    } else {
      for (const tpl of customTemplates) {
        const isActive = this.plugin.settings.activePreset === CUSTOM_PREFIX + tpl.id;
        const desc = `${PATTERN_OPTIONS[tpl.pattern]?.name || 'None'} · Gap ${tpl.patternGap}px · Size ${tpl.patternSize}px · ${Math.round(tpl.patternOpacity * 100)}%`;

        const row = containerEl.createDiv({ cls: 'pbt-custom-row' });

        const thumbWrap = row.createDiv({ cls: 'pbt-custom-thumb-wrap' });
        const thumb = thumbWrap.createDiv({ cls: 'pbt-custom-thumb' });
        thumb.setCssStyles({ backgroundColor: tpl.color });
        if (tpl.pattern && tpl.pattern !== 'none') {
          thumb.setCssStyles({ backgroundImage: `linear-gradient(135deg, transparent 48%, rgba(0,0,0,0.15) 48%, rgba(0,0,0,0.15) 52%, transparent 52%)`, backgroundSize: '6px 6px' });
        }

        const info = row.createDiv({ cls: 'pbt-custom-info' });
        info.createDiv({ cls: 'pbt-custom-name', text: tpl.name });
        info.createDiv({ cls: 'pbt-custom-desc', text: desc });

        const btnWrap = row.createDiv({ cls: 'pbt-custom-btns' });
        const applyBtn = btnWrap.createEl('button', { cls: 'pbt-btn', text: isActive ? 'Active' : 'Apply' });
        applyBtn.setCssStyles({ opacity: isActive ? '0.5' : '1', pointerEvents: isActive ? 'none' : 'auto' });
        applyBtn.addEventListener('click', () => {
          void (async () => {
            await this.plugin.applyTemplate(CUSTOM_PREFIX + tpl.id);
            this.update();
          })();
        });

        btnWrap.createEl('button', { cls: 'pbt-btn', text: 'Edit' }).addEventListener('click', () => {
          const modal = new TemplateEditModal(this.app, this.plugin, tpl, false, async (updated: PDFTemplate) => {
            Object.assign(tpl, updated);
            await this.plugin.saveSettings();
            if (isActive && this.plugin.settings.enabled) this.plugin.applyTint();
            this.update();
          });
          modal.open();
        });

        btnWrap.createEl('button', { cls: 'pbt-btn pbt-btn-danger', text: 'Delete' }).addEventListener('click', () => {
          const confirmModal = new Modal(this.app);
          confirmModal.titleEl.setText('Delete Template');
          const msg = confirmModal.contentEl.createEl('p');
          msg.setText(`Are you sure you want to delete "${tpl.name}"?`);
          msg.setCssStyles({ margin: '16px 0 24px', color: 'var(--text-muted)' });

          const btnRow2 = confirmModal.contentEl.createDiv({ cls: 'pbt-modal-footer' });
          const deleteBtn2 = btnRow2.createEl('button', { text: 'Delete', cls: 'mod-cta' });
          deleteBtn2.setCssStyles({ background: 'var(--interactive-accent)', color: '#fff' });
          const handleDelete = async () => {
            const idx = this.plugin.settings.customTemplates.findIndex(t => t.id === tpl.id);
            if (idx >= 0) {
              this.plugin.settings.customTemplates.splice(idx, 1);
              if (this.plugin.settings.activePreset === CUSTOM_PREFIX + tpl.id) {
                this.plugin.settings.activePreset = 'none';
              }
              await this.plugin.saveSettings();
              if (this.plugin.settings.enabled) this.plugin.applyTint();
            }
            confirmModal.close();
            window.setTimeout(() => this.update(), 100);
          };
          deleteBtn2.addEventListener('click', () => { void handleDelete(); });
          btnRow2.createEl('button', { text: 'Cancel' }).addEventListener('click', () => confirmModal.close());
          confirmModal.open();
        });
      }
    }

    new Setting(containerEl)
      .setName('Create new template')
      .setDesc('Generate a new custom template with default settings, then customize it')
      .addButton(button => button
        .setButtonText('Add Template')
        .setCta()
        .onClick(() => {
          const tpl = makeDefaultTemplate();
          const modal = new TemplateEditModal(this.app, this.plugin, tpl, true, async (newTpl: PDFTemplate) => {
            this.plugin.settings.customTemplates.push(newTpl);
            await this.plugin.saveSettings();
            this.update();
          });
          modal.open();
        }));

    new Setting(containerEl)
      .setName('Reset to defaults')
      .setDesc('Reset active template to None and clear all custom templates')
      .addButton(button => button
        .setButtonText('Reset')
        .onClick(() => {
          const confirmModal = new Modal(this.app);
          confirmModal.titleEl.setText('Reset to Defaults');
          const msg = confirmModal.contentEl.createEl('p');
          msg.setText('This will reset to None and delete all custom templates.');
          msg.setCssStyles({ margin: '16px 0 24px', color: 'var(--text-muted)' });

          const btnRow = confirmModal.contentEl.createDiv({ cls: 'pbt-modal-footer' });
          const resetBtn = btnRow.createEl('button', { text: 'Reset', cls: 'mod-cta' });
          resetBtn.setCssStyles({ background: 'var(--interactive-accent)', color: '#fff' });
          const handleReset = async () => {
            this.plugin.settings.activePreset = 'none';
            this.plugin.settings.customTemplates = [];
            await this.plugin.saveSettings();
            this.plugin.applyTint();
            confirmModal.close();
            this.update();
          };
          resetBtn.addEventListener('click', () => { void handleReset(); });
          btnRow.createEl('button', { text: 'Cancel' }).addEventListener('click', () => confirmModal.close());
          confirmModal.open();
        }));
  }
}
