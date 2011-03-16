var EXPORTED_SYMBOLS = ["Config"];

const SCRIPTISH_CONFIG = "scriptish-config.xml";
const SCRIPTISH_BLOCKLIST = "scriptish-blocklist.json";

(function(inc) {
inc("resource://scriptish/constants.js");
inc("resource://scriptish/logging.js");
inc("resource://scriptish/prefmanager.js");
inc("resource://scriptish/utils/Scriptish_getContents.js");
inc("resource://scriptish/utils/Scriptish_hitch.js");
inc("resource://scriptish/utils/Scriptish_getWriteStream.js");
inc("resource://scriptish/utils/Scriptish_getProfileFile.js");
inc("resource://scriptish/utils/Scriptish_notification.js");
inc("resource://scriptish/utils/Scriptish_stringBundle.js");
inc("resource://scriptish/utils/Scriptish_openManager.js");
inc("resource://scriptish/utils/Scriptish_convert2RegExp.js");
inc("resource://scriptish/utils/Scriptish_cryptoHash.js");
inc("resource://scriptish/third-party/Timer.js");
inc("resource://scriptish/script/script.js");
})(Components.utils.import);

function Config(aBaseDir) {
  this.timer = new Timer();
  this._observers = [];
  this._saveTimer = null;
  this._excludes = [];
  this._excludeRegExps = [];
  this._scripts = [];
  this._scriptFoldername = aBaseDir;

  let configFile = this._scriptDir;
  configFile.append(SCRIPTISH_CONFIG);
  if (!configFile.exists()) {
    (configFile = this._scriptDir).append("config.xml");
    if (!configFile.exists())
        (configFile = this._scriptDir).append(SCRIPTISH_CONFIG);
  }

  this._configFile = configFile;

  this._blocklist = {};
  this._blocklistHash = "";
  (this._blocklistFile = this._scriptDir).append(SCRIPTISH_BLOCKLIST);

  this._initScriptDir();
  this._load();
  (this._configFile = this._scriptDir).append(SCRIPTISH_CONFIG);

  Components.utils.import("resource://scriptish/addonprovider.js");
}
Config.prototype = {
  addObserver: function(observer, script) {
    var observers = script ? script._observers : this._observers;
    observers.push(observer);
  },

  removeObserver: function(observer, script) {
    var observers = script ? script._observers : this._observers;
    var index = observers.indexOf(observer);
    if (index == -1)
      throw new Error(Scriptish_stringBundle("error.observerNotFound"));
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

  installIsUpdate: function(script) this._find(script.id) > -1,

  addScript: function(aScript) { this._scripts.push(aScript); },

  _find: function(aID, aType) {
    var scripts = this._scripts;
    for (var i = 0, script; script = scripts[i]; i++)
      if (script.id == aID) return ("script" == aType) ? script : i;
    return ("script" == aType) ? null : -1;
  },
  getScriptById: function(aID) this._find(aID, "script"),

  isBlocked: function(uri) {
    var usos = this._blocklist.uso;
    if (!usos) return false;
    if ("userscripts.org" == uri.host)
      for (var i = 0, uso; uso = usos[i++];)
        if (uri.spec.match(new RegExp("(?:\/" + uso + "\/?$|\/" + uso + "\.user\.js)")))
          return true;
    return false;
  },

  _load: function() {
    // load config
    var configContents = Scriptish_getContents(this._configFile);
    var doc = Instances.dp.parseFromString(configContents, "text/xml");
    var nodes = doc.evaluate("/UserScriptConfig/Script | /UserScriptConfig/Exclude", doc, null, 0, null);
    var fileModified = false;
    let excludes = [];

    for (var node; node = nodes.iterateNext();) {
      switch (node.nodeName) {
      case "Script":
        fileModified = Script.load(this, node) || fileModified;
        break;
      case "Exclude":
        excludes.push(node.firstChild.nodeValue.trim());
        break;
      }
    }
    this.addExclude(excludes);

    // load blocklist
    if (this._blocklistFile.exists()) {
      let blockListContents = Scriptish_getContents(this._blocklistFile);
      let blocklist = Instances.json.decode(blockListContents);
      this._blocklist = blocklist;
      this._blocklistHash = Scriptish_cryptoHash(blockListContents);

      // remove blocked scripts
      var scripts = this._scripts;
      for (var i = scripts.length - 1; ~i; i--) {
        let uri = null, script = scripts[i];
        try {
          uri = NetUtil.newURI(script.homepageURL);
        } catch (e) {}
        if (!uri) continue;
        if (this.isBlocked(uri)) {
          this._scripts.splice(i, 1);
          script.uninstallProcess();
          Scriptish_log("Removing blocked userscript '" + script.name + "' from Scriptish", true); // TODO: l10n
        }
      }
    }

    // the delay b4 save here is very important now that config.xml is used when
    // scriptish-config.xml DNE
    if (fileModified) this._save();
  },

  _save: function(saveNow) {
    // If we have not explicitly been told to save now, then defer execution
    // via a timer, to avoid locking up the UI.
    if (!saveNow) {
      // Reduce work in the case of many changes near to each other in time.
      if (this._saveTimer) this.timer.clearTimeout(this._saveTimer);
      this._saveTimer =
          this.timer.setTimeout(Scriptish_hitch(this, "_save", true), 250);
      return;
    }
    delete this["_saveTimer"];

    var doc = Instances.dp.parseFromString("<UserScriptConfig/>", "text/xml");
    var scripts = this._scripts;
    var len = scripts.length;
    var firstChild = doc.firstChild;
    let nt = "\n\t";
    function addNode(str, node) firstChild.appendChild(doc.createTextNode(str))
        && node && firstChild.appendChild(node);

    // add script info
    for (var i = 0, script; script = scripts[i]; i++)
      addNode(nt, script.createXMLNode(doc));

    // add global excludes info
    for (let [, exclude] in Iterator(this.excludes))
      addNode(nt, doc.createElement("Exclude"))
          .appendChild(doc.createTextNode(exclude));

    addNode("\n");

    var configStream = Scriptish_getWriteStream(this._configFile);
    Instances.ds.serializeToStream(doc, configStream, "utf-8");
    configStream.close();
  },

  parse: function(source, uri, aUpdateScript) (
      Script.parse(this, source, uri, aUpdateScript)),

  install: function(aNewScript) {
    var existingIndex = this._find(aNewScript.id);
    var exists = existingIndex > -1;
    if (exists) {
      this._scripts[existingIndex].replaceScriptWith(aNewScript);
    } else {
      aNewScript.installProcess();
      this.addScript(aNewScript);
      this._changed(aNewScript, "install", null);
      AddonManagerPrivate.callInstallListeners(
          "onExternalInstall", null, aNewScript, null, false);

      // notification that install is complete
      var msg = "'" + aNewScript.name;
      if (aNewScript.version) msg += " " + aNewScript.version;
      msg += "' " + Scriptish_stringBundle("statusbar.installed");
      Scriptish_notification(msg, null, null, function() Scriptish_openManager());
    }
  },

  uninstallScripts: function() {
    let scripts = this._scripts;
    for (var i = scripts.length - 1; i >= 0; i--) {
      let script = scripts[i];
      if (script.needsUninstall) {
        this._scripts.splice(i, 1);
        script.uninstallProcess();
      }
    }
  },

  get _scriptDir() Scriptish_getProfileFile(this._scriptFoldername),

  _initScriptDir: function() {
    var self = this;

    // create an empty configuration if none exist.
    var dir = this._scriptDir;
    if (!dir.exists()) {
      // create script folder
      dir.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);

      // create config.xml file
      var configStream = Scriptish_getWriteStream(this._configFile);
      var xml = "<UserScriptConfig/>";
      configStream.write(xml, xml.length);
      configStream.close();
    }

    // check for blocklist update
    var req = Instances.xhr;
    req.onload = function() {
      var json = req.responseText;
      try {
        var blocklist = Instances.json.decode(json);
      } catch (e) {
        return;
      }
      if (!blocklist.uso) return;

      var hash = Scriptish_cryptoHash(json);
      if (self._blocklistHash == hash) return;

      let file = self._blocklistFile;

      // write blocklist
      var BLStream = Scriptish_getWriteStream(file);
      BLStream.write(json, json.length);
      BLStream.close();
      Scriptish_log("Updated Scriptish blocklist");

      self._blocklist = blocklist;
      self._blocklistHash = hash;
    }; // if there is an error then just try again next time for now..
    req.open("GET", "https://github.com/erikvold/scriptish/raw/master/blocklist.json", true);
    req.send(null);
  },

  get excludes() this._excludes.concat(),
  set excludes(excludes) {
    this._excludes = [];
    this._excludeRegExps = [];
    this.addExclude(excludes)
  },
  get excludeRegExps() this._excludeRegExps.concat(),
  addExclude: function(excludes) {
    if (!excludes) return;
    excludes = (typeof excludes == "string") ? [excludes] : excludes;
    for (let [, exclude] in Iterator(excludes)) {
      this._excludes.push(exclude);
      this._excludeRegExps.push(Scriptish_convert2RegExp(exclude));
    }
  },

  get scripts() this._scripts.sort(function(a, b) b.priority - a.priority).concat(),
  getMatchingScripts: function(testFunc) this.scripts.filter(testFunc),
  injectScript: function(script) {
    var unsafeWin = this.wrappedContentWin.wrappedJSObject;
    var unsafeLoc = new XPCNativeWrapper(unsafeWin, "location").location;
    var href = new XPCNativeWrapper(unsafeLoc, "href").href;

    if (script.enabled && !script.needsUninstall && script.matchesURL(href))
      Services.scriptish.injectScripts([script], href, unsafeWin, this.chromeWin);
  },

  updateModifiedScripts: function(scriptInjector) {
    for (let [, script] in Iterator(this._scripts)) {
      if (script.delayInjection) {
        script.delayedInjectors.push(scriptInjector);
        continue;
      }
      if (!script.isModified()) continue;
      let parsedScript = this.parse(
          script.textContent,
          script._downloadURL && NetUtil.newURI(script._downloadURL), script);
      script.updateFromNewScript(parsedScript, scriptInjector);
    }
    this._save();
  }
}
