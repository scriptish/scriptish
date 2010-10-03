var EXPORTED_SYMBOLS = ["Config"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/utils/Scriptish_getContents.js");
Cu.import("resource://scriptish/utils/Scriptish_hitch.js");
Cu.import("resource://scriptish/utils/Scriptish_getWriteStream.js");
Cu.import("resource://scriptish/third-party/Timer.js");
Cu.import("resource://scriptish/script/script.js");
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");


function Config(aBaseDir) {
  this._saveTimer = null;
  this._scripts = null;
  this._scriptFoldername = aBaseDir;

  this._configFile = this._scriptDir;
  this._configFile.append("config.xml");

  this._initScriptDir();

  this.timer = new Timer();
  this._observers = [];

  this._load();
}
Config.prototype = {
  addObserver: function(observer, script) {
    var observers = script ? script._observers : this._observers;
    observers.push(observer);
  },

  removeObserver: function(observer, script) {
    var observers = script ? script._observers : this._observers;
    var index = observers.indexOf(observer);
    if (index == -1) throw new Error("Observer not found");
    observers.splice(index, 1);
  },

  _notifyObservers: function(script, event, data) {
    var observers = this._observers.concat(script._observers);
    for (var i = 0, observer; observer = observers[i]; i++) {
      observer.notifyEvent(script, event, data);
    }
  },

  _changed: function(script, event, data, dontSave) {
    if (!dontSave) this._save();
    this._notifyObservers(script, event, data);
  },

  installIsUpdate: function(script) {
    return this._find(script.id) > -1;
  },

  addScript: function(aScript) {
    this._scripts.push(aScript);
  },

  _find: function(aID, aType) {
    var scripts = this._scripts;
    for (var i = 0, script; script = scripts[i]; i++)
      if (script.id == aID) return ("script" == aType) ? script : i;
    return ("script" == aType) ? null : -1;
  },
  getScriptById: function(aID) this._find(aID, "script"),

  _load: function() {
    var domParser = Cc["@mozilla.org/xmlextras/domparser;1"]
        .createInstance(Ci.nsIDOMParser);

    var configContents = Scriptish_getContents(this._configFile);
    var doc = domParser.parseFromString(configContents, "text/xml");
    var nodes = doc.evaluate("/UserScriptConfig/Script", doc, null, 0, null);
    var fileModified = false;

    this._scripts = [];

    for (var node = null; node = nodes.iterateNext(); ) {
      fileModified = Script.load(this, node) || fileModified;
    }

    if (fileModified) {
      this._save();
    }
  },

  _save: function(saveNow) {
    // If we have not explicitly been told to save now, then defer execution
    // via a timer, to avoid locking up the UI.
    if (!saveNow) {
      // Reduce work in the case of many changes near to each other in time.
      if (this._saveTimer) {
        this.timer.clearTimeout(this._saveTimer);
      }

      this._saveTimer =
          this.timer.setTimeout(Scriptish_hitch(this, "_save", true), 250);

      return;
    }
    delete this["_saveTimer"];

    var doc = Cc["@mozilla.org/xmlextras/domparser;1"]
        .createInstance(Ci.nsIDOMParser)
        .parseFromString("<UserScriptConfig></UserScriptConfig>", "text/xml");

    var scripts = this._scripts;
    var len = scripts.length;
    var firstChild = doc.firstChild;
    for (var i = 0, script; script = scripts[i]; i++) {
      firstChild.appendChild(doc.createTextNode("\n\t"));
      firstChild.appendChild(script.createXMLNode(doc));
    }
    firstChild.appendChild(doc.createTextNode("\n"));

    var configStream = Scriptish_getWriteStream(this._configFile);
    Cc["@mozilla.org/xmlextras/xmlserializer;1"]
        .createInstance(Ci.nsIDOMSerializer)
        .serializeToStream(doc, configStream, "utf-8");
    configStream.close();
  },

  parse: function(source, uri, aUpdateScript) {
    return Script.parse(this, source, uri, aUpdateScript);
  },

  install: function(aNewScript) {
    var existingIndex = this._find(aNewScript.id);
    var exists = existingIndex > -1;
    if (exists) {
      var oldScript = this._scripts[existingIndex];
      oldScript.removeFiles();
      aNewScript.installProcess();
      oldScript.updateFromNewScript(aNewScript, true);
      this._changed(oldScript, "update", null);
    } else {
      aNewScript.installProcess();
      this.addScript(aNewScript);
      this._changed(aNewScript, "install", null);
      AddonManagerPrivate.callInstallListeners(
          "onExternalInstall", null, aNewScript, null, false);
    }
  },

  uninstall: function(aIndx) {
    var script = this._scripts[aIndx];
    var idx = this._find(script.id);
    this._scripts.splice(aIndx, 1);
    script.uninstallProcess();
  },

  get _scriptDir() {
    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_getProfileFile.js", tools);
    return tools.Scriptish_getProfileFile(this._scriptFoldername);
  },

  /**
   * Create an empty configuration if none exist.
   */
  _initScriptDir: function() {
    var dir = this._scriptDir;

    // if the folder does not exist
    if (!dir.exists()) {
      dir.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);

      // create config.xml file
      var configStream = Scriptish_getWriteStream(this._configFile);
      var xml = "<UserScriptConfig/>";
      configStream.write(xml, xml.length);
      configStream.close();
    }
  },

  get scripts() { return this._scripts.concat(); },
  getMatchingScripts: function(testFunc) { return this._scripts.filter(testFunc); },
  injectScript: function(script) {
    var unsafeWin = this.wrappedContentWin.wrappedJSObject;
    var unsafeLoc = new XPCNativeWrapper(unsafeWin, "location").location;
    var href = new XPCNativeWrapper(unsafeLoc, "href").href;

    if (script.enabled && !script.needsUninstall && script.matchesURL(href)) {
      gmService.injectScripts([script], href, unsafeWin, this.chromeWin);
    }
  },

  updateModifiedScripts: function() {
    // Find any updated scripts
    var scripts = this.getMatchingScripts(
        function (script) { return script.isModified(); });
    if (0 == scripts.length) return;

    for (var i = 0, script; script = scripts[i]; i++) {
      var parsedScript = this.parse(
          Scriptish_getContents(script._file),
          NetUtil.newURI(script._downloadURL), script);
      script.updateFromNewScript(parsedScript);
    }

    this._save();
  }
};
