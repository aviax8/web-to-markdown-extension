// settings helpers
var WebToMarkdownSettings = (function (exports) {
'use strict';

const STORAGE_KEY = 'markdownFormatSettings';

const DEFAULT_FORMAT_SETTINGS = Object.freeze({
    requestHeaderText: '\n\n# Question\n\n',
    requestQuotePrefix: '> ',
    responseHeaderText: '\n\n## Answer\n\n'
});

function normalizeFormatSettings(value) {
    const normalized = { ...DEFAULT_FORMAT_SETTINGS };
    const source = value && typeof value === 'object' ? value : {};

    if (typeof source.requestHeaderText === 'string') {
        normalized.requestHeaderText = source.requestHeaderText;
    }
    if (typeof source.requestQuotePrefix === 'string') {
        normalized.requestQuotePrefix = source.requestQuotePrefix;
    }
    if (typeof source.responseHeaderText === 'string') {
        normalized.responseHeaderText = source.responseHeaderText;
    }

    return normalized;
}

function loadSettings(callback) {
    const done = (settings, error) => {
        if (typeof callback === 'function') {
            callback(settings, error || null);
        }
    };

    if (typeof chrome === 'undefined' || !chrome.storage?.sync?.get) {
        done({ ...DEFAULT_FORMAT_SETTINGS }, null);
        return;
    }

    chrome.storage.sync.get([STORAGE_KEY], (result) => {
        if (chrome.runtime?.lastError) {
            done({ ...DEFAULT_FORMAT_SETTINGS }, chrome.runtime.lastError);
            return;
        }

        const merged = normalizeFormatSettings(result?.[STORAGE_KEY]);
        done(merged, null);
    });
}

function saveSettings(value, callback) {
    const done = (settings, error) => {
        if (typeof callback === 'function') {
            callback(settings, error || null);
        }
    };

    const normalized = normalizeFormatSettings(value);

    if (typeof chrome === 'undefined' || !chrome.storage?.sync?.set) {
        done(normalized, null);
        return;
    }

    chrome.storage.sync.set({ [STORAGE_KEY]: normalized }, () => {
        if (chrome.runtime?.lastError) {
            done(normalized, chrome.runtime.lastError);
            return;
        }

        done(normalized, null);
    });
}

function resetSettings(callback) {
    const done = (settings, error) => {
        if (typeof callback === 'function') {
            callback(settings, error || null);
        }
    };

    if (typeof chrome === 'undefined' || !chrome.storage?.sync?.remove) {
        done({ ...DEFAULT_FORMAT_SETTINGS }, null);
        return;
    }

    chrome.storage.sync.remove(STORAGE_KEY, () => {
        if (chrome.runtime?.lastError) {
            done({ ...DEFAULT_FORMAT_SETTINGS }, chrome.runtime.lastError);
            return;
        }

        done({ ...DEFAULT_FORMAT_SETTINGS }, null);
    });
}

exports.loadSettings = loadSettings;
exports.saveSettings = saveSettings;
exports.resetSettings = resetSettings;

return exports;

}({}));
