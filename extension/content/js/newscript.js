Components.utils.import("resource://scriptish/prefmanager.js");
Components.utils.import("resource://scriptish/utils/Scriptish_config.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

var $ = function(aID) document.getElementById(aID);

window.addEventListener("load", function() {
  $("scriptish").setAttribute("title", Scriptish_stringBundle("menu.new"));
  $("label-name").setAttribute("value", Scriptish_stringBundle("newscript.name"));
  $("label-namespace").setAttribute("value", Scriptish_stringBundle("newscript.namespace"));
  $("label-description").setAttribute("value", Scriptish_stringBundle("newscript.description"));
  $("label-includes").setAttribute("value", Scriptish_stringBundle("newscript.includes"));
  $("label-excludes").setAttribute("value", Scriptish_stringBundle("newscript.excludes"));
  $("label-includes").setAttribute("value", Scriptish_stringBundle("newscript.includes"));

  // load default namespace from pref
  $("namespace").value = Scriptish_prefRoot.getValue("newscript_namespace", "");

  // default the includes with the current page's url
  var content = window.opener.document.getElementById("content");
  if (content)
    $("includes").value = content.selectedBrowser.contentWindow.location.href;
}, false);

function doInstall() {
  var tools = {};
  Components.utils.import("resource://scriptish/utils/Scriptish_openInEditor.js", tools);
  Components.utils.import("resource://scriptish/utils/Scriptish_getTempFile.js", tools);
  Components.utils.import("resource://scriptish/utils/Scriptish_getWriteStream.js", tools);

  var script = createScriptSource();
  if (!script) return false;

  // put this created script into a file -- only way to install it
  var tempFile = tools.Scriptish_getTempFile();
  var foStream = tools.Scriptish_getWriteStream(tempFile);
  foStream.write(script, script.length);
  foStream.close();

  var config = Scriptish_config;

  // create a script object with parsed metadata,
  script = config.parse(script);

  // make sure entered details will not ruin an existing file
  if (config.installIsUpdate(script)) {
    var overwrite = confirm(Scriptish_stringBundle("newscript.exists"));
    if (!overwrite) return false;
  }

  // finish making the script object ready to install
  script.setDownloadedFile(tempFile);

  // install this script
  config.install(script);

  // and fire up the editor!
  tools.Scriptish_openInEditor(script, window);

  // persist namespace value
  Scriptish_prefRoot.setValue("newscript_namespace", script.namespace);

  return true;
}

// assemble the XUL fields into a script template
function createScriptSource() {
  var script = ["// ==UserScript=="];

  var tmp = $("name").value;
  if ("" == tmp) {
    alert(Scriptish_stringBundle("newscript.noname"));
    return false;
  } else {
    script.push("// @name           " + tmp);
  }

  tmp = $("namespace").value;
  if ("" == tmp) {
    alert(Scriptish_stringBundle("newscript.nonamespace"));
    return false;
  } else {
    script.push("// @namespace      " + tmp);
  }

  tmp = $("descr").value;
  if ("" != tmp) {
    script.push("// @description    " + tmp);
  }

  tmp = $("includes").value;
  if ("" != tmp) {
    tmp = "// @include        " + tmp.match(/.+/g).join("\n// @include        ");
    script.push(tmp);
  }

  tmp = $("excludes").value;
  if ("" != tmp) {
    tmp = "// @exclude        " + tmp.match(/.+/g).join("\n// @exclude        ");
    script.push(tmp);
  }

  script.push("// ==/UserScript==");

  var ending = "\n";
  // TODO: improve
  if (window.navigator.platform.match(/^Win/)) ending = "\r\n";
  return script.join(ending);
}
