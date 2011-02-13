const NS_HTML = "http://www.w3.org/1999/xhtml";
const scriptDownloader = window.arguments[0];
const valueSplitter = /(\S+)\s+([^\r\f\n]+)/;

Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/logging.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

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
  let [box, desc, list, str] = [$(type), $(type + "-desc"), $nHTML("ul"), ""];
  for (let [, i] in Iterator(items)) {
    switch(type) {
    case "matches":
      str = i.pattern;
      break
    case "resources":
      str = i.match(valueSplitter)[2];
      break;
    default:
      str = i;
    }
    list.appendChild($nHTML("li", str));
  }
  desc.appendChild(list);
  box.setAttribute("class", "display");
}

function cleanup() scriptDownloader.cleanupTempFiles();
function delayedClose() setTimeout(close, 0);


/* Main */
document.title = Scriptish_stringBundle("install.title");


on("load", function() {
  let script = scriptDownloader.script;
  let headers = script.getScriptHeader();

  // setup lists
  setupIncludes("matches", script.matches);
  setupIncludes("includes", script.includes);
  setupIncludes("excludes", script.excludes);
  setupIncludes("requires", headers.require || []);
  setupIncludes("resources", headers.resource || []);

  // setup buttons
  let dialog = document.documentElement;
  dialog.getButton("accept").setAttribute("label",
      Scriptish_stringBundle("install.installButton"));
  dialog.getButton("cancel").focus();

  // setup other l10n
  $("matches-label").setAttribute("value",
      Scriptish_stringBundle("install.matches"));
  $("includes-label").setAttribute("value",
      Scriptish_stringBundle("install.runsOn"));
  $("excludes-label").setAttribute("value",
      Scriptish_stringBundle("install.butNotOn"));
  $("requires-label").setAttribute("value",
      Scriptish_stringBundle("install.requires"));
  $("resources-label").setAttribute("value",
      Scriptish_stringBundle("install.resources"));
  $("warning1").appendChild($t(Scriptish_stringBundle("install.warning1")));
  $("warning2").appendChild($t(Scriptish_stringBundle("install.warning2")));

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

  let desc = $("scriptDescription");
  desc.appendChild($nHTML("strong", script.name + " " + script.version));
  desc.appendChild($nHTML("br"));
  desc.appendChild($t(script.description));

  // setup action event listeners
  on("dialogaccept", function() {
    if (scriptDownloader.installScript())
      removeEventListener("unload", cleanup, false);
    delayedClose();
  }, false);
  on("dialogcancel", delayedClose, false);

  let showSource = $("showSource");
  showSource.setAttribute("value",
      Scriptish_stringBundle("install.showScriptSource"));
  showSource.addEventListener("click", function() {
    removeEventListener("unload", cleanup, false);
    scriptDownloader.showScriptView();
    delayedClose();
  }, false);
}, true);

on("unload", cleanup, false);
