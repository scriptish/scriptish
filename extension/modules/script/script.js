var EXPORTED_SYMBOLS = ["Script"];

const valueSplitter = /(\S+)\s+([^\r\f\n]+)/;

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/utils/Scriptish_hitch.js");
Cu.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");
Cu.import("resource://scriptish/utils/Scriptish_getContents.js");
Cu.import("resource://scriptish/utils/Scriptish_convert2RegExp.js");
Cu.import("resource://scriptish/utils/Scriptish_parseScriptName.js");
Cu.import("resource://scriptish/utils/Scriptish_notification.js");
Cu.import("resource://scriptish/utils/Scriptish_stringBundle.js");
Cu.import("resource://scriptish/utils/Scriptish_openManager.js");
Cu.import("resource://scriptish/script/scriptinstaller.js");
Cu.import("resource://scriptish/script/scripticon.js");
Cu.import("resource://scriptish/script/scriptrequire.js");
Cu.import("resource://scriptish/script/scriptresource.js");
Cu.import("resource://scriptish/third-party/MatchPattern.js");
Cu.import("resource://scriptish/config/configdownloader.js");

const metaRegExp = /\/\/ (?:==\/?UserScript==|\@\S+(?:[ \t]+(?:[^\r\f\n]+))?)/g;
const nonIdChars = /[^\w@\.\-_]+/g; // any char matched by this is not valid
const JSVersions = ['1.6', '1.7', '1.8', '1.8.1'];
const maxJSVer = JSVersions[2];
const runAtValues = ["document-start", "document-end", "document-idle", "window-load"];
const defaultRunAt = runAtValues[1]

function noUpdateFound(aListener) {
  aListener.onNoUpdateAvailable(this);
  if (aListener.onUpdateFinished) aListener.onUpdateFinished(this);
}
function updateFound(aListener) {
  var AddonInstall = new ScriptInstall(this);
  this.updateAvailable = true;
  AddonManagerPrivate.callAddonListeners("onNewInstall", AddonInstall);
  aListener.onUpdateAvailable(this, AddonInstall);
  if (aListener.onUpdateFinished) aListener.onUpdateFinished(this);
}

