// content script

const settingsApi = globalThis.WebToMarkdownSettings;

if (!settingsApi) {
    throw new Error('WebToMarkdownSettings is not available.');
}

if (!globalThis.i18n) {
    throw new Error('i18nApi is not available.');
}

const t = globalThis.i18n.t;

let settings = null;

let lastContextTarget = null;
let lastContextPosition = { x: 0, y: 0 };
let copiedTooltipTimeout = null;

const EXTRA_TURNDOWN_ESCAPES = [
    // strikethrough
    [/~~/g, '\\~\\~'],
    // tables
    [/\|/g, '\\|'],
    // katex
    [/\$/g, '\\$']
];

const PLATFORM_CONFIG = {
    chatgpt: {
        detect: () => {
            const location = window.location;
            return (location.hostname.includes('chatgpt.com') || location.hostname.includes('openai.com') || location.pathname.includes('chatgpt.html'));
        },
        getAIChat: () => {
            return document.querySelector('main');
        },
        getAIResponse: (clickedElement) => {
            return clickedElement?.closest('div[data-message-author-role="assistant"]') || null;
        },
        preprocess: (root) => {
            return chatgptPreprocess(root);
        },
        addRules: (turndownService) => {
            chatgptRules(turndownService);
        },
    },
    gemini: {
        detect: () => {
            // testing also gemini.html for tests
            const location = window.location;
            return (location.hostname.includes('gemini.google.com') || location.pathname.includes('gemini.html'));
        },
        getAIChat: () => {
            return document.querySelector('#chat-history');
        },
        getAIResponse: (clickedElement) => {
            return clickedElement?.closest('message-content') || null;
        },
        preprocess: (root) => {
            return geminiPreprocess(root);
        },
        addRules: (turndownService) => {
            geminiRules(turndownService);
        },
    },
    llamacpp: {
        detect: () => {
            return document.title.includes('llama.cpp') && document.querySelector('form[data-slot="chat-form"]');
        },
        getAIChat: () => {
            const chatForm = document.querySelector('form[data-slot="chat-form"]');
            return chatForm?.closest('div[role="main"]') || null;
        },
        getAIResponse: (clickedElement) => {
            return clickedElement?.closest('div[role="group"]') || null;
        },
        preprocess: (root) => {
            return llamacppPreprocess(root);
        },
        addRules: (turndownService) => {
            llamacppRules(turndownService);
        },
    },
    generic: {
        detect: () => false,
        preprocess: (root) => root,
        getAIChat: () => null,
        getAIResponse: () => null,
        addRules: (turndownService) => {
            commonRules(turndownService);
        },
    },
};

function detectPlatform() {
    for (const [platformName, platformConfig] of Object.entries(PLATFORM_CONFIG)) {
        if (platformName === 'generic') {
            continue;
        }

        if (platformConfig.detect()) {
            return platformConfig;
        }
    }

    return PLATFORM_CONFIG.generic;
}

function logInfo(..._args) {
    // console.log('[Web-to-Markdown]', ..._args);
}

function logError(...args) {
    console.error('[Web-to-Markdown]', ...args);
}

function showErrorDialog(message) {
    window.alert(`${t('error_dialog_prefix', 'Web to Markdown error:')}\n${message}`);
}

