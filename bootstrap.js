'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

const http_on_examine_response = 'http-on-examine-response';

const NS_PREFBRANCH_PREFCHANGE_TOPIC_ID = 'nsPref:changed';
const MY_PREF_BRANCH = 'extensions.bypass-forced-download.';
const MY_PREF_BLACKLIST = 'blacklist';

const Ci = Components.interfaces;

const me = {
    branch: null,

    blacklist_pattern: /^(?!)/,
    update_pattern: function () {
        const blacklist = this.branch.getCharPref(MY_PREF_BLACKLIST);
        const words = blacklist.match(/\S+/g) || [];
        const anychar = '\\w';
        const words_trans = words.map(
            function (s)
                s.replace(/([*?]+)|\W/g,
                    function (m0, m1)
                        m1 ? anychar + '{' + (m1.split('?').length - 1) + (m1.indexOf('*') >= 0 ? ',' : '') + '}' :
                        '\\' + m0
                )
        );
        const combined = (
            words_trans.length
                ? '(?:' + words_trans.join('|') + ')'
                : '(?!)'
        );
        this.blacklist_pattern = new RegExp('^' + combined + '$', 'i');
    },

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
                if (host && this.blacklist_pattern.test(host)) break;
                try {
                    const cd_old = chan.getResponseHeader('Content-Disposition');
                    const cd_new = cd_old.replace(/^\s*attachment(?![^\s;])/i, 'inline');
                    if (cd_old === cd_new) break;
                    chan.setResponseHeader('Content-Disposition', cd_new, /* merge: */ false);
                } catch (e) {
                }
                break;
            }

            case NS_PREFBRANCH_PREFCHANGE_TOPIC_ID:
                switch (data) {
                    case MY_PREF_BLACKLIST: {
                        this.update_pattern();
                        break;
                    }
                }
                break;
        }
    },
};

function startup(data, reason) {
    const default_prefs = Services.prefs.getDefaultBranch(MY_PREF_BRANCH);
    default_prefs.setCharPref(MY_PREF_BLACKLIST, 'cf-media.sndcdn.com download*.mediafire.com');

    me.branch = Services.prefs.getBranch(MY_PREF_BRANCH);
    me.branch.addObserver('', me, /* weak: */ false);
    me.update_pattern();

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
