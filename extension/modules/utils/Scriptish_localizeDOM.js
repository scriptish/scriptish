"use strict";

const EXPORTED_SYMBOLS = ["Scriptish_localizeSubtree", "Scriptish_localizeOnLoad"];

Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyUtil(this, "stringBundle");

function Scriptish_localizeOnLoad(window) {
  window.addEventListener("DOMContentLoaded", function localize() {
    window.removeEventListener("DOMContentLoaded", localize, false);

    Scriptish_localizeSubtree(window.document);
  }, false);
}

function Scriptish_localizeSubtree(aNode) {
  let document = aNode.ownerDocument || aNode;
  let nodes = aNode.querySelectorAll("*[localize]");

  for (let i = 0, e = nodes.length, n; i < e; ++i) {
    n = nodes[i];
    let localized = n.getAttribute("localize").split(",");
    for each (let l in localized) {
      try {
        if (l == "#text") {
          let s = Scriptish_stringBundle(n.textContent);
          n.textContent = s;
        }
        else {
          let s = Scriptish_stringBundle(n.getAttribute(l));
          n.setAttribute(l, s);
        }

        // also localize pref-panes
        if (/^pane-/.test(n.id)) {
          n = document.documentElement._selector.querySelector("*[pane=\"" + n.id + "\"]");
          if (n) {
            n.setAttribute(l, s);
          }
        }
      }
      catch (ex) {
        Scriptish_log("Failed to set localized attribute; l=" + l);
      }
    }
  }

}
