(function($, tools) {
Components.utils.import("resource://scriptish/addonprovider.js");
Components.utils.import("resource://scriptish/constants.js", tools);
const {lazyImport, lazyUtil} = tools;

lazyImport(window, "resource://scriptish/config.js", ["Scriptish_config"]);
lazyImport(window, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(window, "resource://scriptish/third-party/Scriptish_openFolder.js", ["Scriptish_openFolder"]);

lazyUtil(window, "ExtendedStringBundle");
lazyUtil(window, "installUri");
lazyUtil(window, "openInEditor");
lazyUtil(window, "stringBundle");

const RE_USERSCRIPT = /^.*\.user(?:-\d+)?\.js$/i;

var Scriptish_bundle = new Scriptish_ExtendedStringBundle(gStrings.ext);
Scriptish_bundle.strings["header-userscript"] = Scriptish_stringBundle("userscripts");
gStrings.ext = Scriptish_bundle;

let NetUtil = tools.NetUtil;
let Services = tools.Services;

window.addEventListener("load", function() {
  function addonIsInstalledScript(aAddon) {
    if (!aAddon || "userscript" != aAddon.type || aAddon.needsUninstall)
      return false;
    return true;
  }

  var oldDD = gDragDrop.onDrop;
  gDragDrop.onDrop = function(aEvt) {
    var dt = aEvt.dataTransfer;
    var uris = [];

    function handleStrType(type, i) {
      let url = dt.mozGetDataAt(type, i);
      if (url) {
        url = url.trim().match(/$[^\n\r\t]*/)[0];
        if (!RE_USERSCRIPT.test(url)) return false;
        uris.push(Services.io.newURI(url));
        removeType(type, i);
        return true;
      }
      return false;
    }
    function removeType(type, i) {
      dt.mozClearDataAt(type, i);
    }

    for (var i = dt.mozItemCount - 1; ~i; i--) {
      if (handleStrType("text/uri-list", i)) continue;
      if (handleStrType("text/x-moz-url", i)) continue;

      let file = dt.mozGetDataAt("application/x-moz-file", i);
      if (file) {
        let uri = Services.io.newFileURI(file);
        if (!RE_USERSCRIPT.test(uri.spec)) return;
        uris.push(uri);
        removeType("application/x-moz-file", i);
        continue;
      }
    }

    uris.forEach(function(uri) {
      Scriptish_installUri(uri);
    });

    oldDD(aEvt)
  }

  gViewController.commands.cmd_scriptish_installFromFile = {
    isEnabled: function() {
      return true;
    },
    doCommand: function() {
      var nsIFilePicker = Ci.nsIFilePicker;
      var fp = tools.Instances.fp;
      fp.init(
          window,
          Scriptish_stringBundle("installFromFile"),
          nsIFilePicker.modeOpen);
      fp.appendFilter(Scriptish_stringBundle("userscript"), "*.js");
      fp.appendFilters(nsIFilePicker.filterAll);

      if (fp.show() != nsIFilePicker.returnOK || !fp.file.exists())
        return;

      Scriptish_installUri(tools.Services.io.newFileURI(fp.file));
    }
  };
  gViewController.commands.cmd_scriptish_userscript_edit = {
    isEnabled: addonIsInstalledScript,
    doCommand: function(aAddon) { Scriptish_openInEditor(aAddon, window); }
  };
  gViewController.commands.cmd_scriptish_userscript_show = {
    isEnabled: addonIsInstalledScript,
    doCommand: function(aAddon) Scriptish_openFolder(aAddon._file)
  };
  gViewController.commands.cmd_scriptish_userscript_dl_link = {
    isEnabled: function(aAddon) {
      if (!(addonIsInstalledScript(aAddon)
              && Scriptish_prefRoot.getValue("enableCopyDownloadURL")
              && aAddon.urlToDownload))
        return false;
      try {NetUtil.newURI(aAddon.urlToDownload)} catch (e) {return false;}
      return true;
    },
    doCommand: function(aAddon) Services.cb.copyString(aAddon.urlToDownload)
  };

  function hideUSMenuitem(aEvt) {
    aEvt.target.setAttribute("disabled",
        !("addons://list/userscript" == gViewController.currentViewId));
  }

  (function() {
    let items = {'edit': 'edit',
                 'show': 'openFolder',
                 'dl_link': 'copyDownloadURL'};
    for (let key in items) {
      let string = items[key];
      $("br_scriptish_userscript_" + key).setAttribute("label", Scriptish_stringBundle(string));
      let cmd = $("cmd_scriptish_userscript_" + key);
      cmd.setAttribute("accesskey", Scriptish_stringBundle(string + ".ak"));
      cmd.addEventListener("popupshowing", hideUSMenuitem, false);
    }
  })();

  $("scriptish-get-scripts-btn").addEventListener("command", function() {
    var gBrowser = Services.wm.getMostRecentWindow("navigator:browser").gBrowser;
    gBrowser.selectedTab = gBrowser.addTab("http://userscripts.org");
  }, false);

  $("scriptish-list-empty-label").setAttribute(
      "value", Scriptish_stringBundle("userscripts.noneInstalled"));
  $("scriptish-get-scripts-btn").setAttribute(
      "label", Scriptish_stringBundle("userscripts.get"));
  $("scriptish-detail-contrib-description").textContent =
      Scriptish_stringBundle("contributions.description");

  // localize install us from file menuitem
  let (mi = $("scriptish-installFromFile")) {
    mi.setAttribute("label", Scriptish_stringBundle("installFromFile"));
    mi.setAttribute("accesskey", Scriptish_stringBundle("installFromFile.ak"));
  }

  function onViewChanged() {
    let de = document.documentElement;
    let view = /^addons:\/\/([^/]+)(?:\/([^/]+)?)?$/.exec(gViewController.currentViewId);

    function reset() {
      de.classList.remove("scriptish");
      $("scriptish-list-empty").style.display = "none";
    }

    // something strange happened if `null`
    if (view == null) return reset();

    switch (view[1]) {
      case "list":
        if (view[2] != "userscript") return reset();
        de.classList.add("scriptish");
        if (!Scriptish_config.scripts.length)
          $("scriptish-list-empty").style.display = "-moz-box";
        break;
      case "detail":
        let script = Scriptish_config.getScriptById(decodeURIComponent(view[2]));
        if (script == null || !script.contributionURL) return reset();
        de.classList.add("scriptish");
        break;
      default:
        reset();
    }
  }
  window.addEventListener("ViewChanged", onViewChanged, false);
  onViewChanged(); // initialize on load as well as when it changes later

  var needToRemoveObserver = true;
  var installObserver = {
    observe: function(aSubject, aTopic, aData) {
      if ("scriptish-script-installed" != aTopic) return;
      $("scriptish-list-empty").style.display = "none";
      Services.obs.removeObserver(installObserver, "scriptish-script-installed");
      needToRemoveObserver = false;
    },
    QueryInterface: XPCOMUtils.generateQI([Ci.nsISupports, Ci.nsIObserver])
  };
  Services.obs.addObserver(installObserver, "scriptish-script-installed", false);

  window.addEventListener("unload", function() {
    if (needToRemoveObserver)
      Services.obs.removeObserver(installObserver, "scriptish-script-installed");
    Scriptish_config.uninstallScripts();
  }, false);
}, false);

})(function(aID) document.getElementById(aID), {});
