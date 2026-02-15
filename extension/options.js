// es module - options page

const DEFAULT_FORMAT_SETTINGS = {
    requestHeaderText: '\n\n# Question\n\n',
    requestQuotePrefix: '> ',
    responseHeaderText: '\n\n## Answer\n\n'
};

const elements = {
    requestHeaderText: document.getElementById('request-header-text'),
    requestQuotePrefix: document.getElementById('request-quote-prefix'),
    responseHeaderText: document.getElementById('response-header-text'),
    saveSettings: document.getElementById('save-settings'),
    resetSettings: document.getElementById('reset-settings'),
    selectorStatus: document.getElementById('selector-status')
};

function showStatus(element, message, type = 'success', duration = 3000) {
    element.textContent = message;
    element.className = `status-message ${type}`;
    element.style.display = 'block';

    if (duration > 0) {
        setTimeout(() => {
            element.style.display = 'none';
        }, duration);
    }
}

function loadSettings() {
    chrome.storage.sync.get(['markdownFormatSettings'], (result) => {
        const settings = result.markdownFormatSettings || DEFAULT_FORMAT_SETTINGS;

        elements.requestHeaderText.value = typeof settings.requestHeaderText === 'string'
            ? settings.requestHeaderText
            : DEFAULT_FORMAT_SETTINGS.requestHeaderText;

        elements.requestQuotePrefix.value = typeof settings.requestQuotePrefix === 'string'
            ? settings.requestQuotePrefix
            : DEFAULT_FORMAT_SETTINGS.requestQuotePrefix;

        elements.responseHeaderText.value = typeof settings.responseHeaderText === 'string'
            ? settings.responseHeaderText
            : DEFAULT_FORMAT_SETTINGS.responseHeaderText;
    });
}

function saveSettings() {
    const markdownFormatSettings = {
        requestHeaderText: elements.requestHeaderText.value,
        requestQuotePrefix: elements.requestQuotePrefix.value,
        responseHeaderText: elements.responseHeaderText.value
    };

    chrome.storage.sync.set({ markdownFormatSettings }, () => {
        if (chrome.runtime.lastError) {
            showStatus(elements.selectorStatus, 'Error saving settings: ' + chrome.runtime.lastError.message, 'error');
        } else {
            showStatus(elements.selectorStatus, 'Settings saved. Refresh open tabs to apply changes.', 'success');
        }
    });
}

function resetSettings() {
    if (!confirm('Reset formatting settings to default values?')) {
        return;
    }

    chrome.storage.sync.remove('markdownFormatSettings', () => {
        loadSettings();
        showStatus(elements.selectorStatus, 'Settings reset to defaults.', 'success');
    });
}

elements.saveSettings.addEventListener('click', saveSettings);
elements.resetSettings.addEventListener('click', resetSettings);

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
});