function showCopiedTooltip() {
    let tooltip = document.getElementById('web-to-markdown-copied-tooltip');

    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'web-to-markdown-copied-tooltip';
        tooltip.textContent = t('tooltip_markdown_in_clipboard', 'Markdown in clipboard');
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


function commonRules(turndownService) {
    turndownService.addRule('ignoreUnwanted', {
        filter: ['script', 'style', 'iframe'],
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

    // add just one new line \n after <p> instead of two
    turndownService.addRule('geminiNoBlankLines', {
        filter: ['p'],
        replacement: function (content, node) {
            if (!node.nextSibling) {
                return content;
            }
            if (node.nextSibling.nodeName === 'UL' || node.nextSibling.nodeName === 'OL') {
                return content + '\n';
            }
            return content + '\n\n';
        }
    });
}

function chatgptPreprocess(root) {
    // remapped <div class="whitespace-pre-wrap"> to <pre web-md="pre"> so that whitespace formatting is preserved
    // turndown -> RootNode -> collapseWhitespace()
    // <div class="whitespace-pre-wrap"> is used in User query
    const preWrapDivs = root.querySelectorAll('div.whitespace-pre-wrap');
    preWrapDivs.forEach((div) => {
        const pre = document.createElement('pre');
        pre.setAttribute('web-md', 'pre');
        const code = document.createElement('code');
        pre.appendChild(code);
        while (div.firstChild) {
            code.appendChild(div.firstChild);
        }
        div.replaceWith(pre);
    });
    return root;
}

function chatgptRules(turndownService) {
    commonRules(turndownService);

    turndownService.addRule('gptSkipReferenceSpans', {
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

    turndownService.addRule('gptPreCodeBlock', {
        filter: function (node) {
            return node.nodeName === 'PRE' && !node.closest('code-block'); // && !node.closest('article[data-turn="user"]');
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

    // return <div class="whitespace-pre-wrap"> as is
    // - used in User query, and remapped to <pre> in chatgptPreprocess()
    turndownService.addRule('gptDivWhitespacePre', {
        filter: function (node) {
            return node.nodeName === 'PRE' && node.getAttribute('web-md') === 'pre';
        },
        replacement: function (content, _node) {
            //~ return node.textContent + '\n\n';
            return content;
        }
    });

    // rule for quoted user question and its header
    turndownService.addRule('gptRequest', {
        filter: function (node) {
            return node.nodeName === 'ARTICLE' && node.getAttribute('data-turn') === 'user';
        },
        replacement: function (content) {
            const cleanedContent = content.trim();
            const cleanedPre = '<pre>\n\n' + cleanedContent + '\n\n</pre>\n';
            const quoted = cleanedPre.replace(/^/gm, settings.requestQuotePrefix);
            return settings.requestHeaderText + quoted;
        }
    });

    turndownService.addRule('gptIgnoreYouSaid', {
        filter: function (node) {
            return (
                node.nodeName === 'H5' &&
                node.closest('article[data-turn="user"]') &&
                node.closest('article[data-turn="user"]').querySelector('h5') === node
            );
        },
        replacement: function () {
            return '';
        }
    });

    turndownService.addRule('gptIgnoreDisclaimer', {
        filter: function (node) {
            return (
                node.nodeName === 'DIV' && node.getAttribute('id') === 'thread-bottom-container'
            );
        },
        replacement: function () {
            return '';
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
            return settings.responseHeaderText;
        }
    });

}

function geminiPreprocess(root) {
    // replace \n inside <p> with <br/> ONLY if after that \n there is some non-whitespace text
    const paragraphs = root.querySelectorAll('p');
    paragraphs.forEach((p) => {
        const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];

        // collect text nodes first (TreeWalker is live)
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        textNodes.forEach((textNode) => {
            const s = textNode.nodeValue;
            if (!s || !s.includes('\n')) return;

            const frag = document.createDocumentFragment();

            // split but keep \n as tokens
            const tokens = s.split(/(\n)/);

            for (let i = 0; i < tokens.length; i++) {
                const t = tokens[i];

                if (t === '\n') {
                    // check if after this \n there is any non-whitespace text in the remaining tokens
                    const rest = tokens.slice(i + 1).join('');
                    if (/\S/.test(rest)) {
                        frag.appendChild(document.createElement('br'));
                    }
                    // else: do nothing (drop trailing newline)
                } else if (t.length) {
                    frag.appendChild(document.createTextNode(t));
                }
            }

            textNode.replaceWith(frag);
        });
    });

    return root;
}

function geminiRules(turndownService) {
    commonRules(turndownService);

    turndownService.addRule('geminiIgnoreUnwanted', {
        filter: ['button'],
        replacement: function () {
            return '';
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
            return '```' + language + '\n' + codeContent.textContent + '```\n\n';
        }
    });

    // rule for quoted user question and its header
    turndownService.addRule('geminiRequest', {
        filter: function (node) {
            return node.classList && node.classList.contains('query-content');
        },
        replacement: function (content) {
            const cleanedContent = content.trim();
            const cleanedPre = '<pre>\n\n' + cleanedContent + '\n\n</pre>\n';
            const quoted = cleanedPre.replace(/^/gm, settings.requestQuotePrefix);
            return settings.requestHeaderText + quoted;
        }
    });

    turndownService.addRule('geminiIgnoreYouSaid', {
        filter: function (node) {
            return node.nodeName === 'SPAN' && node.classList.contains('cdk-visually-hidden') && node.textContent.trim() === 'You said';
        },
        replacement: function () {
            return '';
        }
    });

    turndownService.addRule('geminiIgnoreReasoning', {
        filter: function (node) {
            return node.nodeName === 'DIV' && node.classList.contains('thoughts-container');
        },
        replacement: function () {
            return '';
        }
    });

    // rule for "###### Gemini said" -> ## Answer
    turndownService.addRule('geminiResponseHeader', {
        filter: function (node) {
            return node.textContent.trim() === 'Gemini said';
        },
        replacement: function () {
            return settings.responseHeaderText;
        }
    });

    // rule to skip standalone "description"
    turndownService.addRule('geminiIgnoreDescription', {
        filter: function (node) {
            return node.textContent.trim() === 'description';
        },
        replacement: function () {
            return '';
        }
    });

    // rule for Query lines -> returns original as is
    turndownService.addRule('geminiRequest', {
        filter: function (node) {
            return node.nodeName === 'P' && node.closest('div.query-content');
        },
        replacement: function (_content, node) {
            return (node.textContent?.length != 0) ? node.textContent + '\n' : ' \n';
        }
    });

}

function llamacppPreprocess(root) {
    // remapped <span class="whitespace-pre-wrap"> to <pre web-md="pre"> so that whitespace formatting is preserved
    // turndown -> RootNode -> collapseWhitespace()
    // <span class="whitespace-pre-wrap"> is used in User query
    const preWrapDivs = root.querySelectorAll('span.whitespace-pre-wrap');
    preWrapDivs.forEach((div) => {
        const pre = document.createElement('pre');
        pre.setAttribute('web-md', 'pre');
        while (div.firstChild) {
            pre.appendChild(div.firstChild);
        }
        div.replaceWith(pre);
    });
    return root;
}

function llamacppRules(turndownService) {
    commonRules(turndownService);

    // return <span class="whitespace-pre-wrap"> as is
    // - used in User query, and remapped to <pre> in llamacppPreprocess()
    turndownService.addRule('llamacppSpanWhitespacePre', {
        filter: function (node) {
            return node.nodeName === 'PRE' && node.getAttribute('web-md') === 'pre';
        },
        replacement: function (_content, node) {
            return node.textContent + '\n\n';
        }
    });

    // rule for quoted user question and its header
    turndownService.addRule('llamacppRequest', {
        filter: function (node) {
            return node.nodeName === 'DIV' && node.getAttribute('aria-label') === 'User message with actions';
        },
        replacement: function (content) {
            const cleanedContent = content.trim();
            const cleanedPre = '<pre>\n\n' + cleanedContent + '\n\n</pre>\n';
            const quoted = cleanedPre.replace(/^/gm, settings.requestQuotePrefix);
            return settings.requestHeaderText + quoted;
        }
    });

    turndownService.addRule('llamacppIgnoreReasoning', {
        // div[data-slot="collapsible"] direct descendants of div[class="text-md"]
        filter: function (node) {
            const isCollapsible = node.nodeName === 'DIV' &&
                                  node.getAttribute('data-slot') === 'collapsible';

            const parent = node.parentElement;
            const isDirectChildOfTextMd = parent &&
                                          parent.nodeName === 'DIV' &&
                                          parent.classList.contains('text-md');

            return isCollapsible && isDirectChildOfTextMd;
        },
        replacement: function () {
            return '';
        }
    });

    // rule for answer header
    turndownService.addRule('llamacppResponseHeader', {
        filter: function (node) {
            return node.nodeName === 'DIV' && node.getAttribute('aria-label') === 'Assistant message with actions';
        },
        replacement: function (content) {
            // content = the converted markdown of the inner elements
            // We prepend the header text from settings and add newlines for proper formatting
            return settings.responseHeaderText + '\n\n' + content;
        }
    });

    // rule to skip standalone "description"
    turndownService.addRule('llamacppIgnoreInfoAndForm', {
        filter: function (node) {
            return (node.nodeName === 'DIV' &&
                (
                    node.classList.contains('info') ||
                    node.classList.contains('chat-processing-info-container') ||
                    node.classList.contains('conversation-chat-form')
                )
            );
        },
        replacement: function () {
            return '';
        }
    });

}

function htmlToMarkdown(platform, element) {
    if (typeof TurndownService === 'undefined') {
        throw new Error(t('error_turndown_unavailable', 'TurndownService is not available.'));
    }

    const root = element.cloneNode(true);
    const preprocessedRoot = platform.preprocess(root) || root;

    const turndownService = new TurndownService({
        headingStyle: 'atx',
        hr: '------------------------------------------------------------------------------------------------------------------------',
        codeBlockStyle: 'fenced',
        bulletListMarker: '*',
        emDelimiter: '*',
        //...TurndownPluginExt.optionsSingleBlockNewLine()
    });

    turndownService.use(TurndownPluginGfm.gfm);
    turndownService.use(TurndownPluginExt.customEscapes(EXTRA_TURNDOWN_ESCAPES));

    platform.addRules(turndownService);

    return turndownService.turndown(preprocessedRoot).trim();
}

async function writeElementAsMarkdown(platform, element, notFoundMessage) {
    if (!element) {
        throw new Error(notFoundMessage);
    }

    const markdown = htmlToMarkdown(platform, element);
    await navigator.clipboard.writeText(markdown);
    return markdown;
}

async function copyPageAsMarkdown() {
    const platform = detectPlatform();
    return writeElementAsMarkdown(platform, document.body, t('error_page_body_not_found', 'Page body not found.'));
}

async function copySelectionAsMarkdown() {
    const platform = detectPlatform();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        throw new Error(t('error_no_text_selected', 'No text selected.'));
    }

    const selectedRoot = document.createElement('div');
    for (let i = 0; i < selection.rangeCount; i += 1) {
        selectedRoot.appendChild(selection.getRangeAt(i).cloneContents());
    }

    return writeElementAsMarkdown(platform, selectedRoot, t('error_selection_content_not_found', 'Selection content not found.'));
}

async function copyAIChatAsMarkdown() {
    const platform = detectPlatform();
    const chatContent = platform.getAIChat(lastContextTarget);
    return writeElementAsMarkdown(platform, chatContent, t('error_ai_chat_content_not_found', 'AI chat content not found.'));
}

async function copyAIResponseAsMarkdown() {
    const platform = detectPlatform();
    const responseContent = platform.getAIResponse(lastContextTarget);
    return writeElementAsMarkdown(
        platform,
        responseContent,
        t('error_ai_response_not_found', 'AI response not found from the clicked element.')
    );
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
            showErrorDialog(message.error || t('error_unknown', 'unknown error'));
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
    logInfo('Initialized.');
}

settingsApi.loadSettings((loadedSettings, error) => {
    settings = loadedSettings;

    if (error) {
        logError('failed to load settings:', error.message);
    } else {
        logInfo('loaded settings:', settings);
    }

    try {
        init();
    } catch (error) {
        logError('Failed to initialize extension:', error);
    }
});