// Implements Addon https://developer.mozilla.org/en/Addons/Add-on_Manager/Addon
function Script(config) {
  this._config = config;
  this._observers = [];

  this._homepageURL = null;
  this._downloadURL = null;
  this._updateURL = null;
  this._tempFile = null; // Only for scripts not installed
  this._basedir = null;
  this._filename = null;
  this._modified = null;
  this._dependhash = null;

  this._id = null;
  this._name = null;
  this._namespace = "";
  this._prefroot = null;
  this._author = null;
  this._contributors = [];
  this._description = null;
  this._version = null;
  this._icon = new ScriptIcon(this);
  this._enabled = true;
  this.needsUninstall = false;
  this._includes = [];
  this._excludes = [];
  this._matches = [];
  this._includeRegExps = [];
  this._excludeRegExps = [];
  this._delay = null;
  this._requires = [];
  this._resources = [];
  this._screenshots = [];
  this._noframes = false;
  this._dependFail = false
  this.delayInjection = false;
  this.delayedInjectors = [];
  this._rawMeta = null;
  this._jsversion = null;
  this["_run-at"] = null;
}
Script.prototype = {
  isCompatible: true,
  blocklistState: 0,
  appDisabled: false,
  scope: AddonManager.SCOPE_PROFILE,
  applyBackgroundUpdates: false,
  get isActive() !this.userDisabled,
  pendingOperations: AddonManager.PENDING_NONE,
  type: "userscript",
  get sourceURI () this._downloadURL && NetUtil.newURI(this._downloadURL),
  get userDisabled() !this._enabled,
  set userDisabled(val) {
    if (val == this.userDisabled) return val;

    AddonManagerPrivate.callAddonListeners(
        val ? "onEnabling" : "onDisabling", this, false);

    this._enabled = !val;
    this._changed("edit-enabled", this._enabled);

    AddonManagerPrivate.callAddonListeners(
        val ? "onEnabled" : "onDisabled", this);
  },

  isCompatibleWith: function() true,
  get permissions() {
    var perms = AddonManager.PERM_CAN_UNINSTALL;
    perms |= this.userDisabled ? AddonManager.PERM_CAN_ENABLE : AddonManager.PERM_CAN_DISABLE;
    if (this.updateURL) perms |= AddonManager.PERM_CAN_UPGRADE
    return perms;
  },

  get updateDate () new Date(parseInt(this._modified)),

  findUpdates: function(aListener, aReason) {
    if (aListener.onNoCompatibilityUpdateAvailable)
      aListener.onNoCompatibilityUpdateAvailable(this);
    switch (aReason) {
      case AddonManager.UPDATE_WHEN_NEW_APP_DETECTED:
      case AddonManager.UPDATE_WHEN_NEW_APP_INSTALLED:
      case AddonManager.UPDATE_WHEN_ADDON_INSTALLED:
        return noUpdateFound.call(this, aListener);
    }
    if (this.updateAvailable) return updateFound.call(this, aListener);
    this.checkForRemoteUpdate(function(aUpdate) {
      if (!aUpdate) return noUpdateFound.call(this, aListener);
      updateFound.call(this, aListener);
    });
  },
  checkForRemoteUpdate: function(aCallback) {
    var updateURL = this.updateURL;
    if (!updateURL) return aCallback.call(this, false);
    var req = Instances.xhr;
    req.open("GET", updateURL, true);
    req.onload = Scriptish_hitch(this, "checkRemoteVersion", req, aCallback);
    req.onerror = Scriptish_hitch(this, "checkRemoteVersionErr", aCallback);
    req.send(null);	
  },
  checkRemoteVersion: function(req, aCallback) {
    if (4 > req.readyState) return;
    if (req.status != 200 && req.status != 0) return aCallback(this, false);
    var remoteVersion = Script.parseVersion(req.responseText);
    aCallback.call(this, !!(remoteVersion && Services.vc.compare(this.version, remoteVersion) < 0));
  },
  checkRemoteVersionErr: function(aCallback) aCallback(this, false),

  uninstall: function() {
    AddonManagerPrivate.callAddonListeners("onUninstalling", this, false);
    this.needsUninstall = true;
    this.pendingOperations = AddonManager.PENDING_UNINSTALL;
    AddonManagerPrivate.callAddonListeners("onUninstalled", this);
  },
  uninstallProcess: function() {
    this.removeSettings();
    this.removeFiles();
    this._changed("uninstall", null);
  },
  removeSettings: function() {
    if (Scriptish_prefRoot.getValue("uninstallPreferences")) {
      // Remove saved preferences
      Scriptish_prefRoot.remove(this.prefroot);
    }
  },
  removeFiles: function() {
    try {
      // watch out for cases like basedir="." and basedir="../scriptish_scripts"
      if (!this._basedirFile.equals(this._config._scriptDir)) {
        // if script has its own dir, remove the dir + contents
        this._basedirFile.remove(true);
      } else {
        // if script is in the root, just remove the file
        this._file.remove(false);
      }
    } catch (e) {}
  },

  cancelUninstall: function() {
    this.needsUninstall = false;
    delete this.pendingOperations;
    AddonManagerPrivate.callAddonListeners("onOperationCancelled", this);
  },

  matchesURL: function(aUrl) {
    function testI(regExp) { return regExp.test(aUrl); }
    function testII(aMatchPattern) { return aMatchPattern.doMatch(aUrl); }

    return (this._includeRegExps.some(testI) || this._matches.some(testII)) &&
        !this._excludeRegExps.some(testI);
  },

  _changed: function(aEvt, aData, aDontChg) {
    this._config._changed(this, aEvt, aData, aDontChg);
  },

  get id() {
    if (!this._id) this.id = this.name + "@" + this.namespace;
    return this._id;
  },
  set id(aId) {
    this._id = aId.replace(nonIdChars, ''); // remove unacceptable chars
  },
  get name() this._name,
  get namespace() this._namespace,
  get prefroot() { 
    if (!this._prefroot) this._prefroot = ["scriptvals.", this.id, "."].join("");
    return this._prefroot;
  },
  get creator() this._creator,
  get author() this._author,
  set author(aVal) {
    this._author = aVal;
    if (AddonManagerPrivate.AddonAuthor)
      this._creator = new AddonManagerPrivate.AddonAuthor(aVal);
    else
      this._creator = aVal;
  },
  get contributors() {
    if (!AddonManagerPrivate.AddonAuthor) return this._contributors;
    var contributors = [];
    for (var i = this._contributors.length-1; i >= 0; i--) {
      contributors.unshift(
          new AddonManagerPrivate.AddonAuthor(this._contributors[i]));
    }
    return contributors;
  },
  addContributor: function(aContributor) {
    if (!aContributor) return;
    this._contributors.push(aContributor);
  },
  get description() this._description,
  get version() this._version,
  get icon() this._icon,
  get iconURL() this._icon.fileURL,
  get enabled() this._enabled,
  set enabled(enabled) { this.userDisabled = !enabled; },
  get delay() this._delay,
  set delay(aNum) {
    let val = parseInt(aNum, 10);
    this._delay = ((val || val === 0) && val > 0) ? val : null;
  },

  get includes() this._includes.concat(),
  get excludes() this._excludes.concat(),
  get matches() this._matches.concat(),
  addInclude: function(aPattern) {
    if (!aPattern) return;
    this._includes.push(aPattern);
    this._includeRegExps.push(Scriptish_convert2RegExp(aPattern));
  },
  addExclude: function(aPattern) {
    if (!aPattern) return;
    this._excludes.push(aPattern);
    this._excludeRegExps.push(Scriptish_convert2RegExp(aPattern));
  },

  get requires() this._requires.concat(),
  get resources() this._resources.concat(),
  get noframes() this._noframes,
  get jsversion() this._jsversion || maxJSVer,
  get runAt() this["_run-at"] || defaultRunAt,
  useDelayedInjectors: function() {
    this.delayInjection = false;
    for (let [, injector] in Iterator(this.delayedInjectors)) injector(this);
    this.delayedInjectors = [];
  },

  get homepageURL() {
    var url = this._homepageURL;
    if (typeof url == "string" && "" != url) return url;
    url = this._downloadURL;
    if (typeof url != "string" || "" == url) return null;
    url = url.replace(/[\?#].*$/, "");
    // is the download URL a userscript.org url?
    if (/^(https?:\/\/userscripts\.org\/[^\?#]*\.user\.js)$/i.test(url)) {
      url = RegExp.$1
          .replace(/^https?:\/\/userscripts\.org\/scripts\/source\/(\d+)\.user\.js$/, "http://userscripts.org/scripts/show/$1")
          .replace(/^https?:\/\/userscripts\.org\/scripts\/version\/(\d+)\/\d+\.user\.js$/, "http://userscripts.org/scripts/show/$1");
      if (!/^https?:\/\/userscripts\.org\/scripts\/show\/\d+$/.test(url))
        return null;
    // is the download URL a gist.github.com url?
    } else if (/^https?:\/\/gist\.github\.com\/raw\/([\da-z]+)\/(?:[\da-z]{40}\/)?[^\/\?#\s]*\.user\.js$/i.test(url)) {
      url = "https://gist.github.com/"+RegExp.$1;
    // is the download URL a github.com url?
    } else if (/^https?:\/\/(?:cloud\.)?github\.com\/(?:downloads\/)?([^\/]+\/[^\/]+)\/.*\.user\.js$/.test(url)) {
      url = "https://github.com/"+RegExp.$1;
    }
    return this._homepageURL = url;
  },
  get updateURL() {
    if (!this.version) return null;
    if (Scriptish_prefRoot.getValue("useDownloadURLForUpdateURL"))
      var url = (this._updateURL || this._downloadURL || "");
    else
      var url = (this._updateURL || "");
    url = url.replace(/[\?#].*$/, "");
    // valid updateURL?
    if (!url || !url.match(/^https?:\/\//) || !url.match(/\.(?:user|meta)\.js$/i))
      return null;
    // userscripts.org url?
    if (url.match(/^https?:\/\/userscripts\.org\/.*\.user\.js$/i))
      return url.replace(/^http:/, "https:").replace(/\.user\.js$/i,".meta.js");
    // is url https?
    if (!url.match(/^https:\/\//)) return null;
    return url;
  },
  get cleanUpdateURL() (this.updateURL+"").replace(/\.meta\.js$/i, ".user.js"),
  get providesUpdatesSecurely() {
    var url = this.updateURL();
    if (!url || !url.match(/^https:\/\//)) return false;
    return true;
  },

  get _file() {
    var file = this._basedirFile;
    file.append(this._filename);
    return file;
  },
  get filename() this._filename,
  get editFile() this._file,

  get _basedirFile() {
    var file = this._config._scriptDir;
    file.append(this._basedir);
    file.normalize();
    return file;
  },

  get fileURL() Scriptish_getUriFromFile(this._file).spec,
  get textContent() Scriptish_getContents(this._file),

  get size() {
    var size = this._file.fileSize;
    for each (var r in this._requires) size += r._file.fileSize;
    for each (var r in this._resources) size += r._file.fileSize;
    return size;
  },

  get screenshots() this._screenshots,

  _initFileName: function(name, useExt) {
    var ext = "";
    name = name.toLowerCase();

    var dotIndex = name.lastIndexOf(".");
    if (dotIndex > 0 && useExt) {
      ext = name.substring(dotIndex + 1);
      name = name.substring(0, dotIndex);
    }

    name = name.replace(/[^-_A-Z0-9@]+/gi, "");
    ext = ext.replace(/\s+/g, "_").replace(/[^-_A-Z0-9]+/gi, "");

    // If no Latin characters found - use default
    if (!name) name = "user_script";
    if (ext) name += "." + ext;
    return name;
  },

  _initFile: function(tempFile) {
    var file = this._config._scriptDir;
    var name = this._initFileName(this.id, false);

    file.append(name);
    file.createUnique(Ci.nsIFile.DIRECTORY_TYPE, 0755);
    this._basedir = file.leafName;

    file.append(name + ".user.js");
    file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0644);
    this._filename = file.leafName;

    Scriptish_log("Moving script file from " + tempFile.path + " to " + file.path);

    file.remove(true);
    tempFile.moveTo(file.parent, file.leafName);
  },

  get urlToDownload() this._downloadURL,
  setDownloadedFile: function(file) { this._tempFile = file; },

  get previewURL() Services.io.newFileURI(this._tempFile).spec,

  isModified: function() {
    if (!this.fileExists()) return false;
    if (this._modified != this._file.lastModifiedTime) {
      this._modified = this._file.lastModifiedTime;
      return true;
    }
    return false;
  },

  fileExists: function() {
    try {
      return this._basedirFile.exists() || this._file.exists();
    } catch (e) {
      return false;
    }
  },

  replaceScriptWith: function(aNewScript) {
    this.removeFiles();
    this.updateFromNewScript(aNewScript.installProcess());

    // notification that update is complete
    var msg = "'" + this.name;
    if (this.version) msg += " " + this.version;
    msg += "' " + Scriptish_stringBundle("statusbar.updated");
    Scriptish_notification(msg, null, null, function() Scriptish_openManager());
    this.updateHelper();
    this._changed("update");
  },
  updateFromNewScript: function(newScript, scriptInjector) {
    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_sha1.js", tools);

    // Copy new values.
    this.updateAvailable = false;
    this._includes = newScript._includes;
    this._excludes = newScript._excludes;
    this._includeRegExps = newScript._includeRegExps;
    this._excludeRegExps = newScript._excludeRegExps;
    this._matches = newScript._matches;
    this._delay = newScript._delay;
    this._screenshots = newScript._screenshots;
    this._homepageURL = newScript.homepageURL;
    this._updateURL = newScript._updateURL;
    this._name = newScript._name;
    this._namespace = newScript._namespace;
    this.author = newScript._author;
    this._contributors = newScript._contributors;
    this._description = newScript._description;
    this._jsversion = newScript._jsversion;
    this["_run-at"] = newScript.runAt;
    this._noframes = newScript._noframes;
    this._version = newScript._version;

    if (!scriptInjector) {
      this._file = newScript._file;
      this._basedir = newScript._basedir;
      this._filename = newScript._filename;
      this._icon = newScript._icon;
      this._requires = newScript._requires;
      this._resources = newScript._resources;
      this._modified = newScript._modified;
      this._dependhash = newScript._dependhash;
      if (newScript._downloadURL) this._downloadURL = newScript._downloadURL;
    } else {
      var dependhash = tools.Scriptish_sha1(newScript._rawMeta);
      if (dependhash != this._dependhash && !newScript._dependFail) {
        this._dependhash = dependhash;
        this._icon = newScript._icon;
        this._requires = newScript._requires;
        this._resources = newScript._resources;

        // Get rid of old dependencies.
        var dirFiles = this._basedirFile.directoryEntries;
        while (dirFiles.hasMoreElements()) {
          var nextFile = dirFiles.getNext()
              .QueryInterface(Ci.nsIFile);
          if (!nextFile.equals(this._file)) nextFile.remove(true);
        }

        // This flag needs to be set now so the scriptDownloader can turn it off
        this.delayInjection = true;
        this.delayedInjectors.push(scriptInjector);

        Cu.import("resource://scriptish/config/configdownloader.js", tools);
        // Redownload dependencies.
        tools.Scriptish_configDownloader.refetchDependencies(this);
      }
      this.modificationProcess();
    }
  },

  createXMLNode: function(doc) {
    var scriptNode = doc.createElement("Script");
    var len;

    for (var j = 0; j < this.contributors.length; j++) {
      var contributorNode = doc.createElement("Contributor");
      contributorNode.appendChild(doc.createTextNode(this.contributors[j]));
      scriptNode.appendChild(doc.createTextNode("\n\t\t"));
      scriptNode.appendChild(contributorNode);
    }

    for (var j = 0; j < this._includes.length; j++) {
      var includeNode = doc.createElement("Include");
      includeNode.appendChild(doc.createTextNode(this._includes[j]));
      scriptNode.appendChild(doc.createTextNode("\n\t\t"));
      scriptNode.appendChild(includeNode);
    }

    for (var j = 0; j < this._excludes.length; j++) {
      var excludeNode = doc.createElement("Exclude");
      excludeNode.appendChild(doc.createTextNode(this._excludes[j]));
      scriptNode.appendChild(doc.createTextNode("\n\t\t"));
      scriptNode.appendChild(excludeNode);
    }

    for (var j = 0; j < this._matches.length; j++) {
      var matchNode = doc.createElement("Match");
      matchNode.appendChild(doc.createTextNode(this._matches[j].pattern));
      scriptNode.appendChild(doc.createTextNode("\n\t\t"));
      scriptNode.appendChild(matchNode);
    }

    len = this._screenshots.length;
    for (var j = 0; j < len; j++) {
      var screenshotNode = doc.createElement("Screenshot");
      var screenshot = this._screenshots[j];
      screenshotNode.appendChild(doc.createTextNode(screenshot.url));
      if (screenshot.thumbnailURL)
        screenshotNode.setAttribute("thumb", screenshot.thumbnailURL);
      scriptNode.appendChild(doc.createTextNode("\n\t\t"));
      scriptNode.appendChild(screenshotNode);
    }

    for (var j = 0; j < this._requires.length; j++) {
      var req = this._requires[j];
      var resourceNode = doc.createElement("Require");
      resourceNode.setAttribute("filename", req._filename);
      scriptNode.appendChild(doc.createTextNode("\n\t\t"));
      scriptNode.appendChild(resourceNode);
    }

    for (var j = 0; j < this._resources.length; j++) {
      var imp = this._resources[j];
      var resourceNode = doc.createElement("Resource");

      resourceNode.setAttribute("name", imp._name);
      resourceNode.setAttribute("filename", imp._filename);
      resourceNode.setAttribute("mimetype", imp._mimetype);
      if (imp._charset) {
        resourceNode.setAttribute("charset", imp._charset);
      }

      scriptNode.appendChild(doc.createTextNode("\n\t\t"));
      scriptNode.appendChild(resourceNode);
    }

    if (this._noframes) {
      scriptNode.appendChild(doc.createTextNode("\n\t\t"));
      scriptNode.appendChild(doc.createElement("Noframes"));
    }

    scriptNode.appendChild(doc.createTextNode("\n\t"));

    scriptNode.setAttribute("filename", this._filename);
    scriptNode.setAttribute("id", this.id);
    scriptNode.setAttribute("name", this.name);
    scriptNode.setAttribute("namespace", this.namespace);
    scriptNode.setAttribute("author", this._author);
    scriptNode.setAttribute("description", this._description);
    scriptNode.setAttribute("version", this._version);
    scriptNode.setAttribute("delay", this._delay);
    scriptNode.setAttribute("icon", this.icon.filename);
    scriptNode.setAttribute("enabled", this._enabled);
    scriptNode.setAttribute("basedir", this._basedir);
    scriptNode.setAttribute("modified", this._modified);
    scriptNode.setAttribute("dependhash", this._dependhash);
    if (this._jsversion) scriptNode.setAttribute("jsversion", this._jsversion);
    if (this["_run-at"]) scriptNode.setAttribute("run-at", this["_run-at"]);

    if (this.homepageURL)
      scriptNode.setAttribute("homepageURL", this.homepageURL);
    if (this._downloadURL)
      scriptNode.setAttribute("downloadURL", this._downloadURL);
    if (this._updateURL)
      scriptNode.setAttribute("updateURL", this._updateURL);

    return scriptNode;
  },

  installProcess: function() {
    this._initFile(this._tempFile);
    this._tempFile = null;

    if (this.icon.hasDownloadURL())
      this.icon._initFile();

    for (var i = 0; i < this._requires.length; i++)
      this._requires[i]._initFile();

    for (var i = 0; i < this._resources.length; i++)
      this._resources[i]._initFile();

    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_sha1.js", tools);

    if (Services.pbs.privateBrowsingEnabled) this._downloadURL = null;

    this._modified = this._file.lastModifiedTime;
    this._dependhash = tools.Scriptish_sha1(this._rawMeta);
    return this;
  },

  updateHelper: function () {
    AddonManagerPrivate.callAddonListeners("onUninstalled", this);
    AddonManagerPrivate.callInstallListeners(
        "onExternalInstall", null, this, null, false);
  },
  modificationProcess: function() {
    // notification that modification is complete
    var msg = "'" + this.name;
    if (this.version) msg += " " + this.version;
    msg += "' " + Scriptish_stringBundle("statusbar.modified");
    Scriptish_notification(msg, null, null, function() Scriptish_openManager());

    this.updateHelper();
    this._changed("modified", null, true);
  }
};

Script.parseVersion = function Script_parseVersion(aSrc) {
  var lines = aSrc.match(/\s*\/\/ [=@].*/g);
  var lnIdx = 0;
  var result = {};
  var foundMeta = false;
  var start = "// ==UserScript==";
  var end = "// ==/UserScript==";
  var version = /\/\/ \@version\s+([^\s]+)/;

  while ((result = lines[lnIdx++])) {
    if (result.indexOf(start) != 0) continue;
    foundMeta = true;
    break;
  }
  if (!foundMeta) return;
  while ((result = lines[lnIdx++])) {
    if (result.indexOf(end) == 0) break;
    var match = result.match(version);
    if (match !== null) return match[1];
  }
  return null;
}

Script.parse = function Script_parse(aConfig, aSource, aURI, aUpdateScript) {
  var script = new Script(aConfig);

  if (aURI && !Services.pbs.privateBrowsingEnabled)
    script._downloadURL = aURI.spec;

  // read one line at a time looking for start meta delimiter or EOF
  var lines = aSource.match(metaRegExp);
  var i = 0;
  var result;
  var foundMeta = false;

  // used for duplicate resource name detection
  var previousResourceNames = {};
  script._rawMeta = "";

  if (!lines) lines = [""];
  while (result = lines[i++]) {
    if (!foundMeta) {
      if (result.indexOf("// ==UserScript==") == 0) foundMeta = true;
      continue;
    }

    if (result.indexOf("// ==/UserScript==") == 0) {
      // done gathering up meta lines
      break;
    }

    var match = result.match(/\/\/ \@(\S+)(?:\s+([^\r\f\n]+))?/);
    if (match === null) continue;
    var header = match[1].toLowerCase();
    var value = match[2];

    if (!value) {
      switch (header) {
        case "noframes":
          script["_noframes"] = true;
          continue;
      }
    } else {
      value = value.trimRight();
      switch (header) {
        case "id":
          script.id = value;
          continue;
        case "author":
          !script.author && (script.author = value);
          continue;
        case "name":
        case "namespace":
        case "description":
        case "version":
          script["_" + header] = value;
          continue;
        case "delay":
          script.delay = value;
          continue;
        case "updateurl":
          if (value.match(/^https?:\/\//)) script._updateURL = value;
          continue;
        case "injectframes":
          if (value != "0") continue;
          script["_noframes"] = true;
          continue;
        case "website":
        case "homepage":
        case "homepageurl":
          script._homepageURL = value;
          continue;
        case "jsversion":
          let jsVerIndx = JSVersions.indexOf(value);
          if (-1 === jsVerIndx) {
            throw new Error("'" + value + "' is an invalid value for @jsversion");
          } else if (jsVerIndx > JSVersions.indexOf(maxJSVer)) {
            throw new Error("The @jsversion value '" + value + "' is not "
                + "supported by this version of Firefox.");
          } else {
            script._jsversion = JSVersions[jsVerIndx];
          }
          continue;
        case "run-at":
          let runAtIndx = runAtValues.indexOf(value);
          if (0 > runAtIndx)
            throw new Error("'" + value + "' is an invalid value for @run-at");
          script["_run-at"] = runAtValues[runAtIndx];
          continue;
        case "contributor":
          script.addContributor(value);
          continue;
        case "include":
          script.addInclude(value);
          continue;
        case "exclude":
          script.addExclude(value);
          continue;
        case "match":
          script._matches.push(new MatchPattern(value));
          continue;
        case 'screenshot':
          if (!AddonManagerPrivate.AddonScreenshot) continue;
          var splitValue = value.match(valueSplitter);
          if (splitValue) {
            script._screenshots.push(new AddonManagerPrivate.AddonScreenshot(
                splitValue[1], splitValue[2]));
          } else {
            script._screenshots.push(new AddonManagerPrivate.AddonScreenshot(
                value));
          }
          continue;
        case "defaulticon":
        case "icon":
        case "iconurl":
          try {
            script.icon.setIcon(value, aURI);
          } catch (e) {
            if (!aUpdateScript) throw e;
            script._dependFail = true;
            continue;
          }
          script._rawMeta += header + '\0' + value + '\0';
          continue;
        case "require":
          try {
            var reqUri = NetUtil.newURI(value, null, aURI);
            var scriptRequire = new ScriptRequire(script);
            scriptRequire._downloadURL = reqUri.spec;
            script._requires.push(scriptRequire);
            script._rawMeta += header + '\0' + value + '\0';
          } catch (e) {
            if (aUpdateScript) {
              script._dependFail = true;
            } else {
              throw new Error('Failed to @require '+ value);
            }
          }
          continue;
        case "resource":
          var res = value.match(valueSplitter);
          if (res === null) {
            // NOTE: Unlocalized strings
            throw new Error("Invalid syntax for @resource declaration '" +
                            value + "'. Resources are declared like: " +
                            "@resource <name> <url>.");
          }
          var resName = res[1];
          if (previousResourceNames[resName]) {
            throw new Error("Duplicate resource name '" + resName + "' " +
                            "detected. Each resource must have a unique " +
                            "name.");
          } else {
            previousResourceNames[resName] = true;
          }
          try {
            var resUri = NetUtil.newURI(res[2], null, aURI);
            var scriptResource = new ScriptResource(script);
            scriptResource._name = resName;
            scriptResource._downloadURL = resUri.spec;
            script._resources.push(scriptResource);
            script._rawMeta +=
                header + '\0' + resName + '\0' + resUri.spec + '\0';
          } catch (e) {
            if (aUpdateScript) {
              script._dependFail = true;
            } else {
              throw new Error(
                  'Failed to get @resource '+ resName +' from '+ res[2]);
            }
          }
          continue;
      }
    }
  }

  // if no meta info, default to reasonable values
  if (!script._name && aURI) {
    script._name = Scriptish_parseScriptName(
        (aUpdateScript && aUpdateScript.filename) || (aURI && aURI.spec));
  }
  if (!script._namespace && script._downloadURL)
    script._namespace = aURI.host;
  if (!script._description) script._description = "";
  if (!script._version) script._version = "";

  return script;
};

Script.load = function load(aConfig, aNode) {
  var script = new Script(aConfig);
  var fileModified = false;

  script._filename = aNode.getAttribute("filename");
  script._basedir = aNode.getAttribute("basedir") || ".";
  script._downloadURL = aNode.getAttribute("downloadURL")
      || aNode.getAttribute("installurl") || null;
  script._updateURL = aNode.getAttribute("updateURL") || null;
  script._homepageURL = aNode.getAttribute("homepageURL")
      || aNode.getAttribute("homepage") || null;
  script._jsversion = aNode.getAttribute("jsversion") || null;
  script["_run-at"] = aNode.getAttribute("run-at") || null;

  if (!script.fileExists()) {
    script.uninstallProcess();
    return true;
  }

  if (!aNode.hasAttribute("modified")
      || !aNode.hasAttribute("dependhash")
      || !aNode.hasAttribute("version")) {
    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_sha1.js", tools);

    script._modified = script._file.lastModifiedTime;
    var parsedScript = Script.parse(
        aConfig, Scriptish_getContents(script._file), 
        script._downloadURL && NetUtil.newURI(script._downloadURL),
        script);
    script._dependhash = tools.Scriptish_sha1(parsedScript._rawMeta);
    script._version = parsedScript._version;
    fileModified = true;
  } else {
    script._modified = aNode.getAttribute("modified");
    script._dependhash = aNode.getAttribute("dependhash");
    script._version = aNode.getAttribute("version");
  }

  for (var i = 0, childNode; childNode = aNode.childNodes[i]; i++) {
    switch (childNode.nodeName) {
      case "Contributor":
        script.addContributor(childNode.firstChild.nodeValue.trim());
        break;
      case "Include":
        script.addInclude(childNode.firstChild.nodeValue.trim());
        break;
      case "Exclude":
        script.addExclude(childNode.firstChild.nodeValue.trim());
        break;
      case "Match":
        script._matches.push(new MatchPattern(childNode.firstChild.nodeValue.trim()));
        break;
      case "Require":
        var scriptRequire = new ScriptRequire(script);
        scriptRequire._filename = childNode.getAttribute("filename");
        script._requires.push(scriptRequire);
        break;
      case "Resource":
        var scriptResource = new ScriptResource(script);
        scriptResource._name = childNode.getAttribute("name");
        scriptResource._filename = childNode.getAttribute("filename");
        scriptResource._mimetype = childNode.getAttribute("mimetype");
        scriptResource._charset = childNode.getAttribute("charset");
        script._resources.push(scriptResource);
        break;
      case "Screenshot":
        var thumb = "";
        if (childNode.hasAttribute("thumb"))
          thumb = childNode.getAttribute("thumb");
        script._screenshots.push(new AddonManagerPrivate.AddonScreenshot(
            childNode.firstChild.nodeValue.trim(), thumb));
        break;
      case "Noframes":
        script["_" + childNode.nodeName.toLowerCase()] = true;
        break;
    }
  }

  script._id = aNode.getAttribute("id") || null;
  script._name = aNode.getAttribute("name");
  script._namespace = aNode.getAttribute("namespace");
  script.author = aNode.getAttribute("author");
  script._description = aNode.getAttribute("description");
  script.icon.fileURL = aNode.getAttribute("icon");
  script._enabled = aNode.getAttribute("enabled") == true.toString();
  script.delay = aNode.getAttribute("delay");

  aConfig.addScript(script);
  return fileModified;
};
