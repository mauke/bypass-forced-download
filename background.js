'use strict';

const SETTINGS_KEY_BLACKLIST = 'blacklist';
const SETTINGS_KEY_WHITELIST = 'whitelist';
const FAIL_RE = /^(?!)/;

let Current_blacklist_re = FAIL_RE,
    Current_whitelist_re = FAIL_RE;

function regex_from_hostname_globs(pat_str) {
    const words = pat_str.match(/\S+/g) || [];
    if (words.length === 0) return FAIL_RE;
    const anychar     = '[\\w\\-]';
    const anychar_all = '[\\w\\-.]';
    const words_trans = words.map(
        s => s.replace(
            /((?:\*\*)+)|([*?](?:\?|\*(?!\*))*)|\W/g,
            (m0, m1, m2) =>
                m1 ? anychar_all + '*' :
                m2 ? anychar + '{' + (m2.split('?').length - 1) + (m2.indexOf('*') >= 0 ? ',' : '') + '}' :
                '\\' + m0
        )
    );
    return new RegExp('^(?:' + words_trans.join('|') + ')$', 'i');
}

function update_content_type_regex(value) {
    const patterns = (value || '').match(/\S+/g);
    Current_content_type_re = regex_from_content_type_globs(patterns);
}

browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[SETTINGS_KEY_BLACKLIST]) {
        Current_blacklist_re = regex_from_hostname_globs(changes[SETTINGS_KEY_BLACKLIST].newValue);
    }
    if (changes[SETTINGS_KEY_WHITELIST]) {
        Current_whitelist_re = regex_from_hostname_globs(changes[SETTINGS_KEY_WHITELIST].newValue);
    }
});

browser.webRequest.onHeadersReceived.addListener(
    (details) => {
        const url = new URL(details.url);
        const hostname = url.hostname;
        if (!Current_whitelist_re.test(hostname) || Current_blacklist_re.test(hostname)) {
            return {};
        }
        const headers = details.responseHeaders;
        for (const header of headers) {
            if (header.name.toLowerCase() === 'content-disposition') {
                const old_value = header.value;
                if (old_value) {
                    const new_value = old_value.replace(/^\s*attachment(?![^\s;])/i, 'inline');
                    if (new_value !== old_value) {
                        header.value = new_value;
                        return { responseHeaders: headers };
                    }
                }
                break;
            }
        }
        return {};
    },
    {
        urls:  ['*://*/*'],
        types: ['main_frame', 'sub_frame']
    },
    ['blocking', 'responseHeaders']
);

function log_error(e) {
    console.log('Error: ' + e);
}

browser.storage.local.get([SETTINGS_KEY_BLACKLIST, SETTINGS_KEY_WHITELIST]).then(
    (result) => {
        let update = {};
        if (result[SETTINGS_KEY_BLACKLIST]) {
            Current_blacklist_re = regex_from_hostname_globs(result[SETTINGS_KEY_BLACKLIST]);
        } else {
            update[SETTINGS_KEY_BLACKLIST] = 'cf-media.sndcdn.com download*.mediafire.com' ;
        }
        if (result[SETTINGS_KEY_WHITELIST]) {
            Current_whitelist_re = regex_from_hostname_globs(result[SETTINGS_KEY_WHITELIST]);
        } else {
            update[SETTINGS_KEY_WHITELIST] = '**';
        }
        if (Object.keys(update).length) {
            browser.storage.local.set(update).catch(log_error);
        }
    },
    log_error
);
