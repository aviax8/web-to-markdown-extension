if (!globalThis.i18n) {
    throw new Error('i18nApi is not available.');
}

const t = globalThis.i18n.t;

const MENU_ROOT = 'web-to-markdown';
const MENU_COPY_PAGE = 'copy-page-as-markdown';
const MENU_COPY_SELECTION = 'copy-selection-as-markdown';
const MENU_COPY_AI_CHAT = 'copy-ai-chat-as-markdown';
const MENU_COPY_AI_RESPONSE = 'copy-ai-response-as-markdown';
const AI_DOCUMENT_URL_PATTERNS = [
    '<all_urls>'
    //~ 'https://chatgpt.com/*',
    //~ 'https://chat.openai.com/*',
    //~ 'https://gemini.google.com/*'
];

function createContextMenu() {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: MENU_ROOT,
            title: t('menu_root_title', 'Web to Markdown'),
            contexts: ['all'],
            documentUrlPatterns: ['<all_urls>']
        });
        chrome.contextMenus.create({
            id: MENU_COPY_PAGE,
            parentId: MENU_ROOT,
            title: t('menu_copy_page', 'Copy page as Markdown'),
            contexts: ['page', 'selection'],
            documentUrlPatterns: ['<all_urls>']
        });
        chrome.contextMenus.create({
            id: MENU_COPY_SELECTION,
            parentId: MENU_ROOT,
            title: t('menu_copy_selection', 'Copy selection as Markdown'),
            contexts: ['selection'],
            documentUrlPatterns: ['<all_urls>']
        });
        chrome.contextMenus.create({
            id: MENU_COPY_AI_CHAT,
            parentId: MENU_ROOT,
            title: t('menu_copy_ai_chat', 'Copy AI chat as Markdown'),
            contexts: ['page', 'selection'],
            documentUrlPatterns: AI_DOCUMENT_URL_PATTERNS
        });
        chrome.contextMenus.create({
            id: MENU_COPY_AI_RESPONSE,
            parentId: MENU_ROOT,
            title: t('menu_copy_ai_response', 'Copy AI response as Markdown'),
            contexts: ['page', 'selection'],
            documentUrlPatterns: AI_DOCUMENT_URL_PATTERNS
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('[Web-to-Markdown] Failed to create context menu:', chrome.runtime.lastError.message);
            }
        });
    });
}

function handleVersionUpdate(details) {
    const manifest = chrome.runtime.getManifest();
    const newVersion = manifest.version;

    if (details.reason === 'install') {
        chrome.storage.sync.set({ extensionVersion: newVersion });
        return;
    }

    if (details.reason !== 'update') {
        return;
    }

    chrome.storage.sync.get(['extensionVersion'], (result) => {
        const oldVersion = result.extensionVersion;
        if (oldVersion === newVersion) {
            return;
        }

        chrome.storage.sync.remove(['customSelectors'], () => {
            chrome.storage.sync.set({ extensionVersion: newVersion });
            console.log(`[Web-to-Markdown] Updated from ${oldVersion} to ${newVersion}, reset config`);
        });
    });
}

chrome.runtime.onInstalled.addListener((details) => {
    handleVersionUpdate(details);
    createContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
    createContextMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id) {
        return;
    }

    let action = null;
    if (info.menuItemId === MENU_COPY_PAGE) {
        action = 'copyPageAsMarkdown';
    } else if (info.menuItemId === MENU_COPY_SELECTION) {
        action = 'copySelectionAsMarkdown';
    } else if (info.menuItemId === MENU_COPY_AI_CHAT) {
        action = 'copyAIChatAsMarkdown';
    } else if (info.menuItemId === MENU_COPY_AI_RESPONSE) {
        action = 'copyAIResponseAsMarkdown';
    }

    if (!action) {
        return;
    }

    chrome.tabs.sendMessage(tab.id, { action }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('[Web-to-Markdown] Failed to copy content:', chrome.runtime.lastError.message);
            return;
        }

        if (!response?.success) {
            const errorMessage = response?.error || t('error_unknown', 'unknown error');
            console.error('[Web-to-Markdown] Action failed:', action, errorMessage);
            chrome.tabs.sendMessage(tab.id, {
                action: 'showErrorDialog',
                error: errorMessage
            });
        }
    });
});
