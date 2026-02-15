// content script

let config = null;
let lastContextTarget = null;
let lastContextPosition = { x: 0, y: 0 };
let copiedTooltipTimeout = null;

function logInfo(...args) {
    // console.log('[Web-to-Markdown]', ...args);
}

function logError(...args) {
    console.error('[Web-to-Markdown]', ...args);
}

function showErrorDialog(message) {
    window.alert(`Web to Markdown error:\n${message}`);
}

function showCopiedTooltip() {
    let tooltip = document.getElementById('web-to-markdown-copied-tooltip');

    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'web-to-markdown-copied-tooltip';
        tooltip.textContent = 'Markdown in clipboard';
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = '2147483647';
        tooltip.style.background = 'rgba(22, 22, 22, 0.92)';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '12px 20px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '12px';
        tooltip.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.22)';
        document.documentElement.appendChild(tooltip);
    }

    const x = Math.max(8, Math.min(lastContextPosition.x + 12, window.innerWidth - 90));
    const y = Math.max(8, Math.min(lastContextPosition.y + 12, window.innerHeight - 40));
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.opacity = '1';
    tooltip.style.display = 'block';

    if (copiedTooltipTimeout) {
        clearTimeout(copiedTooltipTimeout);
    }
    copiedTooltipTimeout = setTimeout(() => {
        tooltip.style.display = 'none';
    }, 1500);
}

const DEFAULT_PLATFORM_CONFIG = {
    chatgpt: {
        getAIChat: () => {
            return document.querySelector('main');
        },
        getAIResponse: (clickedElement) => {
            return clickedElement?.closest('div[data-message-author-role="assistant"]') || null;
        },
    },
    gemini: {
        getAIChat: () => {
            return document.querySelector('#chat-history');
        },
        getAIResponse: (clickedElement) => {
            return clickedElement?.closest('message-content') || null;
        },
    },
    generic: {
        getAIChat: () => null,
        getAIResponse: () => null,
    },
};

function detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('chatgpt.com') || hostname.includes('openai.com')) {
        return 'chatgpt';
    }
    if (hostname.includes('gemini.google.com')) {
        return 'gemini';
    }
    return 'generic';
}

const currentPlatform = detectPlatform();
const DEFAULT_FORMAT_SETTINGS = {
    requestHeaderText: '\n\n# Question\n\n',
    requestQuotePrefix: '> ',
    responseHeaderText: '\n\n## Answer\n\n'
};

function loadSettings(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(['markdownFormatSettings'], (result) => {
            const savedSettings = result.markdownFormatSettings || {};
            const defaultSelectors = DEFAULT_PLATFORM_CONFIG[currentPlatform] || DEFAULT_PLATFORM_CONFIG.generic;

            config = {
                getAIChat: defaultSelectors.getAIChat,
                getAIResponse: defaultSelectors.getAIResponse,
                requestHeaderText: typeof savedSettings.requestHeaderText === 'string'
                    ? savedSettings.requestHeaderText
                    : DEFAULT_FORMAT_SETTINGS.requestHeaderText,
                requestQuotePrefix: typeof savedSettings.requestQuotePrefix === 'string'
                    ? savedSettings.requestQuotePrefix
                    : DEFAULT_FORMAT_SETTINGS.requestQuotePrefix,
                responseHeaderText: typeof savedSettings.responseHeaderText === 'string'
                    ? savedSettings.responseHeaderText
                    : DEFAULT_FORMAT_SETTINGS.responseHeaderText
            };

            logInfo('loaded config:', config);
            if (callback) {
                callback();
            }
        });
        return;
    }

    const defaultSelectors = DEFAULT_PLATFORM_CONFIG[currentPlatform] || DEFAULT_PLATFORM_CONFIG.generic;
    config = {
        getAIChat: defaultSelectors.getAIChat,
        getAIResponse: defaultSelectors.getAIResponse,
        requestHeaderText: DEFAULT_FORMAT_SETTINGS.requestHeaderText,
        requestQuotePrefix: DEFAULT_FORMAT_SETTINGS.requestQuotePrefix,
        responseHeaderText: DEFAULT_FORMAT_SETTINGS.responseHeaderText
    };
    logInfo('using default config (storage not available)');
    if (callback) {
        callback();
    }
}

