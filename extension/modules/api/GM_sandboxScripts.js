"use strict";
const EXPORTED_SYMBOLS = ["GM_sandboxScripts"];

if (!('XMLHttpRequest' in this))
  this.XMLHttpRequest = Components.Constructor(
      "@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");

const GM_sandboxScripts = (function(r) {
  r.overrideMimeType('text/javascript'); // don't try to parse as XML
  r.open('GET', 'resource://scriptish/api/sandbox.js', false);
  r.send(null);
  return r.responseText;
})(new XMLHttpRequest());
