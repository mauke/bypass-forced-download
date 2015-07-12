'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');
//Components.utils.import('resource://gre/modules/devtools/Console.jsm');

const http_on_examine_response = 'http-on-examine-response';

const NS_PREFBRANCH_PREFCHANGE_TOPIC_ID = 'nsPref:changed';
const MY_PREF_BRANCH = 'extensions.bypass-forced-download.';
const MY_PREF_BLACKLIST = 'blacklist';

const Ci = Components.interfaces;

const me = {
    branch: null,

    blacklist_pattern: /^(?!)/,
    update_pattern: function () {
        let blacklist = this.branch.getCharPref(MY_PREF_BLACKLIST);
        let words = blacklist.match(/\S+/g) || [];
        let anychar = '\\w';
        let words_trans = words.map(
            function (s)
                s.replace(/([*?]+)|\W/g,
                    function (m0, m1)
                        m1 ? anychar + '{' + (m1.split('?').length - 1) + (m1.indexOf('*') >= 0 ? ',' : '') + '}' :
                        '\\' + m0
                )
        );
        let combined = (
            words_trans.length
                ? '(?:' + words_trans.join('|') + ')'
                : '(?!)'
        );
        this.blacklist_pattern = new RegExp('^' + combined + '$', 'i');
    },

    observe: function (subject, topic, data) {
        switch (topic) {
            case http_on_examine_response: {
                let chan = subject.QueryInterface(Ci.nsIHttpChannel);
                let host;
                try {
                    host = chan.URI.asciiHost;
                } catch (e) {
                }
                if (host && this.blacklist_pattern.test(host)) break;
                try {
                    let cd_old = chan.getResponseHeader('Content-Disposition');
                    let cd_new = cd_old.replace(/^\s*attachment(?![^\s;])/i, 'inline');
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
    let default_prefs = Services.prefs.getDefaultBranch(MY_PREF_BRANCH);
    default_prefs.setCharPref(MY_PREF_BLACKLIST, '');

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
