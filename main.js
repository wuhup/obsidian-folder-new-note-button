'use strict';

const { Notice, Plugin, normalizePath } = require('obsidian');

class FolderNewNoteButtonPlugin extends Plugin {
  constructor(app, manifest) {
    super(app, manifest);
    this.explorerDisposers = new Map();
  }

  async onload() {
    this.app.workspace.onLayoutReady(() => this.refreshFileExplorerHandlers());
    this.registerEvent(this.app.workspace.on('layout-change', () => this.refreshFileExplorerHandlers()));
  }

  onunload() {
    this.teardownAll();
  }

  refreshFileExplorerHandlers() {
    const leaves = this.app.workspace.getLeavesOfType('file-explorer');
    const activeViews = new Set();

    for (const leaf of leaves) {
      const view = leaf.view;
      if (!view) {
        continue;
      }
      activeViews.add(view);
      if (!this.explorerDisposers.has(view)) {
        const disposer = this.setupExplorer(view);
        if (disposer) {
          this.explorerDisposers.set(view, disposer);
        }
      }
    }

    for (const [view, disposer] of Array.from(this.explorerDisposers.entries())) {
      if (!activeViews.has(view)) {
        disposer();
        this.explorerDisposers.delete(view);
      }
    }
  }

  setupExplorer(view) {
    const container = view.containerEl?.querySelector('.nav-files-container');
    if (!container) {
      return null;
    }

    const processFolders = () => this.decorateFolderTitles(container, view);
    processFolders();

    const observer = new MutationObserver(processFolders);
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      this.removeButtons(container);
    };
  }

  decorateFolderTitles(root, explorerView) {
    const folderTitles = root.querySelectorAll('.nav-folder-title');
    folderTitles.forEach((titleEl) => this.ensureButton(titleEl, explorerView));
  }

  ensureButton(folderTitleEl, explorerView) {
    if (folderTitleEl.querySelector('.folder-new-note-button')) {
      return;
    }

    const button = folderTitleEl.createEl('button', {
      cls: 'folder-new-note-button',
      attr: {
        type: 'button',
        'aria-label': 'Create new note in this folder'
      }
    });
    button.setText('+');

    this.registerDomEvent(button, 'click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const folderPath = this.getFolderPath(folderTitleEl);
      if (!folderPath) {
        new Notice('Folder not found.');
        return;
      }
      const view = explorerView || this.findExplorerViewForElement(folderTitleEl);
      this.createNoteInFolder(folderPath, view);
    });
  }

  getFolderPath(folderTitleEl) {
    const folderEl = folderTitleEl.closest('.nav-folder');
    const rawPath = folderEl?.dataset?.path ?? folderTitleEl.dataset?.path ?? '';
    const normalized = rawPath ? normalizePath(rawPath) : '';
    if (!folderEl) {
      return null;
    }

    const rootPath = this.app.vault.getRoot()?.path || '/';
    if (normalized === '' || normalized === '/') {
      return normalizePath(rootPath);
    }

    return normalized;
  }

  async createNoteInFolder(folderPath, explorerView) {
    const rootPath = normalizePath(this.app.vault.getRoot()?.path || '/');
    const folder = this.app.vault.getFolderByPath(folderPath)
      || (folderPath === rootPath ? this.app.vault.getRoot() : null);
    if (!folder) {
      new Notice('Folder not found.');
      return;
    }

    const fileName = this.generateUniqueFileName(folder);
    try {
      const file = await this.app.fileManager.createNewMarkdownFile(folder, fileName);
      const leaf = this.app.workspace.getLeaf(false);

      // Open the file and make it active
      await leaf.openFile(file);

      // Select the inline title (first line) in the editor
      this.selectInlineTitle(leaf);
    } catch (error) {
      console.error('Folder New Note Button: failed to create file', error);
      new Notice('Could not create note in this folder.');
    }
  }

  selectInlineTitle(leaf) {
    // Wait a bit for the editor and DOM to fully initialize
    window.setTimeout(() => {
      const view = leaf.view;
      if (!view) {
        return;
      }

      // Try to find the inline title first (default behavior)
      const inlineTitleEl = view.containerEl?.querySelector('.inline-title');

      if (inlineTitleEl && inlineTitleEl.offsetParent !== null) {
        // Found and visible
        inlineTitleEl.focus();
        this.selectElementText(inlineTitleEl);
      } else {
        // Fallback: Try to find the view header title (when inline title is disabled)
        const headerTitleEl = view.containerEl?.querySelector('.view-header-title');
        if (headerTitleEl) {
          headerTitleEl.focus();
          // The header title might be a contenteditable div or contain an input
          // Usually clicking it triggers the edit mode, but focusing it might be enough
          // or we might need to trigger a click.
          // Let's try focusing and selecting first.

          // In some versions, the header title is a container for the text.
          // We might need to find the actual text node or input.
          // However, native behavior usually requires clicking the title to edit it 
          // if it's not already in edit mode.
          // Let's try to simulate a click if it's not an input.
          if (headerTitleEl.tagName !== 'INPUT' && headerTitleEl.tagName !== 'TEXTAREA') {
            headerTitleEl.click();
          }

          // After click/focus, try to select content
          // We might need a small delay if the click transforms it into an input
          window.setTimeout(() => {
            // Re-query in case the DOM changed (e.g. became an input)
            const activeEl = document.activeElement;
            if (activeEl && view.containerEl.contains(activeEl)) {
              this.selectElementText(activeEl);
            } else {
              this.selectElementText(headerTitleEl);
            }
          }, 50);
        }
      }
    }, 150);
  }

  selectElementText(element) {
    if (element.select) {
      element.select();
    } else {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  generateUniqueFileName(folder) {
    const configured = this.getBaseFileName();
    const baseName = configured.endsWith('.md') ? configured.slice(0, -3) : configured;
    const extension = 'md';
    let attempt = 0;

    while (true) {
      const suffix = attempt === 0 ? '' : ` ${attempt}`;
      const candidate = `${baseName}${suffix}.${extension}`;
      const fullPath = normalizePath(`${folder.path}/${candidate}`);
      if (!this.app.vault.getAbstractFileByPath(fullPath)) {
        return candidate;
      }
      attempt += 1;
    }
  }

  getBaseFileName() {
    const configured = this.app.vault.getConfig?.('newFileName');
    if (typeof configured === 'string') {
      const trimmed = configured.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
    return 'Untitled';
  }

  findExplorerViewForElement(element) {
    if (!element) {
      return null;
    }
    const leaf = this.app.workspace.getLeavesOfType('file-explorer')
      .find((candidate) => candidate.view?.containerEl?.contains(element));
    return leaf?.view ?? null;
  }

  removeButtons(container) {
    container.querySelectorAll('.folder-new-note-button').forEach((button) => button.remove());
  }

  teardownAll() {
    for (const disposer of this.explorerDisposers.values()) {
      disposer();
    }
    this.explorerDisposers.clear();
  }
}

module.exports = FolderNewNoteButtonPlugin;
