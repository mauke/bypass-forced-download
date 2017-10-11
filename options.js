'use strict';
const SETTINGS_KEY_BLACKLIST = 'blacklist';
const SETTINGS_KEY_WHITELIST = 'whitelist';
const blacklist_field = document.getElementById('blacklist');
const whitelist_field = document.getElementById('whitelist');

function log_error(e) {
    console.log('Error: ' + e);
}

function update_form(bl, wl) {
    content_types_field.value = value;
}

document.getElementById('options').addEventListener('submit', (e) => {
    e.preventDefault();
    browser.storage.local.set({
        [SETTINGS_KEY_BLACKLIST]: blacklist_field.value,
        [SETTINGS_KEY_WHITELIST]: whitelist_field.value,
    }).catch(log_error);
});

browser.storage.local.get([SETTINGS_KEY_BLACKLIST, SETTINGS_KEY_WHITELIST]).then(
    (result) => {
        blacklist_field.value = result[SETTINGS_KEY_BLACKLIST] || '';
        blacklist_field.disabled = false;
        whitelist_field.value = result[SETTINGS_KEY_WHITELIST] || '';
        whitelist_field.disabled = false;
        document.getElementById('save').disabled = false;
    },
    log_error
);
