// settings helpers
(function (global) {
    'use strict';

    // translations
    function t(key, fallback) {
        if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
            const translated = chrome.i18n.getMessage(key);
            if (translated) {
                return translated;
            }
        }
        return fallback || key;
    }

    global.i18n = {
        t
    };

}(globalThis));
