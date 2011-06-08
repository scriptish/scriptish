"use strict";

Components.utils.import("resource://scriptish/scriptish.js");
Components.utils.import("resource://scriptish/logging.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

function $(aID) document.getElementById(aID);

function changeEditor() {
  var tools = {};
  Components.utils.import("resource://scriptish/utils/Scriptish_getEditor.js", tools);
  tools.Scriptish_getEditor(window, true);
}

function saveExcludes() {
  Scriptish.getConfig(function(config) (
    config.excludes = $("excludes").value.match(/.+/g)));
  Scriptish.notify(null, "scriptish-preferences-change", true);
}

/*
 * Localize XUL elements (as defined by localize-attributes) from a stringbundle
 * @author Nils Maier
 */
addEventListener("DOMContentLoaded", function localize() {
  removeEventListener("DOMContentLoaded", localize, false);

  let nodes = document.querySelectorAll("*[localize]");
  for (let i = 0, e = nodes.length, n; i < e; ++i) {
    n = nodes[i];
    let localized = n.getAttribute("localize").split(",");
    for each (let l in localized) {
      try {
        let s = Scriptish_stringBundle(n.getAttribute(l));
        n.setAttribute(l, s);

        // also localize panes
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
}, false);

addEventListener("load", function init() {
  removeEventListener("load", init, false);

  let instantApply = $('pref-editor').instantApply;

  // init custom excludes preferences
  let excludes = $("excludes");
  Scriptish.getConfig(function(config) (
    excludes.value = config.excludes.join("\n")));
  if (instantApply) {
    excludes.addEventListener("input", saveExcludes, false);
  }
  else {
    addEventListener("dialogaccept", saveExcludes, true);
  }
}, false);
