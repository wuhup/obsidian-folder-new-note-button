# Folder New Note Button

Adds a subtle "+" button to every folder in Obsidian's Files view. Hover a folder title (or focus it with the keyboard) to show the button and create a new note directly inside that folder.

## Features
- Hover or focus a folder title to reveal a minimal "+" action on the right.
- Creates a uniquely named Markdown file in the chosen folder and opens it immediately.
- Works alongside multiple File Explorer panes and cleans up when the plugin is disabled.

## Installation
1. Copy the `folder-new-note-button` folder (containing `manifest.json`, `main.js`, and `styles.css`) into your vault's `.obsidian/plugins/` directory.
2. Reload Obsidian or toggle the plugin on from **Settings → Community Plugins**.
3. Hover over any folder in the Files view and click the "+" button to create a new note there.

## Notes
- The plugin avoids the global `app` instance and uses Obsidian's provided APIs, following the guidelines in `material/pugin-guidelines.md` and `material/submission-requirements.md`.
- No desktop-only APIs are used, so the plugin works on mobile, though the button is revealed by hover/focus.
