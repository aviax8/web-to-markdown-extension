# Web to Markdown

Browser extension for copying Web page content and AI conversations as Markdown.

## What the extension does

The extension adds a context menu group called `Web to Markdown` with these actions:

- `Copy page as Markdown` - Copy the entire page as Markdown.
- `Copy selection as Markdown` - Copy only the selected text as Markdown.
- `Copy AI chat as Markdown` - Copy the entire AI conversation as Markdown.
- `Copy AI response as Markdown` - Copy one AI response as Markdown.

### Behavior

- Works on every page where the extension is enabled.
- Converts HTML to Markdown locally using Turndown + GFM plugin (no external service calls).
- Copies the result to clipboard.

## How to use it

1. Right-click any page or selected text.
2. Open `Web to Markdown` submenu.
3. Choose copy action.
4. Paste markdown anywhere.

For `Copy AI response as Markdown`, right-click directly on the target AI response first.

## Current UX behavior

- Success: a small tooltip near the cursor is temporarily shown.
- Failure: an error is logged to the console and shown in an alert dialog.

## Settings

Options page allow setting markdown formatting texts used for AI transcript conversion:

- AI request header text
- AI request quote prefix
- AI response header text

## Markdown conversion details

Supported conversion includes:

- headings
- lists
- links
- blockquotes
- tables
- fenced code blocks with language detection
- KaTeX/Gemini math handling

## Permissions

- `clipboardWrite` - write converted markdown to clipboard
- `storage` - store options
- `contextMenus` - add right-click menu actions

## Privacy statement

- no analytics
- no data collection
- no remote servers
- local processing only

## 3rd party libraries

- [turndown.js](https://github.com/mixmark-io/turndown) for converting the HTML to Markdown
- [turndown-plugin-gfm](https://github.com/bwat47/turndown-plugin-gfm) for converting the HTML tables to Markdown

## License

- MIT License - feel free to modify and distribute
