// es module - options page

const settingsApi = globalThis.WebToMarkdownSettings;

if (!settingsApi) {
    throw new Error('WebToMarkdownSettings is not available.');
}

if (!globalThis.i18n) {
    throw new Error('i18nApi is not available.');
}

const t = globalThis.i18n.t;

const elements = {
    requestHeaderText: document.getElementById('request-header-text'),
    requestQuotePrefix: document.getElementById('request-quote-prefix'),
    responseHeaderText: document.getElementById('response-header-text'),
    saveSettings: document.getElementById('save-settings'),
    resetSettings: document.getElementById('reset-settings'),
    settingsStatus: document.getElementById('settings-status'),
    pageTitle: document.getElementById('page-title'),
    mainTitle: document.getElementById('main-title'),
    formatSettingsLabel: document.getElementById('format-settings-label'),
    markdownOutputTitle: document.getElementById('markdown-output-title'),
    markdownOutputDescription: document.getElementById('markdown-output-description'),
    requestHeaderLabel: document.getElementById('request-header-label'),
    requestHeaderDefault: document.getElementById('request-header-default'),
    requestQuotePrefixLabel: document.getElementById('request-quote-prefix-label'),
    requestQuotePrefixDefault: document.getElementById('request-quote-prefix-default'),
    responseHeaderLabel: document.getElementById('response-header-label'),
    responseHeaderDefault: document.getElementById('response-header-default')
};

function localizeOptionsPage() {
    document.documentElement.lang = t('locale_lang_tag', 'en');

    elements.pageTitle.textContent = t('options_page_title', 'Web to Markdown - Settings');
    elements.mainTitle.textContent = t('options_main_title', 'Web to Markdown');
    elements.formatSettingsLabel.textContent = t('options_formatting_settings', 'Formatting Settings');
    elements.markdownOutputTitle.textContent = t('options_markdown_output', 'Markdown Output');
    elements.markdownOutputDescription.textContent = t(
        'options_markdown_output_description',
        'Configure texts used when converting AI conversations to markdown.'
    );
    elements.requestHeaderLabel.textContent = t('options_request_header_text_label', 'Request Header Text');
    elements.requestHeaderDefault.textContent = t('options_request_header_default', 'Default:');
    elements.requestQuotePrefixLabel.textContent = t('options_request_quote_prefix_label', 'User Request Quote Prefix');
    elements.requestQuotePrefixDefault.textContent = t('options_request_quote_prefix_default', 'Default:');
    elements.responseHeaderLabel.textContent = t('options_response_header_text_label', 'AI Response Header Text');
    elements.responseHeaderDefault.textContent = t('options_response_header_default', 'Default:');
    elements.saveSettings.textContent = t('options_save_settings', 'Save Settings');
    elements.resetSettings.textContent = t('options_reset_to_default', 'Reset to Default');
}

function showStatus(message, type = 'success', duration = 3000) {
    const el = elements.settingsStatus;
    el.textContent = message;
    el.className = `status-message ${type}`;
    el.style.display = 'block';

    if (duration > 0) {
        setTimeout(() => {
            el.style.display = 'none';
        }, duration);
    }
}


function loadSettingsToForm() {
    settingsApi.loadSettings((settings, error) => {
        elements.requestHeaderText.value = settings.requestHeaderText;
        elements.requestQuotePrefix.value = settings.requestQuotePrefix;
        elements.responseHeaderText.value = settings.responseHeaderText;

        if (error) {
            showStatus(`${t('status_error_loading_settings', 'Error loading settings:')} ${error.message}`, 'error');
        }
    });
}

function saveSettings() {
    const settings = {
        requestHeaderText: elements.requestHeaderText.value,
        requestQuotePrefix: elements.requestQuotePrefix.value,
        responseHeaderText: elements.responseHeaderText.value
    };

    settingsApi.saveSettings(settings, (_savedSettings, error) => {
        if (error) {
            showStatus(`${t('status_error_saving_settings', 'Error saving settings:')} ${error.message}`, 'error');
            return;
        }

        showStatus(t('status_settings_saved_refresh', 'Settings saved. Refresh open tabs to apply changes.'), 'success');
    });
}

function resetSettings() {
    if (!confirm(t('confirm_reset_settings', 'Reset formatting settings to default values?'))) {
        return;
    }

    settingsApi.resetSettings((_defaults, error) => {
        if (error) {
            showStatus(`${t('status_error_resetting_settings', 'Error resetting settings:')} ${error.message}`, 'error');
            return;
        }

        loadSettingsToForm();
        showStatus(t('status_settings_reset_done', 'Settings reset to defaults.'), 'success');
    });
}

elements.saveSettings.addEventListener('click', saveSettings);
elements.resetSettings.addEventListener('click', resetSettings);

document.addEventListener('DOMContentLoaded', () => {
    localizeOptionsPage();
    loadSettingsToForm();
});
