# Folder New Note Button

Adds a subtle "+" button to every folder in Obsidian's Files view. Hover a folder title (or focus it with the keyboard) to show the button and create a new note directly inside that folder.

## Features
- **Hover or Focus:** Reveal a minimal "+" button on the right side of any folder title.
- **Mobile Support:** Button is always visible on mobile devices, positioned to avoid overlap with the drag handle.
- **Native Feel:** Creates a uniquely named Markdown file and immediately selects the title for renaming, matching Obsidian's native "New note" behavior.
- **Smart Selection:** Supports both the inline title and the view header title (if inline title is disabled).
- **Clean:** Works alongside multiple File Explorer panes and cleans up completely when disabled.

## Installation
1. Copy the `folder-new-note-button` folder (containing `manifest.json`, `main.js`, and `styles.css`) into your vault's `.obsidian/plugins/` directory.
2. Reload Obsidian or toggle the plugin on from **Settings → Community Plugins**.
3. Hover over any folder in the Files view and click the "+" button to create a new note there.

## Notes
- The plugin avoids the global `app` instance and uses Obsidian's provided APIs.
- No desktop-only APIs are used, ensuring full mobile compatibility.

