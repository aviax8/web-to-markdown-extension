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

## Developing

### Installation (developer mode)

#### Chromium browsers

1. Open `chrome://extensions/`
2. Enable developer mode
3. Click `Load unpacked`
4. Select this project folder

#### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click `Load Temporary Add-on`
3. Select `manifest.json`

### Before Publishing: Generate Icons

The extension requires icon files. Follow these steps to generate them:

1. Open `icon-generator.html` in your browser
2. The icons will be automatically generated and displayed
3. Click "Download All" to download all three icon sizes
4. Move the downloaded files to `extension/icons/` folder:
   - `icon16.png` (16x16)
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)

### Publishing to Browser Stores

#### Chrome Web Store

1. **Create a Developer Account**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Pay the one-time $5 registration fee

2. **Prepare the Package**
   ```bash
   cd extension
   zip -r ../chatgpt-markdown-copy.zip .
   ```

3. **Upload**
   - Click "New Item" in the dashboard
   - Upload the ZIP file
   - Fill in the store listing details:
     - Name: ChatGPT & Gemini Markdown Copy
     - Description: Add Markdown copy button to ChatGPT and Gemini responses
     - Category: Productivity
     - Screenshots (at least 1, 1280x800 or 640x400)
     - Icon (128x128, already in your package)

4. **Submit for Review**
   - Review can take a few days

#### Firefox Add-ons (AMO)

1. **Create a Developer Account**
   - Go to [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
   - Create an account (free)

2. **Prepare the Package**
   ```bash
   cd extension
   zip -r ../chatgpt-markdown-copy-firefox.zip .
   ```

3. **Upload**
   - Go to [Submit a New Add-on](https://addons.mozilla.org/developers/addon/submit/)
   - Upload the ZIP file
   - Choose distribution channel (On this site / Self-distribution)
   - Fill in the listing details

4. **Submit for Review**
   - Firefox reviews are typically faster than Chrome

#### Important Notes for Publishing

- **Privacy Policy**: Both stores may require a privacy policy. Since this extension only uses `clipboardWrite` permission and doesn't collect any data, you can include this simple statement:

  ```
  Privacy Policy for Web to Markdown

  This extension does not collect, store, or transmit any user data.
  It only requires clipboard write permission to copy text to your clipboard when you click the Markdown copy button.
  All processing is done locally in your browser.
  ```

- **Screenshots**: Create screenshots showing:
  - The extension in action on ChatGPT
  - The extension in action on Gemini
  - The Markdown copy button highlighted
  - Example of copied Markdown content

- **Promotional Images**: Chrome requires promotional images (440x280, 920x680, 1400x560)

## 3rd party libraries

- [turndown.js](https://github.com/mixmark-io/turndown) for converting the HTML to Markdown
- [turndown-plugin-gfm](https://github.com/bwat47/turndown-plugin-gfm) for converting the HTML tables to Markdown

## License

- MIT License - feel free to modify and distribute
