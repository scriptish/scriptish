'use strict';

const { Ci, Cu } = require('chrome');
const events = require('sdk/system/events');

const { NetUtil } = Cu.import('resource://gre/modules/NetUtil.jsm', {});

function applyRedirect({ subject }) {
  const channel = subject.QueryInterface(Ci.nsIHttpChannel);
  const { URI } = channel;

  if (URI.host == 'userscripts.org' && URI.scheme == 'http') {
    let to = NetUtil.newURI(URI.spec);
    to.scheme = 'https';

    channel.redirectTo(to);
  }
}
events.on('http-on-modify-request', applyRedirect);