function htmlToMarkdown(element) {
    if (typeof TurndownService === 'undefined') {
        throw new Error('TurndownService is not available.');
    }

    const root = element.cloneNode(true);

    const turndownService = new TurndownService({
        headingStyle: 'atx',
        hr: '------------------------------------------------------------------------------------------------------------------------',
        codeBlockStyle: 'fenced',
        bulletListMarker: '*',
        emDelimiter: '*'
    });

    turndownService.use(turndownPluginGfm.gfm);

    turndownService.addRule('skipChatGptReferenceSpans', {
        filter: function (node) {
            return node.nodeName === 'SPAN' && (
                (node.hasAttribute('data-state') && node.getAttribute('data-state') === 'closed') ||
                node.firstElementChild?.firstElementChild?.tagName === 'BUTTON'
            );
        },
        replacement: function () {
            return '';
        }
    });

    turndownService.addRule('katexMath', {
        filter: function (node) {
            return node.nodeName === 'SPAN' && node.classList.contains('katex');
        },
        replacement: function (_content, node) {
            const mathAnnotation = node.querySelector('annotation[encoding="application/x-tex"]');
            if (!mathAnnotation) {
                return '';
            }

            const isDisplay = node.classList.contains('katex-display') || node.parentElement?.classList.contains('katex-display');
            return isDisplay
                ? '\n$$\n' + mathAnnotation.textContent + '\n$$\n\n'
                : '$' + mathAnnotation.textContent + '$';
        }
    });

    turndownService.addRule('geminiInlineMath', {
        filter: function (node) {
            return node.nodeName === 'SPAN' && node.classList.contains('math-inline');
        },
        replacement: function (_content, node) {
            const mathContent = node.getAttribute('data-math');
            return mathContent ? '$' + mathContent + '$' : '';
        }
    });

    turndownService.addRule('geminiBlockMathSpan', {
        filter: function (node) {
            return node.nodeName === 'SPAN' && node.classList.contains('math-block');
        },
        replacement: function (_content, node) {
            const mathContent = node.getAttribute('data-math');
            return mathContent ? '\n$$\n' + mathContent + '\n$$\n\n' : '';
        }
    });

    turndownService.addRule('geminiBlockMathDiv', {
        filter: function (node) {
            return node.nodeName === 'DIV' && node.classList.contains('math-block');
        },
        replacement: function (_content, node) {
            const mathContent = node.getAttribute('data-math');
            return mathContent ? '\n$$\n' + mathContent + '\n$$\n\n' : '';
        }
    });

    turndownService.addRule('geminiCodeBlock', {
        filter: function (node) {
            return node.nodeName === 'CODE-BLOCK';
        },
        replacement: function (_content, node) {
            const langSpan = node.querySelector('.code-block-decoration span');
            const language = langSpan ? langSpan.textContent.trim().toLowerCase() : '';
            const codeContent = node.querySelector('code[data-test-id="code-content"]');
            if (!codeContent) {
                return '';
            }
            return '```' + language + '\n' + codeContent.textContent + '\n```\n\n';
        }
    });

    // rule for "You said" -> # Question
    turndownService.addRule('geminiRequestHeader', {
        filter: function (node) {
            return node.textContent.trim() === 'You said';
        },
        replacement: function () {
            return config.requestHeaderText;
        }
    });

    turndownService.addRule('geminiRequestQuote', {
        filter: function (node) {
            return node.classList && node.classList.contains('query-content');
        },
        replacement: function (content) {
            const cleanedContent = content.trim();
            const quoted = cleanedContent.replace(/^/gm, config.requestQuotePrefix);
            return '\n\n' + quoted + '\n\n';
        }
    });

    // rule for "###### Gemini said" -> ## Answer
    turndownService.addRule('geminiResponseHeader', {
        filter: function (node) {
            return node.textContent.trim() === 'Gemini said';
        },
        replacement: function () {
            return config.responseHeaderText;
        }
    });

    // rule to skip standalone "description"
    turndownService.addRule('skipDescription', {
        filter: function (node) {
            return node.textContent.trim() === 'description';
        },
        replacement: function () {
            return '';
        }
    });

    turndownService.addRule('gptPreCodeBlock', {
        filter: function (node) {
            return node.nodeName === 'PRE' && !node.closest('code-block');
        },
        replacement: function (_content, node) {
            const codeElement = node.querySelector('code');
            if (!codeElement) {
                return '```\n' + node.textContent + '\n```\n\n';
            }

            let language = '';
            const langElement = node.firstElementChild?.firstElementChild;
            if (langElement) {
                const langText = langElement.textContent.trim();
                if (langText.length < 20 && /^[a-zA-Z0-9+#-]+$/.test(langText)) {
                    language = langText.toLowerCase();
                }
            }

            return '```' + language + '\n' + codeElement.textContent + '\n```\n\n';
        }
    });

    // rule for user question header
    turndownService.addRule('gptRequestHeader', {
        filter: function (node) {
            return (
                node.nodeName === 'H5' &&
                node.closest('article[data-turn="user"]') &&
                node.closest('article[data-turn="user"]').querySelector('h5') === node
            );
        },
        replacement: function () {
            return config.requestHeaderText;
        }
    });

    turndownService.addRule('gptRequestQuote', {
        filter: function (node) {
            return node.nodeName === 'ARTICLE' && node.getAttribute('data-turn') === 'user';
        },
        replacement: function (content) {
            const cleanedContent = content.trim();
            const quoted = cleanedContent.replace(/^/gm, config.requestQuotePrefix);
            return '\n\n' + quoted + '\n\n';
        }
    });

    // rule for assistant answer header
    turndownService.addRule('gptResponseHeader', {
        filter: function (node) {
            return (
                node.nodeName === 'H6' &&
                node.closest('article[data-turn="assistant"]') &&
                node.closest('article[data-turn="assistant"]').querySelector('h6') === node
            );
        },
        replacement: function () {
            return config.responseHeaderText;
        }
    });

    return turndownService.turndown(root).trim();
}

async function writeElementAsMarkdown(element, notFoundMessage) {
    if (!element) {
        throw new Error(notFoundMessage);
    }

    const markdown = htmlToMarkdown(element);
    await navigator.clipboard.writeText(markdown);
    return markdown;
}

async function copyPageAsMarkdown() {
    return writeElementAsMarkdown(document.body, 'Page body not found.');
}

async function copySelectionAsMarkdown() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        throw new Error('No text selected.');
    }

    const selectedRoot = document.createElement('div');
    for (let i = 0; i < selection.rangeCount; i += 1) {
        selectedRoot.appendChild(selection.getRangeAt(i).cloneContents());
    }

    return writeElementAsMarkdown(selectedRoot, 'Selection content not found.');
}

