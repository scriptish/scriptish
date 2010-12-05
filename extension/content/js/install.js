const NS_HTML = "http://www.w3.org/1999/xhtml";

Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

function $(id) document.getElementById(id);
function $t(text) document.createTextNode(text);
function $nNS(ns, tag, text, attrs) {
  let rv = document.createElementNS(ns, tag);
  if (!!text)
    rv.appendChild($t(text));
  attrs = attrs || {};
  for (let a in attrs)
    rv.setAttribute(a, attrs[a]);
  return rv;
}
function $nHTML(tag, text, attrs) $nNS(NS_HTML, tag, text, attrs);

function setupIncludes(type, items) {
  if (!items.length)
    return;

  let [box, desc] = [$(type), $(type + '-desc')];
  let list = $nHTML('ol');
  if (type == 'match')
    items = items.map(function(e) e.pattern);
  items.forEach(function(i) list.appendChild($nHTML('li', i)));
  desc.appendChild(list);
  box.setAttribute("class", "display");
}

function cleanup() Scriptish_Install.scriptDownloader_.cleanupTempFiles();
function delayedClose() setTimeout(function() close(), 0);


/* Main */

const scriptDownloader = window.arguments[0];
document.title = Scriptish_stringBundle("install.title");


addEventListener("load", function() { try  { (function() {
  //removeEventListener("load", arguments.callee, true);

  let script = scriptDownloader.script;

  // setup lists
  setupIncludes("matches", script.matches);
  setupIncludes("includes", script.includes);
  setupIncludes("excludes", script.excludes);

  // setup buttons
  let dialog = document.documentElement;
  let [extraButton, acceptButton] = ["extra1", "accept"]
    .map(function(e) dialog.getButton(e));
  extraButton.setAttribute("type", "checkbox");
  extraButton.setAttribute("label",
                           Scriptish_stringBundle("install.showscriptsource"));
  acceptButton.setAttribute("label",
                            Scriptish_stringBundle("install.installbutton"));

  // setup other l10n
  $("matches-label").setAttribute("value", Scriptish_stringBundle("install.matches"));
  $("includes-label").setAttribute("value", Scriptish_stringBundle("install.runson"));
  $("excludes-label").setAttribute("value", Scriptish_stringBundle("install.butnoton"));
  $("warning1").appendChild($t(Scriptish_stringBundle("install.warning1")));
  $("warning2").appendChild($t(Scriptish_stringBundle("install.warning2")));

  // setup script info
  let icon = $('scriptIcon');
  try {
    icon.onerror = function() {
      // XXX: right now doesn't get called because of a bad dependency
      // with ScriptDependency
      icon.src = script.iconURL;
    };
    // at this point we should have a temp file if
    // a) the script has an icon assigned
    // b) the icon points to a valid location
    if (script.icon.tempFile) {
      icon.src = NetUtil.newURI(script.icon.tempFile).spec;
    }
    else {
      throw new Error("no temp file");
    }
  }
  catch (ex) {
    Components.utils.reportError(ex);
    icon.src = script.iconURL;
  }

  let desc = $("scriptDescription");
  desc.appendChild($nHTML("strong", script.name + " " + script.version));
  desc.appendChild($nHTML("br"));
  desc.appendChild($t(script.description));

  // setup button event listeners
  addEventListener('dialogaccept', function() {
    if (scriptDownloader.installScript())
      removeEventListener("unload", cleanup, false);
    delayedClose();
  }, false);
  addEventListener('dialogcancel', delayedClose, false);
  addEventListener('dialogextra1', function() {
    removeEventListener("unload", cleanup, false);
    scriptDownloader.showScriptView();
    delayedClose();
  }, false);

})() } catch(ex) { Components.utils.reportError(ex); throw ex; }}, true); // addEventListener(load)

addEventListener("unload", cleanup, false);
