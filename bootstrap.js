'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

const http_on_examine_response = 'http-on-examine-response';

const Ci = Components.interfaces;

const observer = {
    observe: function (subject, topic, data) {
        switch (topic) {
            case http_on_examine_response: {
                let chan = subject.QueryInterface(Ci.nsIHttpChannel);
                try {
                    let cd_old = chan.getResponseHeader('Content-Disposition');
                    let cd_new = cd_old.replace(/^\s*attachment(?![^\s;])/i, 'inline');
                    if (cd_old === cd_new) break;
                    chan.setResponseHeader('Content-Disposition', cd_new, /* merge: */ false);
                } catch (e) {
                }
                break;
            }
        }
    },
};

function startup(data, reason) {
    Services.obs.addObserver(observer, http_on_examine_response, /* weak: */ false);
}

function shutdown(data, reason) {
    Services.obs.removeObserver(observer, http_on_examine_response);
}

function install(data, reason) {
}

function uninstall(data, reason) {
}
