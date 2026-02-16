// es module - options page

const settingsApi = globalThis.WebToMarkdownSettings;

if (!settingsApi) {
    throw new Error('WebToMarkdownSettings is not available.');
}

const elements = {
    requestHeaderText: document.getElementById('request-header-text'),
    requestQuotePrefix: document.getElementById('request-quote-prefix'),
    responseHeaderText: document.getElementById('response-header-text'),
    saveSettings: document.getElementById('save-settings'),
    resetSettings: document.getElementById('reset-settings'),
    settingsStatus: document.getElementById('settings-status')
};

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
            showStatus('Error loading settings: ' + error.message, 'error');
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
            showStatus('Error saving settings: ' + error.message, 'error');
            return;
        }

        showStatus('Settings saved. Refresh open tabs to apply changes.', 'success');
    });
}

function resetSettings() {
    if (!confirm('Reset formatting settings to default values?')) {
        return;
    }

    settingsApi.resetSettings((_defaults, error) => {
        if (error) {
            showStatus('Error resetting settings: ' + error.message, 'error');
            return;
        }

        loadSettingsToForm();
        showStatus('Settings reset to defaults.', 'success');
    });
}

elements.saveSettings.addEventListener('click', saveSettings);
elements.resetSettings.addEventListener('click', resetSettings);

document.addEventListener('DOMContentLoaded', () => {
    loadSettingsToForm();
});
