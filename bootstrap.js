'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

const http_on_examine_response = 'http-on-examine-response';

const NS_PREFBRANCH_PREFCHANGE_TOPIC_ID = 'nsPref:changed';
const MY_PREF_BRANCH = 'extensions.bypass-forced-download.';
const MY_PREF_BLACKLIST = 'blacklist';
const MY_PREF_WHITELIST = 'whitelist';

const Ci = Components.interfaces;

const me = {
    branch: null,

    regex_of_pref: function (pref) {
        const value = this.branch.getCharPref(pref);
        const words = value.match(/\S+/g) || [];
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
        const combined = (
            words_trans.length
                ? '(?:' + words_trans.join('|') + ')'
                : '(?!)'
        );
        return new RegExp('^' + combined + '$', 'i');
    },

    blacklist_pattern: /^(?!)/,
    whitelist_pattern: /^(?!)/,

    observe: function (subject, topic, data) {
        switch (topic) {
            case http_on_examine_response: {
                const chan = subject.QueryInterface(Ci.nsIHttpChannel);
                const host = function () {
                    try {
                        return chan.URI.asciiHost;
                    } catch (e) {
                    }
                }();
                if (host && (!this.whitelist_pattern.test(host) || this.blacklist_pattern.test(host))) {
                    break;
                }
                try {
                    const cd_old = chan.getResponseHeader('Content-Disposition');
                    const cd_new = cd_old.replace(/^\s*attachment(?![^\s;])/i, 'inline');
                    if (cd_old === cd_new) break;
                    chan.setResponseHeader('Content-Disposition', cd_new, /* merge: */ false);
                } catch (e) {
                }
                break;
            }

            case NS_PREFBRANCH_PREFCHANGE_TOPIC_ID: {
                switch (data) {
                    case MY_PREF_BLACKLIST: this.blacklist_pattern = this.regex_of_pref(data); break;
                    case MY_PREF_WHITELIST: this.whitelist_pattern = this.regex_of_pref(data); break;
                }
                break;
            }
        }
    },
};

function startup(data, reason) {
    const default_prefs = Services.prefs.getDefaultBranch(MY_PREF_BRANCH);
    default_prefs.setCharPref(MY_PREF_WHITELIST, '**');
    default_prefs.setCharPref(MY_PREF_BLACKLIST, 'cf-media.sndcdn.com download*.mediafire.com');

    me.branch = Services.prefs.getBranch(MY_PREF_BRANCH);
    me.branch.addObserver('', me, /* weak: */ false);
    me.whitelist_pattern = me.regex_of_pref(MY_PREF_WHITELIST);
    me.blacklist_pattern = me.regex_of_pref(MY_PREF_BLACKLIST);

    Services.obs.addObserver(me, http_on_examine_response, /* weak: */ false);
}

function shutdown(data, reason) {
    Services.obs.removeObserver(me, http_on_examine_response);

    me.branch.removeObserver('', me);
}

function install(data, reason) {
}

function uninstall(data, reason) {
    if (reason === ADDON_UNINSTALL) {
        Services.prefs.deleteBranch(MY_PREF_BRANCH);
    }
}
