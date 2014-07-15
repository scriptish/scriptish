"use strict";
const EXPORTED_SYMBOLS = ["GM_SandboxScripts"];

if (!('XMLHttpRequest' in this)) {
  this.XMLHttpRequest = Components.Constructor(
      "@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");
}

const GM_SandboxScripts = (function(r) {
  r = new XMLHttpRequest();
  r.overrideMimeType('text/javascript'); // don't try to parse as XML
  r.open('GET', 'resource://scriptish/api/sandboxScripts.js', false);
  r.send(null);
  return r.responseText;
})();
