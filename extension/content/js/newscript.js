Components.utils.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/utils/Scriptish_localizeDOM.js", ["Scriptish_localizeOnLoad"]);

lazyUtil(this, "createUserScriptSource");
lazyUtil(this, "getTempFile");
lazyUtil(this, "getWriteStream");
lazyUtil(this, "openInEditor");
lazyUtil(this, "stringBundle");

var $ = function(aID) document.getElementById(aID);
var $$ = function(q) document.querySelector(q);
var $$$ = function(q) document.querySelectorAll(q);

Scriptish_localizeOnLoad(this);

var scriptContent = "";
try {
  scriptContent = window.arguments[0]
      .QueryInterface(Components.interfaces.nsIDialogParamBlock)
      .GetString(0);
} catch(e) {}

addEventListener("DOMContentLoaded", function init() {
  removeEventListener("DOMContentLoaded", init, false);

  // remove focus from the first textbox
  $("scriptish").focus();

  $("scriptish").addEventListener("dialogaccept", function(evt) {
    try {
      if (doInstall()) {
        return true;
      }
    } catch (e) {}

    evt.preventDefault();
    evt.stopProgapation();
    return false;
  }, false);

  // load defaults
  $("id").value = Scriptish_prefRoot.getValue("newscript_id", "");
  $("namespace").value = Scriptish_prefRoot.getValue("newscript_namespace", "");
  $("author").value = Scriptish_prefRoot.getValue("newscript_author", "");

  (function considerLocation() {
    if (!window.opener.gBrowser) {
      return;
    }
    let contentLocation = window.opener.gBrowser.selectedBrowser.contentWindow.location;
    $("includes").value = contentLocation.href + "\n";
    if (!contentLocation.host) {
      return;
    }
    let host = contentLocation.host;

    let generateIdButton = $('generate-id');
    generateIdButton.hidden = false;
    generateIdButton.addEventListener("command", function generateId() {
      let gid = contentLocation.host;
      gid += "-" + Services.uuid.generateUUID().toString().slice(1, -1);
      gid += "@" + ($("namespace").value || "scriptish").replace(/^@/, "");
      $("id").value = gid;
    }, false);

  })();
}, false);

function doInstall() {
  // validate some
  var ok = Array.reduce($$$("*[required]"), function(p,v) {
    var vok = !!v.value;
    v.setAttribute("invalid", !vok);
    return p & vok;
  }, true);

  if (!ok) {
    return false;
  }

  var script = createScriptSource();
  if (!script) return false;

  // put this created script into a file -- only way to install it
  var tempFile = Scriptish_getTempFile();
  var foStream = Scriptish_getWriteStream(tempFile);
  foStream.write(script, script.length);
  foStream.close();

  Scriptish.getConfig(function(config) {
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
    Scriptish_openInEditor(script, window);

    // persist values
    Scriptish_prefRoot.setValue("newscript_namespace", script.namespace);
    Scriptish_prefRoot.setValue("newscript_author", script.author);
  })

  return true;
}

// assemble the XUL fields into a script template
function createScriptSource() {
  var header = {
    id: $("id").value,
    name: $("name").value,
    version: $("version").value,
    namespace: $("namespace").value,
    author: $("author").value,
    description: $("description").value,
    include: $("includes").value ? $("includes").value.match(/.+/g) : [],
    exclude: $("excludes").value ? $("excludes").value.match(/.+/g) : [],
    "run-at": $("run-at").value
  }
  try {
    return Scriptish_createUserScriptSource(header, scriptContent);
  } catch (e) {
    alert(e.message);
  }
}
