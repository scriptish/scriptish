var EXPORTED_SYMBOLS = ["Config"];

const SCRIPTISH_CONFIG = "scriptish-config.xml";
const SCRIPTISH_BLOCKLIST = "scriptish-blocklist.json";

(function(inc) {
inc("resource://scriptish/constants.js");
inc("resource://scriptish/logging.js");
inc("resource://scriptish/prefmanager.js");
inc("resource://scriptish/scriptish.js");
inc("resource://scriptish/utils/Scriptish_getContents.js");
inc("resource://scriptish/utils/Scriptish_getWriteStream.js");
inc("resource://scriptish/utils/Scriptish_getProfileFile.js");
inc("resource://scriptish/utils/Scriptish_notification.js");
inc("resource://scriptish/utils/Scriptish_stringBundle.js");
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

  this._updateSecurely = Scriptish_prefRoot.getValue("update.requireSecured");

  this._useBlocklist = Scriptish_prefRoot.getValue("blocklist.enabled");
  this._blocklistURL = Scriptish_prefRoot.getValue("blocklist.url");
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

  _fetchBlocklist: function() {
    // Check for blocklist update
    var self = this;
    var req = Instances.xhr;
    req.open("GET", this._blocklistURL, true);
    req.channel.loadFlags |= Ci.nsIRequest.LOAD_BYPASS_CACHE; // bypass cache
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

      self._blockScripts();
    }; // if there is an error then just try again next time for now..
    req.send(null);
  },

  _loadBlocklist: function() {
    if (this._blocklistFile.exists()) {
      let blockListContents = Scriptish_getContents(this._blocklistFile);
      let blocklist = Instances.json.decode(blockListContents);
      this._blocklist = blocklist;
      this._blocklistHash = Scriptish_cryptoHash(blockListContents);

      // block scripts
      this._blockScripts();
    }
  },

  _load: function() {
    // load config
    var self = this;
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

    // Watch for the required secure updates pref being modified
    Scriptish_prefRoot.watch("update.requireSecured", function() {
      this._updateSecurely = Scriptish_prefRoot.getValue("update.requireSecured");
    });

    // Listen for the blocklist pref being modified
    Scriptish_prefRoot.watch("blocklist.enabled", function() {
      self._useBlocklist = Scriptish_prefRoot.getValue("blocklist.enabled");
      if (self._useBlocklist) {
        // Blocklist was enabled.  Load the blocklist.
        self._loadBlocklist();
      } else {
        // Blocklist was disabled.  Clean things up.
        self._blocklist = {};
      }
    });

    // Load the blocklist
    if (this._useBlocklist) this._loadBlocklist();

    // Try to fetch uso usage data if some time has passed
    let interval = Scriptish_prefRoot.getValue("update.uso.interval");
    let lastFetch = Scriptish_prefRoot.getValue("update.uso.lastFetch");
    let now = Math.ceil((new Date()).getTime() / 1E3);
    if (now - lastFetch >= interval) {
      Scriptish_prefRoot.setValue("update.uso.lastFetch", now);

      // Fetch uso data
      let scripts = this._scripts;
      for (var i = scripts.length - 1; ~i; i--) {
        let script = scripts[i];
        if (!script.blocked && script.isUSOScript())
          timeout(script.updateUSOData.bind(script), i * 100);
      }
    }

    // the delay b4 save here is very important now that config.xml is used when
    // scriptish-config.xml DNE
    if (fileModified) this._save();
  },

  _blockScripts: function() {
    var scripts = this._scripts;
    for (var i = scripts.length - 1; ~i; i--) scripts[i].doBlockCheck();
  },

  _save: function(saveNow) {
    // If we have not explicitly been told to save now, then defer execution
    // via a timer, to avoid locking up the UI.
    if (!saveNow) {
      // Reduce work in the case of many changes near to each other in time.
      if (this._saveTimer) this.timer.clearTimeout(this._saveTimer);
      this._saveTimer =
          this.timer.setTimeout(this._save.bind(this, true), 250);
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
      Scriptish_notification(msg, null, null, function() Scriptish.openManager());
    }
    this.sortScripts();
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

    if (!this._useBlocklist) return;

    // Try to fetch a new list if blocklist is enabled and some time has passed
    let interval = Scriptish_prefRoot.getValue("blocklist.interval");
    let lastFetch = Scriptish_prefRoot.getValue("blocklist.lastFetch");
    let now = Math.ceil((new Date()).getTime() / 1E3);
    if (now - lastFetch >= interval) {
      Scriptish_prefRoot.setValue("blocklist.lastFetch", now);
      this._fetchBlocklist();
    }
  },

  get updateSecurely() this._updateSecurely,

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

  get scripts() this._scripts.concat(),
  getMatchingScripts: function(testFunc) this.scripts.filter(testFunc),
  sortScripts: function() this._scripts.sort(function(a, b) b.priority - a.priority),
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
