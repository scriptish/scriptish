const NS_HTML = "http://www.w3.org/1999/xhtml";
const scriptDownloader = window.arguments[0];
const valueSplitter = /(\S+)\s+([^\r\f\n]+)/;

Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/logging.js");

lazyImport(this, "resource://scriptish/config.js", ["Scriptish_config"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/utils/Scriptish_localizeDOM.js", ["Scriptish_localizeOnLoad"]);
lazyUtil(this, "stringBundle");

Scriptish_localizeOnLoad(this);

function $(id) document.getElementById(id);
function $t(text) document.createTextNode(text);
function $nHTML(tag, text, attrs) {
  let rtnEle = document.createElementNS(NS_HTML, tag);
  if (text) rtnEle.appendChild($t(text));
  if (attrs) for (let a in attrs) rtnEle.setAttribute(a, attrs[a]);
  return rtnEle;
}
let on = addEventListener;

function setupIncludes(type, items) {
  if (!items.length) return;
  let [list, str] = [$nHTML("ul"), ""];
  for (let [, i] in Iterator(items)) {
    switch(type) {
    case "matches":
      i = i.pattern;
      break
    case "resources":
      i = i.match(valueSplitter)[2];
      break;
    }
    list.appendChild($nHTML("li", i));
  }
  $(type + "-desc").appendChild(list);
  $(type).setAttribute("class", "display");
  $(type + "-label").setAttribute("value", Scriptish_stringBundle("install." + type)); // l10n
}

function cleanup() scriptDownloader.cleanupTempFiles();
function delayedClose() timeout(close);


on("load", function() {
  let script = scriptDownloader.script;
  let headers = script.getScriptHeader();

  // setup lists
  ["domains", "matches", "includes", "excludes"].forEach(function(i) {
    setupIncludes(i, script[i]);
  });
  setupIncludes("requires", headers.require || []);
  setupIncludes("resources", headers.resource || []);

  // setup buttons
  let dialog = document.documentElement;
  dialog.getButton("accept").setAttribute("label",
      Scriptish_stringBundle(
      (Scriptish_config.installIsUpdate(scriptDownloader.script) ? "re" : "")
      + "install"));
  dialog.getButton("cancel").focus();

  // setup script info
  let icon = $("scriptIcon");
  if (script.icon.tempFile) {
    try {
      let src = NetUtil.newURI(script.icon.tempFile).spec;
      icon.onerror = function() { icon.src = script.iconURL };
      icon.src = src;
    } catch (e) {}
  }
  if (!icon.src) icon.src = script.iconURL;

  let title = (script.name || Scriptish_stringBundle("untitledScript"));
  if (script.version) {
    title += " " + script.version;
  }
  $("scriptTitle").textContent = title;
  $("scriptDescription").textContent = script.description;

  // setup action event listeners
  on("dialogaccept", function() {
    if (scriptDownloader.installScript())
      removeEventListener("unload", cleanup, false);
    delayedClose();
  }, false);
  on("dialogcancel", delayedClose, false);

  let showSource = $("showSource");
  showSource.addEventListener("click", function() {
    removeEventListener("unload", cleanup, false);
    scriptDownloader.showScriptView();
    delayedClose();
  }, false);
}, true);

on("unload", cleanup, false);
