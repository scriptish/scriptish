"use strict";
const EXPORTED_SYMBOLS = ["GM_sandboxScripts"];

if (!('XMLHttpRequest' in this)) {
  this.XMLHttpRequest = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest");
}

let r = new XMLHttpRequest();
// don't try to parse as XML
r.overrideMimeType('text/javascript');
r.open('GET', 'resource://scriptish/api/sandbox.js', false);
r.send(null);

const GM_sandboxScripts = r.responseText;
