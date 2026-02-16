# Developing the Web to Markdown browser extension

## Installation

### Developer mode

#### Chromium browsers

1. Open `chrome://extensions/`
2. Enable developer mode
3. Click `Load unpacked`
4. Select this project folder

#### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click `Load Temporary Add-on`
3. Select `manifest.json`

### Using signed unlisted add-on

For private use we can sign the Firefox extension with the following procedure:

1. Get the credentials from AMO.
2. Install web-ext using this command:
    ```
    npm install --global web-ext
    ```
3. Run this command to create a signed .xpi file
    ```
    npm exec -- web-ext sign --api-key="JWT issuer" --api-secret="JWT secret" --channel="unlisted" --source-dir <directory_containing_manifest>
    ```
4. A folder with "web-ext-artifacts" name and an XPI file would be created. You can install the XPI!

## Before Publishing: Generate Icons

The extension requires icon files. Follow these steps to generate them:

1. Open `icon-generator.html` in your browser
2. The icons will be automatically generated and displayed
3. Click "Download All" to download all three icon sizes
4. Move the downloaded files to `extension/icons/` folder:
   - `icon16.png` (16x16)
   - `icon48.png` (48x48)
   - `icon128.png` (128x128)

## Publishing to Browser Stores

### Chrome Web Store

1. **Create a Developer Account**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Pay the one-time $5 registration fee

2. **Prepare the Package**
   ```bash
   cd extension
   zip -r ../web-to-markdown-chrome.zip .
   ```

3. **Upload**
   - Click "New Item" in the dashboard
   - Upload the ZIP file
   - Fill in the store listing details:
     - Name: Web to Markdown
     - Description: Copying Web page content and AI conversations as Markdown
     - Category: Productivity
     - Screenshots (at least 1, 1280x800 or 640x400)
     - Icon (128x128, already in your package)

4. **Submit for Review**
   - Review can take a few days

### Firefox Add-ons (AMO)

1. **Create a Developer Account**
   - Go to [Firefox Add-ons Developer Hub](https://addons.mozilla.org/developers/)
   - Create an account (free)

2. **Prepare the Package**
   ```bash
   cd extension
   zip -r ../web-to-markdown-firefox.zip .
   ```

3. **Upload**
   - Go to [Submit a New Add-on](https://addons.mozilla.org/developers/addon/submit/)
   - Upload the ZIP file
   - Choose distribution channel (On this site / Self-distribution)
   - Fill in the listing details

4. **Submit for Review**
   - Firefox reviews are typically faster than Chrome

### Important Notes for Publishing

- **Privacy Policy**: Both stores may require a privacy policy. Since this extension only uses `clipboardWrite` permission and doesn't collect any data, you can include this simple statement:

  ```
  Privacy Policy for Web to Markdown

  This extension does not collect, store, or transmit any user data.
  It only requires clipboard write permission to copy text to your clipboard when you click the Markdown copy button.
  All processing is done locally in your browser.
  ```

- **Promotional Images**: Chrome requires promotional images (440x280, 920x680, 1400x560)
