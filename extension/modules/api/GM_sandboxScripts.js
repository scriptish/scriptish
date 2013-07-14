"use strict";
const EXPORTED_SYMBOLS = ["GM_updatingEnabled", "GM_addStyle", "GM_xpath"];

if (!('XMLHttpRequest' in this))
  this.XMLHttpRequest = Components.Constructor(
      "@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");

const GM_updatingEnabled = (function(r) {
  r.overrideMimeType('text/javascript'); // don't try to parse as XML
  r.open('GET', 'resource://scriptish/api/sandbox/GM_updatingEnabled.js', false);
  r.send(null);
  return r.responseText;
})(new XMLHttpRequest());

const GM_xpath = (function(r) {
  r.overrideMimeType('text/javascript'); // don't try to parse as XML
  r.open('GET', 'resource://scriptish/api/sandbox/GM_xpath.js', false);
  r.send(null);
  return r.responseText;
})(new XMLHttpRequest());