async function copyAIChatAsMarkdown() {
    const chatContent = config.getAIChat(lastContextTarget);
    return writeElementAsMarkdown(chatContent, 'AI chat content not found.');
}

async function copyAIResponseAsMarkdown() {
    const responseContent = config.getAIResponse(lastContextTarget);
    return writeElementAsMarkdown(responseContent, 'AI response not found from the clicked element.');
}

function initContextTargetTracking() {
    document.addEventListener('contextmenu', (event) => {
        lastContextTarget = event.target;
        lastContextPosition = {
            x: event.clientX,
            y: event.clientY
        };
    }, true);
}

function initMessageListener() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) {
        return;
    }

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.action === 'showErrorDialog') {
            showErrorDialog(message.error || 'unknown error');
            sendResponse({ success: true });
            return true;
        }

        const handlers = {
            copyPageAsMarkdown,
            copySelectionAsMarkdown,
            copyAIChatAsMarkdown,
            copyAIResponseAsMarkdown
        };

        const handler = handlers[message?.action];
        if (!handler) {
            return undefined;
        }

        handler()
            .then(() => {
                showCopiedTooltip();
                sendResponse({ success: true });
            })
            .catch((error) => {
                logError(`[${message.action}] failed:`, error);
                //showErrorDialog(error.message || 'unknown error');
                sendResponse({ success: false, error: error.message });
            });

        return true;
    });
}

function init() {
    initContextTargetTracking();
    initMessageListener();
    logInfo(`Initialized for ${currentPlatform}`);
}

loadSettings(() => {
    try {
        init();
    } catch (error) {
        logError('Failed to initialize extension:', error);
    }
});
