var EXPORTED_SYMBOLS = ["Config"];

const SCRIPTISH_CONFIG_XML = "scriptish-config.xml";
const SCRIPTISH_CONFIG_JSON = "scriptish-config.json";
const SCRIPTISH_BLOCKLIST = "scriptish-blocklist.json";

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");

lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/script/script.js", ["Script"]);
lazyImport(this, "resource://scriptish/utils/Scriptish_isURLExcluded.js", [
  "Scriptish_isURLExcluded",
  "Scriptish_addExcludes",
  "Scriptish_setExcludes",
  "Scriptish_getExcludes"
]);
const { setTimeout, clearTimeout } = jetpack('sdk/timers');

lazyUtil(this, "cryptoHash");
lazyUtil(this, "injectScripts");
lazyUtil(this, "isScriptRunnable");
lazyUtil(this, "getContents");
lazyUtil(this, "getProfileFile");
lazyUtil(this, "getWriteStream");
lazyUtil(this, "stringBundle");

function Config(aBaseDir) {
  var self = this;
  this.loaded = false;
  this._observers = [];
  this._saveTimer = null;
  this._scripts = [];
  this._scriptFoldername = aBaseDir;

  this._prettyPrint = Scriptish_prefRoot.getValue("config.prettyPrint.enabled");

  this._useBlocklist = Scriptish_prefRoot.getValue("blocklist.enabled");
  this._blocklistURL = Scriptish_prefRoot.getValue("blocklist.url");
  this._blocklist = {};
  this._blocklistHash = "";
  (this._blocklistFile = this._scriptDir).append(SCRIPTISH_BLOCKLIST);

  this._initScriptDir();
  this._initBlocklist();

  [
    "scriptish-script-installed",
    "scriptish-script-modified",
    "scriptish-script-edit-enabled",
    "scriptish-script-user-prefs-change",
    "scriptish-script-prefs-change",
    "scriptish-script-updated",
    "scriptish-script-uninstalled",
    "scriptish-script-uninstall-canceled",
    "scriptish-script-removed",
    "scriptish-preferences-change",
    "scriptish-config-saved"
  ].forEach(function(i) Services.obs.addObserver(self, i, false));
}
Config.prototype = {
  get _scriptDir() Scriptish_getProfileFile(this._scriptFoldername),

  get _tempFile() {
    let tmp = this._scriptDir;
    tmp.append(SCRIPTISH_CONFIG_JSON + ".tmp");
    return tmp;
  },

  observe: function(aSubject, aTopic, aData) {
    var data = JSON.parse(aData || "{}");
    switch(aTopic) {
    case "scriptish-script-user-prefs-change":
      Scriptish.notify(
          aSubject, "scriptish-script-modified", {saved:true, reloadUI:false});
    case "scriptish-script-prefs-change":
    case "scriptish-script-installed":
    case "scriptish-script-modified":
    case "scriptish-script-edit-enabled":
    case "scriptish-script-updated":
    case "scriptish-script-uninstalled":
    case "scriptish-script-uninstall-canceled":
    case "scriptish-script-removed":
    case "scriptish-preferences-change":
      if (data.saved) Scriptish.notify(null, "scriptish-config-saved", null);
      break;
    case "scriptish-config-saved":
      this._save();
      break;
    }
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
        var blocklist = JSON.parse(json);
      } catch (e) {
        return;
      }
      if (!blocklist.uso) return;

      var hash = Scriptish_cryptoHash(json);
      if (self._blocklistHash == hash) return;

      let file = self._blocklistFile;

      // write blocklist
      let converter = Instances.suc;
      converter.charset = "UTF-8";
      let writeStream = Scriptish_getWriteStream(file, {defer:true, safe:true});
      NetUtil.asyncCopy(
          converter.convertToInputStream(json), // source must be buffered!
          writeStream,
          function() writeStream.finish()
          );

      Scriptish_log("Updated Scriptish blocklist " + SCRIPTISH_BLOCKLIST);

      self._blocklist = blocklist;
      self._blocklistHash = hash;

      self._blockScripts();
    }; // if there is an error then just try again next time for now..
    req.send(null);
  },

  _loadBlocklist: function() {
    let self = this;
    timeout(function() {
      var file = self._blocklistFile;
      if (file.exists()) {
        Scriptish_getContents(file, 0, function(str) {
          self._blocklist = JSON.parse(str);
          self._blocklistHash = Scriptish_cryptoHash(str);

          // block scripts
          self._blockScripts();
        });
      }
    });
  },

  _loadXML: function(aFile, aCallback) {
    Scriptish_log("Scriptish Config._loadXML");
    var self = this;

    if (aFile.exists()) {
      var str = Scriptish_getContents(aFile);
      if (!str) return aCallback(false);

      var doc = Instances.dp.parseFromString(str, "text/xml");

      // Stop if there was a parsing error
      if (doc.documentElement.nodeName == "parsererror")
        return aCallback(false);

      var nodes = doc.evaluate("/UserScriptConfig/Script | /UserScriptConfig/Exclude", doc, null, 0, null);
      let excludes = [];

      for (var node; node = nodes.iterateNext();) {
        switch (node.nodeName) {
        case "Script":
          Script.loadFromXML(self, node);
          break;
        case "Exclude":
          excludes.push(node.firstChild.nodeValue.trim());
          break;
        }
      }
      Scriptish_addExcludes(excludes);

      return aCallback(true);
    }

    aCallback(false);
  },

  _loadJSON: function(aFile, aCallback) {
    Scriptish_log("Scriptish Config._loadJSON");
    var self = this;
    var config = {};

    if (aFile.exists()) {
      var str = Scriptish_getContents(aFile);
      if (!str) return aCallback(false);

      try {
        config = JSON.parse(str);
      } catch(e) {
        // Unable to parse the file.
        return aCallback(false);
      }

      // load scripts
      var fileModified = false, scripts = config.scripts;
      for (var i = scripts.length - 1; ~i; i--)
        fileModified = Script.loadFromJSON(self, scripts[i]) || fileModified;

      // load global excludes
      Scriptish_addExcludes(config.excludes);

      return aCallback(true, fileModified);
    }

    aCallback(false);
  },

  load: function(aCallback) {
    Scriptish_log("Scriptish Config.load");
    var self = this;

    // called after the config has been loaded
    function callback(fileModified) {
      let scripts = self._scripts;
      let len = scripts.length;

      // Improves first-run startup time to punt this until a script is installed
      if (len) {
        // Try to fetch uso usage data if some time has passed
        let interval = Scriptish_prefRoot.getValue("update.uso.interval");
        let lastFetch = Scriptish_prefRoot.getValue("update.uso.lastFetch");
        let now = Math.ceil(Date.now() / 1E3);
        if (now - lastFetch >= interval) {
          Scriptish_prefRoot.setValue("update.uso.lastFetch", now);

          // Fetch uso data
          for (var i = len - 1; ~i; i--) {
            let script = scripts[i];
            if (!script.blocked && script.isUSOScript())
              timeout(script.updateUSOData.bind(script), i * 100);
          }
        }
      }

      // Load the blocklist
      if (self._useBlocklist) self._loadBlocklist();

      // Flag config as loaded
      self.loaded = true;

      if (fileModified) self._save();
      aCallback();
    };

    // Load the config (trying from various sources)
    var configFile;
    // source: Scriptish JSON tmp; for pre-nsISafeOutputStream compatiblity
    self._loadJSON(self._tempFile, function(aSuccess) {
      if (aSuccess) return callback(true);

      // source: Scriptish JSON
      // NOTE: this is the only case where we care if the file was modified
      (configFile = self._scriptDir).append(SCRIPTISH_CONFIG_JSON);
      self._loadJSON(configFile, function(aSuccess, aModified) {
        if (aSuccess) return callback(aModified);

        // source: Scriptish XML
        (configFile = self._scriptDir).append(SCRIPTISH_CONFIG_XML);
        self._loadXML(configFile, function(aSuccess) {
          if (aSuccess) return callback(true);

          // source: Older GM Style XML
          (configFile = self._scriptDir).append("config.xml");
          self._loadXML(configFile, function() callback(true));
        });
      });
    });

    Scriptish_prefRoot.watch("config.prettyPrint.enabled", function() {
      self._prettyPrint = Scriptish_prefRoot.getValue("config.prettyPrint.enabled");
      self._save();
    });

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
  },

  toJSON: function() ({
    excludes: Scriptish_getExcludes(),
    scripts: this.scripts.map(function(script) script.toJSON())
  }),

  _blockScripts: function() {
    var scripts = this._scripts;
    for (var i = scripts.length - 1; ~i; i--) scripts[i].doBlockCheck();
  },

  _save: function(aSaveNow) {
    if (!this.loaded) return; // a safety check that should not be relied on

    // If we have not explicitly been told to save now, then defer execution
    // via a timer, to avoid locking up the UI.
    if (!aSaveNow) {
      // Reduce work in the case of many changes near to each other in time.
      if (this._saveTimer) clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(this._save.bind(this, true), 250);
      return;
    }
    delete this["_saveTimer"];

    if (this._isSaving)
      return (this._pendingSave = true);

    this._isSaving = true;

    // make sure that the configFile is SCRIPTISH_CONFIG_JSON
    (this._configFile = this._scriptDir).append(SCRIPTISH_CONFIG_JSON);

    Scriptish_log(
        Scriptish_stringBundle("saving") + " " + SCRIPTISH_CONFIG_JSON);

    let converter = Instances.suc;
    converter.charset = "UTF-8";
    let json = JSON.stringify(this.toJSON(), null, this._prettyPrint ? "  " : null);
    let writeStream = Scriptish_getWriteStream(this._configFile, {defer:true, safe:true});
    NetUtil.asyncCopy(
      converter.convertToInputStream(json), // source must be buffered!
      writeStream,
      function() {
        writeStream.finish();
        delete this._isSaving;
        if (this._pendingSave) {
          delete this._pendingSave;
          this._save();
        }
      }.bind(this));
  },

  parse: function(source, uri, aUpdateScript) (
      Script.parse(this, source, uri, aUpdateScript)),

  install: function(aNewScript) {
    var existingIndex = this._find(aNewScript.id);
    var exists = existingIndex > -1;

    if (exists) {
      this._scripts[existingIndex].replaceScriptWith(aNewScript);
    }
    else {
      aNewScript.installProcess();
      timeout(aNewScript.updateUSOData.bind(aNewScript));
      this.addScript(aNewScript);

      Scriptish.notify(aNewScript, "scriptish-script-installed", true);
    }

    this.sortScripts();
  },

  uninstallScripts: function() {
    let scripts = this._scripts;
    for (var i = scripts.length; ~--i;) {
      let script = scripts[i];
      if (script.needsUninstall) {
        this._scripts.splice(i, 1);
        script.uninstallProcess();
      }
    }
  },

  _initScriptDir: function() {
    // create an empty configuration if none exist.
    var dir = this._scriptDir;
    if (!dir.exists())
      dir.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
  },

  _initBlocklist: function() {
    if (!this._useBlocklist) return;

    // Try to fetch a new list if blocklist is enabled and some time has passed
    let interval = Scriptish_prefRoot.getValue("blocklist.interval");
    let lastFetch = Scriptish_prefRoot.getValue("blocklist.lastFetch");
    let now = Math.ceil(Date.now() / 1E3);
    if (now - lastFetch >= interval) {
      Scriptish_prefRoot.setValue("blocklist.lastFetch", now);
      this._fetchBlocklist();
    }
  },

  get scripts() this._scripts.concat(),
  getMatchingScripts: function(testFunc) this.scripts.filter(testFunc),
  sortScripts: function() this._scripts.sort(function(a, b) b.priority - a.priority),
  injectScript: function(script) {
    var safeWin = this.wrappedContentWin;
    var unsafeWin = safeWin.wrappedJSObject;
    var unsafeLoc = new XPCNativeWrapper(unsafeWin, "location").location;
    var href = new XPCNativeWrapper(unsafeLoc, "href").href;

    if (script.enabled && !script.needsUninstall && script.matchesURL(href)) {
      Scriptish_injectScripts({
        scripts: [script],
        url: href,
        safeWin: safeWin
      });
    }
  },

  updateModifiedScripts: function(scriptInjector) {
    var self = this;

    for (let [, script] in Iterator(this._scripts)) {
      if (script.delayInjection) {
        script.delayedInjectors.push(scriptInjector);
        continue;
      }

      if (!script.isModified()) continue;

      let theScript = script;
      Scriptish_getContents(script._file, 0, function(content) {
        let parsedScript = self.parse(
            content,
            theScript._downloadURL && NetUtil.newURI(theScript._downloadURL),
            theScript);
        theScript.updateFromNewScript(parsedScript, scriptInjector);
      });
    }
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsISupports, Ci.nsIObserver])
}

Config.prototype.initScripts = function(url, isTopWin, aCallback) {
  let scripts = {
    "document-start": [],
    "document-end": [],
    "document-idle": [],
    "window-load": []
  };

  this.getMatchingScripts(function(script) {
    let chk = Scriptish_isScriptRunnable(script, url, isTopWin);
    if (chk) scripts[script.runAt].push(script);
    return chk;
  }, [url]);

  aCallback(scripts);
};
