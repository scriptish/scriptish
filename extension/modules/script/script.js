var EXPORTED_SYMBOLS = ["Script"];

const valueSplitter = /(\S+)(?:\s+([^\r\f\n]+))?/;

const Cu = Components.utils;
Cu.import("resource://gre/modules/CertUtils.jsm");
Cu.import("resource://scriptish/constants.js");
lazyImport(this, "resource://scriptish/prefmanager.js", ["Scriptish_prefRoot"]);
lazyImport(this, "resource://scriptish/logging.js", ["Scriptish_log", "Scriptish_logError"]);
lazyImport(this, "resource://scriptish/scriptish.js", ["Scriptish"]);
lazyImport(this, "resource://scriptish/script/cachedresource.js", ["CachedResource"]);
lazyImport(this, "resource://scriptish/utils/PatternCollection.js", ["PatternCollection"]);
lazyImport(this, "resource://scriptish/script/scriptinstaller.js", ["ScriptInstall"]);
lazyImport(this, "resource://scriptish/script/scripticon.js", ["ScriptIcon"]);
lazyImport(this, "resource://scriptish/script/scriptrequire.js", ["ScriptRequire"]);
lazyImport(this, "resource://scriptish/script/scriptresource.js", ["ScriptResource"]);
lazyImport(this, "resource://scriptish/third-party/MatchPattern.js", ["MatchPattern"]);
lazyImport(this, "resource://scriptish/config/configdownloader.js", ["Scriptish_configDownloader"]);
lazyImport(this, "resource://gre/modules/AddonManager.jsm", ["AddonManager", "AddonManagerPrivate"]);

lazyUtil(this, "getUriFromFile");
lazyUtil(this, "getContents");
lazyUtil(this, "memoize");
lazyUtil(this, "stringBundle");

const metaRegExp = /\/\/[ \t]*(?:==\/?UserScript==|\@\S+(?:[ \t]+(?:[^\r\f\n]+))?)/g;
const nonIdChars = /[^\w@\.\-_]+/g; // any char matched by this is not valid
const JSVersions = ['1.6', '1.7', '1.8', '1.8.1'];
const maxJSVer = JSVersions[2];
const runAtValues = ["document-start", "document-end", "document-idle", "window-load"];
const defaultRunAt = runAtValues[1];
const defaultAutoUpdateState = AddonManager.AUTOUPDATE_DISABLE;
const usoURLChk = /^https?:\/\/userscripts\.org\/scripts\/[^\d]+(\d+)/i;
const RE_USERSCRIPT_HEADER_START = /\/\/[ \t]*==UserScript==/i;
const RE_USERSCRIPT_HEADER_END = /\/\/[ \t]*==\/UserScript==/i;

function noUpdateFound(aListener, aReason) {
  if (aListener.onNoUpdateAvailable)
    aListener.onNoUpdateAvailable(this);
  if (aListener.onUpdateFinished)
    aListener.onUpdateFinished(this, aReason || AddonManager.UPDATE_STATUS_NO_ERROR);
}
function updateFound(aListener, aReason) {
  var AddonInstall = new ScriptInstall(this);
  this.updateAvailable = AddonInstall;
  AddonManagerPrivate.callAddonListeners("onNewInstall", AddonInstall);
  aListener.onUpdateAvailable(this, AddonInstall);
  if (aListener.onUpdateFinished)
    aListener.onUpdateFinished(this, AddonManager.UPDATE_STATUS_NO_ERROR);
}

// Implements https://developer.mozilla.org/en/Addons/Add-on_Manager/Addon
function Script(config) {
  this._config = config;
  this._observers = [];

  this._homepageURL = null;
  this._contributionURL = null;
  this._contributionAmount = null;
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
  this._applyBackgroundUpdates = defaultAutoUpdateState;
  this._developers = [];
  this._contributors = [];
  this._description = null;
  this._version = null;
  this._icon = new ScriptIcon(this);
  this._icon64 = new ScriptIcon(this);
  this._enabled = true;
  this.needsUninstall = false;
  this.domains = [];
  this._includes = new PatternCollection();
  this._excludes = new PatternCollection();
  this._matches = [];
  this._user_includes = new PatternCollection();
  this._user_excludes = new PatternCollection();
  this._delay = null;
  this.priority = 0;
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
  __proto__: CachedResource.prototype,
  includesDisabled: false,
  isCompatible: true,
  blocklistState: Ci.nsIBlocklistService.STATE_NOT_BLOCKED,
  get blocked() (this.blocklistState === Ci.nsIBlocklistService.STATE_NOT_BLOCKED)
      ? false : true,
  set blocked(aVal) {
    if (aVal) {
      this.blocklistState = Ci.nsIBlocklistService.STATE_BLOCKED;
      return this.enabled = false;
    }

    if (this.blocked) this.enabled = false;
    this.blocklistState = Ci.nsIBlocklistService.STATE_NOT_BLOCKED;
    return false;
  },
  doBlockCheck: function() {
    let uri;

    // check homepage url
    try {
      uri = NetUtil.newURI(this.homepageURL);
    } catch (e) {}
    if (uri && this._config.isBlocked(uri))
      return this.blocked = true;

    // check update url
    try {
      uri = NetUtil.newURI(this.updateURL);
    } catch (e) {}
    if (uri && this._config.isBlocked(uri))
        return this.blocked = true;

    delete this["blocklistState"];
    return false;
  },
  appDisabled: false,
  scope: AddonManager.SCOPE_PROFILE,
  get applyBackgroundUpdates() this._applyBackgroundUpdates,
  set applyBackgroundUpdates(aVal) {
    this._applyBackgroundUpdates = aVal;
    Scriptish.notify(null, "scriptish-script-prefs-change", {
      saved: true
    });
  },
  operationsRequiringRestart: AddonManager.OP_NEEDS_RESTART_NONE,
  get isActive() !this.userDisabled,
  pendingOperations: AddonManager.PENDING_NONE,
  type: "userscript",
  isUSOScript: function() {
    try {
      return usoURLChk.test(this._downloadURL)
          || usoURLChk.test(this._homepageURL)
          || usoURLChk.test(this._updateURL);
    } catch (e) {
      return false;
    }
  },
  /*averageRating: undefined,
  reviewCount: undefined,
  totalDownloads: undefined,*/
  get reviewURL() ((this.isUSOScript()) ? "http://userscripts.org/scripts/reviews/" + RegExp.$1 : ""),
  get sourceURI () this._downloadURL && NetUtil.newURI(this._downloadURL),
  get userDisabled() !this.enabled,
  set userDisabled(val) {
    if (this.blocked) return true;
    val = !!val;
    if (val === this.userDisabled) return val;

    var enabling = !val;
    Scriptish.notify(this, "scriptish-script-edit-enabling", {enabling: enabling});

    Scriptish.notify(this, "scriptish-script-edit-enabled", {
      enabling: (this._enabled = enabling),
      saved: true
    });

    return val;
  },

  isCompatibleWith: function() true,
  get permissions() {
    var perms = AddonManager.PERM_CAN_UNINSTALL;
    perms |= this.userDisabled ? AddonManager.PERM_CAN_ENABLE : AddonManager.PERM_CAN_DISABLE;
    if (this.updateURL) perms |= AddonManager.PERM_CAN_UPGRADE;
    return perms;
  },

  get updateDate () new Date(parseInt(this._modified)),

  updateUSOData: function() {
    if (this.blocked || !this.isUSOScript()) return;
    var script = this;
    var scriptID = RegExp.$1;
    var metaURL = "http://userscripts.org/scripts/source/" + scriptID + ".meta.js";
    var req = Instances.xhr;
    req.overrideMimeType("text/plain");
    req.open("GET", metaURL, true);
    req.channel.loadFlags |= Ci.nsIRequest.LOAD_BYPASS_CACHE; // bypass cache
    req.onload = function() {
      if (4 > req.readyState || (req.status != 200 && req.status != 0)
          || !req.responseText)
        return;
      var data = Script.header_parse(req.responseText);
      if (!data["uso:rating"] || !data["uso:script"] || data["uso:script"][0] != scriptID
          || !data["uso:reviews"] || !data["uso:installs"])
        return;
      script.reviewCount = data["uso:reviews"][0] * 1;
      script.averageRating = data["uso:rating"][0] * 1;
      script.totalDownloads = data["uso:installs"][0] * 1;

      Scriptish.notify(null, "scriptish-config-saved", null);
    }
    req.send(null);
  },

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

    this.checkForRemoteUpdate(function(aUpdate, aReason) {
      if (!aUpdate) return noUpdateFound.call(this, aListener, aReason);
      updateFound.call(this, aListener);
    });
  },
  checkForRemoteUpdate: function(aCallback) {
    var updateURL = this.updateURL;
    if (this.blocked || !updateURL) return aCallback.call(this, false);
    var req = Instances.xhr;
    req.open("GET", updateURL, true);
    req.channel.loadFlags |= Ci.nsIRequest.LOAD_BYPASS_CACHE; // bypass cache
    // suppress "bad certificate" dialogs and fail on redirects from a bad certificate.
    req.channel.notificationCallbacks =
        new BadCertHandler(!Scriptish.updateSecurely || !Scriptish_prefRoot.getValue("update.requireBuiltInCerts"));
    req.onload = this.checkRemoteVersion.bind(this, req, aCallback);
    req.onerror = this.checkRemoteVersionErr.bind(this, aCallback);
    req.send(null);
  },
  checkRemoteVersion: function(req, aCallback) {
    if (4 > req.readyState) return;
    if (req.status != 200 && req.status != 0)
      return aCallback.call(this, false, AddonManager.UPDATE_STATUS_DOWNLOAD_ERROR);

    // make sure that the final URI is a https url
    if (Scriptish.updateSecurely && "https" != req.channel.URI.scheme)
      return aCallback.call(this, false, AddonManager.UPDATE_STATUS_SECURITY_ERROR);

    // make sure that the final URI's certificate is valid
    if (Scriptish.updateSecurely) {
      try {
        checkCert(req.channel, !Scriptish_prefRoot.getValue("update.requireBuiltInCerts"));
      }
      catch (e) {
        return aCallback.call(this, false, AddonManager.UPDATE_STATUS_SECURITY_ERROR);
      }
    }

    // parse the version
    var remoteVersion = Script.parseVersion(req.responseText);
    if (!remoteVersion)
      return aCallback.call(this, false, AddonManager.UPDATE_STATUS_PARSE_ERROR);

    aCallback.call(this, !!(Services.vc.compare(this.version, remoteVersion) < 0));
  },
  checkRemoteVersionErr: function(aCallback, aErr) (
    aCallback.call(this, false, AddonManager.UPDATE_STATUS_DOWNLOAD_ERROR)),

  uninstall: function() {
    Scriptish.notify(this, "scriptish-script-uninstalling");
    this.needsUninstall = true;
    this.pendingOperations = AddonManager.PENDING_UNINSTALL;
    Scriptish.notify(this, "scriptish-script-uninstalled");
  },
  uninstallProcess: function() {
    this.removeSettings();
    this.removeFiles();
    Scriptish.notify(this, "scriptish-script-removed");
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

  matchesDomain: function(aURL) {
    try {
      var host = NetUtil.newURI(aURL).host;
    } catch (e) {
      // If true, we're allowing a scheme that doesn't have a host.
      // i.e. "about:scriptish"
      return Scriptish.isGreasemonkeyable(aURL);
    }

    var i = this.domains.length - 1;
    if (!~i) return true; // when there are no @domains, then allow the host
    for (; ~i; i--) if (host == this.domains[i]) return true;
    return false;
  },

  matchesURL: null,
  _matchesURL_noincludes: function(aURL) {
    // check if the domain is ok
    if (!this.matchesDomain(aURL)) return false;

    return this._user_includes.test(aURL)
        && !this._user_excludes.test(aURL);
  },
  _matchesURL_includes: function(aURL) {
    // check if the domain is ok
    if (!this.matchesDomain(aURL)) return false;

    return (this._all_includes.test(aURL)
      || this._matches.some(function(m) m.doMatch(aURL)))
      && !this._all_excludes.test(aURL);
  },

  _make_matchesURL: function() {
    if (this.includesDisabled) {
      this.matchesURL = this._matchesURL_noincludes.bind(this);
    }
    else {
      this.matchesURL = this._matchesURL_includes.bind(this);
    }
    this.matchesURL = Scriptish_memoize(this.matchesURL, 100);
  },
  get id() {
    if (!this._id) this.id = this.name + "@" + this.namespace;
    return this._id;
  },
  set id(aId) {
    this._id = aId.replace(nonIdChars, ''); // remove unacceptable chars
  },
  get name() this._name || Scriptish_stringBundle("untitledScript"),
  get namespace() this._namespace,
  get prefroot() {
    if (!this._prefroot) this._prefroot = ["scriptvals.", this.id, "."].join("");
    return this._prefroot;
  },
  get creator() this._creator,
  get author() this._author,
  set author(aVal) {
    if (aVal == null) {
      this._author = this._creator = null;
      return;
    }
    this._author = aVal.trim();
    if (AddonManagerPrivate.AddonAuthor) {
      let author = this._author.match(/((?:[^;<h]|h[^t]|ht[^t]|htt[^p]|http[^:]|http:[^\/]|http:\/[^\/])+)[;<]?(?:\s*<?([^<>@\s;]+@[^<>@\s;]+)(?:[>;];?)?)?(?:\s*(https?:\/\/[^\s;]*))?/i);
      if (author && author[3]) {
        author = (author[1] || this._author).trim();
        try {
          var uri = NetUtil.newURI(RegExp.$3);
          this._creator = new AddonManagerPrivate.AddonAuthor(author, uri.spec);
        } catch (e) {
          this._creator = new AddonManagerPrivate.AddonAuthor(author);
        }
      } else {
        this._creator = new AddonManagerPrivate.AddonAuthor(this._author);
      }
    } else {
      this._creator = this._author;
    }
  },
  get developers() {
    var devs = this._developers;
    if (!AddonManagerPrivate.AddonAuthor) return devs;
    var ary = [];
    for (var i = devs.length-1; ~i; i--)
      ary.unshift(new AddonManagerPrivate.AddonAuthor(devs[i]));
    return ary;
  },
  get contributors() {
    var contribs = this._contributors;
    if (!AddonManagerPrivate.AddonAuthor) return contribs;
    var ary = [];
    for (var i = contribs.length-1; ~i; i--)
      ary.unshift(new AddonManagerPrivate.AddonAuthor(contribs[i]));
    return ary;
  },
  addDeveloper: function(aVal) {
    if (!aVal) return;
    this._developers.push(aVal);
  },
  addContributor: function(aContributor) {
    if (!aContributor) return;
    this._contributors.push(aContributor);
  },
  get description() this._description,
  get version() this._version,
  get optionsURL() {
    if (this.enabled)
      return "chrome://scriptish/content/script-options.xul?id=" + this.id;
    return null;
  },
  get icon() this._icon,
  set icon(aIcon) this._icon = aIcon,
  get icon64() this._icon64,
  set icon64(aIcon) this._icon64 = aIcon,
  get iconURL() this._icon.fileURL,
  get icon64URL() {
    let url = this._icon64.fileURL;
    if (this.icon.DEFAULT_ICON_URL == url)
      return this.iconURL;
    return url;
  },
  get enabled() !this.blocked && this._enabled,
  set enabled(enabled) !(this.userDisabled = !enabled),
  get delay() this._delay,
  set delay(aNum) {
    let val = parseInt(aNum, 10);
    this._delay = ((val || val === 0) && val > 0) ? val : null;
  },

  get includes() this._includes.patterns,
  get excludes() this._excludes.patterns,
  get user_includes() this._user_includes.patterns,
  get user_excludes() this._user_excludes.patterns,
  getUserIncStr: function(type) this["_user_" + (type || "include") + "s"].patterns.join("\n"),
  set user_includes(aPatterns) {
    this._user_includes.clear();
    this.addInclude(aPatterns, true);
  },
  set user_excludes(aPatterns) {
    this._user_excludes.clear();
    this.addExclude(aPatterns, true)
  },
  get matches() this._matches.concat(),
  addInclude: function(aPattern, aUserVal) {
    this[aUserVal ? "_user_includes" : "_includes"].addPatterns(aPattern);
    this.__all_includes = null;
  },
  addExclude: function(aPattern, aUserVal) {
    this[aUserVal ? "_user_excludes" : "_excludes"].addPatterns(aPattern);
    this.__all_excludes = null;
  },
  get _all_includes() {
    if (!this.__all_includes) {
      this.__all_includes = new PatternCollection();
      this.__all_includes.addPatterns(this._includes.patterns);
      this.__all_includes.addPatterns(this._user_includes.patterns);
    }
    return this.__all_includes;
  },
  get _all_excludes() {
    if (!this.__all_excludes) {
      this.__all_excludes = new PatternCollection();
      this.__all_excludes.addPatterns(this._excludes.patterns);
      this.__all_excludes.addPatterns(this._user_excludes.patterns);
    }
    return this.__all_excludes;
  },
  get requires() this._requires.concat(),
  get resources() this._resources.concat(),
  get noframes() this._noframes,
  get jsversion() this._jsversion || maxJSVer,
  get runAt() this["_run-at"] || defaultRunAt,
  useDelayedInjectors: function() {
    this.delayInjection = false;
    Scriptish.notify(this, "scriptish-script-modified", {saved: true, reloadUI: true});
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

  get contributionURL() this._contributionURL,
  get contributionAmount() this._contributionAmount,

  supportURL: "",

  get updateURL() {
    if (!this.version) return null;
    if (Scriptish_prefRoot.getValue("useDownloadURLForUpdateURL"))
      var url = (this._updateURL || this._downloadURL || "");
    else
      var url = (this._updateURL || "");
    url = url.replace(/[\?#].*$/, "");
    // valid updateURL?
    if (!url || !/^https?:\/\//i.test(url) || !/\.(?:user|meta)\.js$/i.test(url))
      return null;
    // userscripts.org url?
    if (/^https?:\/\/userscripts\.org\/.*?\.(?:user|meta)\.js$/i.test(url)) {
      if (Scriptish.updateSecurely) url = url.replace(/^http:/i, "https:");
      return url.replace(/\.user\.js$/i, ".meta.js");
    }
    return (!Scriptish.updateSecurely || /^https:/i.test(url)) ? url : null;
  },
  get cleanUpdateURL() (this.updateURL+"").replace(/\.meta\.js$/i, ".user.js"),
  get providesUpdatesSecurely() {
    let url = this.updateURL;
    if (!url) return false;
    try {
      var uri = NetUtil.newURI(url);
    } catch (e) {
      return false;
    }
    return !Scriptish.updateSecurely || "https" == uri.scheme;
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

  get size() {
    if (!this._size) {
      var size = this._file.fileSize;
      for each (var r in this._requires) size += r._file.fileSize;
      for each (var r in this._resources) size += r._file.fileSize;
      this._size = size;
    }
    return this._size;
  },

  getScriptHeader: function(aKey) {
    // TODO: cache headers and clear cache when the script is modified..
    var headers = Script.header_parse(Scriptish_getContents(this._tempFile || this._file));
    return aKey ? headers[aKey] : headers;
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

    Scriptish_log(Scriptish_stringBundle("moving.script") + " "
        + tempFile.path + " --> " + file.path);

    file.remove(true);
    tempFile.moveTo(file.parent, file.leafName);
  },

  get urlToDownload() this._downloadURL,
  setDownloadedFile: function(file) { this._tempFile = file; },

  get previewURL() Services.io.newFileURI(this._tempFile).spec,

  isModified: function() {
    let now = Date.now();
    if (now - this._isModified_lastcheck < 1000) {
      // prevent thrashing by stat requests
      // it can be safely assumed, that a user does not usually change a script
      // and reload a website more often than once in a second
      return false;
    }
    this._isModified_lastcheck = now;

    try {
      let lmt = this._file.lastModifiedTime;
      if (this._modified != lmt) {
        this._modified = lmt;

        // drop the precomputed size
        this._size = 0;

        return true;
      }
    }
    catch (ex) {
      if (!this.fileExists()) {
        this.uninstall();
      }
    }
    return false;
  },

  fileExists: function() {
    try {
      return this._file.exists();
    } catch (e) {
      return false;
    }
  },

  update: function() {
    this.clearResourceCaches();
    this._make_matchesURL();
  },

  replaceScriptWith: function(aNewScript) {
    this.removeFiles();
    this.updateFromNewScript(aNewScript.installProcess());
    Scriptish.notify(
        this, "scriptish-script-updated", {saved: true, reloadUI: true});
  },

  updateFromNewScript: function(newScript, scriptInjector) {
    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_cryptoHash.js", tools);
    var oldPriority = this.priority;
    var newPriority = newScript.priority;

    // Copy new values.
    this.blocked = newScript.blocked;
    this.domains = newScript.domains;
    this._includes = newScript._includes;
    this._excludes = newScript._excludes;
    delete this.__all_includes;
    delete this.__all_excludes;
    this._matches = newScript._matches;
    this._delay = newScript._delay;
    this.priority = newPriority;
    this._screenshots = newScript._screenshots;
    this._homepageURL = newScript.homepageURL;
    this._contributionURL = newScript.contributionURL;
    this._contributionAmount = newScript.contributionAmount;
    this.supportURL = newScript.supportURL;
    this._updateURL = newScript._updateURL;
    this._name = newScript._name;
    this._namespace = newScript._namespace;
    this.author = newScript._author;
    this._developers = newScript._developers;
    this._contributors = newScript._contributors;
    this._description = newScript._description;
    this._jsversion = newScript._jsversion;
    this["_run-at"] = newScript["_run-at"];
    this._noframes = newScript._noframes;
    this._version = newScript._version;

    if (!scriptInjector) {
      this._file = newScript._file;
      this._basedir = newScript._basedir;
      this._filename = newScript._filename;
      this._icon = newScript._icon;
      this._icon64 = newScript._icon64;
      this._requires = newScript._requires;
      this._resources = newScript._resources;
      this._modified = newScript._modified;
      this._dependhash = newScript._dependhash;
      if (newScript._downloadURL) this._downloadURL = newScript._downloadURL;
    } else {
      var dependhash = tools.Scriptish_cryptoHash(newScript._rawMeta);
      if (dependhash != this._dependhash && !newScript._dependFail) {
        this._dependhash = dependhash;
        this._icon = newScript._icon;
        this._icon64 = newScript._icon64;
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
      } else {
        Scriptish.notify(this, "scriptish-script-modified", {saved: true, reloadUI: true});
      }
    }

    this.update();

    if (oldPriority != newPriority) this._config.sortScripts();
  },

  toJSON: function() ({
    domains: this.domains,
    includes: this._includes.patterns,
    excludes: this._excludes.patterns,
    matches: this._matches.map(function(match) match.pattern),
    user_includes: this._user_includes.patterns,
    user_excludes: this._user_excludes.patterns,
    screenshots: this._screenshots.map(function(screenshot) ({
      url: screenshot.url,
      thumbnailURL: screenshot.thumbnailURL
    })),
    requires: this._requires.map(function(req) req._filename),
    resources: this._resources.map(function(res) ({
      name: res._name,
      filename: res._filename,
      mimetype: res._mimetype,
      charset: res._charset
    })),
    noframes: this._noframes,
    filename: this._filename,
    id: this.id,
    name: this.name,
    namespace: this.namespace,
    author: this._author,
    developers: this._developers,
    contributors: this._contributors,
    blocklistState: this.blocklistState,
    description: this._description,
    version: this._version,
    delay: this._delay,
    priority: this.priority,
    icon: this.icon.filename,
    icon64: this.icon64.filename,
    enabled: this._enabled,
    basedir: this._basedir,
    modified: this._modified,
    dependhash: this._dependhash,
    jsversion: this._jsversion,
    "run-at": this["_run-at"],
    includesDisabled: this.includesDisabled,
    homepageURL: this.homepageURL,
    contributionURL: this._contributionURL,
    contributionAmount: this._contributionAmount,
    downloadURL: this._downloadURL,
    updateURL: this._updateURL,
    supportURL: this.supportURL,
    averageRating: this.averageRating,
    reviewCount: this.reviewCount,
    totalDownloads: this.totalDownloads,
    applyBackgroundUpdates: this._applyBackgroundUpdates
  }),

  // TODO: DRY
  installProcess: function() {
    this._initFile(this._tempFile);
    this._tempFile = null;

    if (this.icon.hasDownloadURL()) this.icon._initFile();
    if (this.icon64.hasDownloadURL()) this.icon64._initFile();

    for (var i = 0; i < this._requires.length; i++)
      this._requires[i]._initFile();

    for (var i = 0; i < this._resources.length; i++)
      this._resources[i]._initFile();

    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_cryptoHash.js", tools);

    if (Services.pbs.privateBrowsingEnabled) this._downloadURL = null;

    // set up _modified and stat thrashing stuff
    this.isModified();

    this.update();

    this._dependhash = tools.Scriptish_cryptoHash(this._rawMeta);
    return this;
  }
};

Script.parseVersion = function Script_parseVersion(aSrc) {
  var parsed = Script.header_parse(aSrc);
  if (parsed.version) return parsed.version.pop();
  return null;
}

// TODO: DRY this by combining it with Script.parse some way..
Script.header_parse = function(aSource) {
  var headers = {};
  var foundMeta = false;
  var line;

  // do not 'optimize' by reusing this reg exp! it should not be reused!
  var metaRegExp = /\/\/[ \t]*(?:==(\/?UserScript)==|\@(\S+)(?:[ \t]+([^\r\f\n]+))?)/g;

  // read one line at a time looking for start meta delimiter or EOF
  while (line = metaRegExp.exec(aSource)) {
    if (line[1]) {
      if ("userscript" == line[1].toLowerCase()) {
        foundMeta = true; // start
        continue;
      } else {
        break; // done
      }
    }
    if (!foundMeta) continue;

    var header = line[2].toLowerCase();
    var value = line[3];

    if (!headers[header]) headers[header] = [value];
    else headers[header].push(value);
  }

  return headers;
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
      if (result.match(RE_USERSCRIPT_HEADER_START)) foundMeta = true;
      continue;
    }

    if (result.match(RE_USERSCRIPT_HEADER_END))
      break; // done gathering up meta lines

    var match = result.match(/\/\/[ \t]*\@(\S+)(?:\s+([^\r\f\n]+))?/);
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
        case "delay":
          script[header] = value;
          continue;
        case "priority":
          !script.priority && (script.priority = parseInt(value, 10));
          continue;
        case "author":
          if (!script.author) {
            script.author = value;
            continue;
          }
          // nobreak
        case "developer":
          script.addDeveloper(value);
          continue;
        case "contributor":
          script.addContributor(value);
          continue;
        case "name":
        case "namespace":
        case "description":
        case "version":
          script["_" + header] = value;
          continue;
        case "updateurl":
          try {
            var uri = NetUtil.newURI(value);
          } catch (e) {
            break;
          }
          if (uri.scheme == "https" || uri.scheme == "http")
            script._updateURL = uri.spec;
          break;
        case "applybackgroundupdates":
          script._applyBackgroundUpdates =
              parseInt(value, 10) || defaultAutoUpdateState;
          continue;
        case "injectframes":
          if (value != "0") continue;
          script["_noframes"] = true;
          continue;
        case "website":
        case "homepage":
        case "homepageurl":
          try {
            var uri = NetUtil.newURI(value);
          } catch (e) {
            break;
          }
          script._homepageURL = uri.spec;
          break;
        case "contributionurl":
          try {
            var uri = NetUtil.newURI(value);
          } catch (e) {
            break;
          }
          script._contributionURL = uri.spec;
          break;
        case "contributionamount":
          script._contributionAmount = value;
          break;
        case "supporturl":
          try {
            var uri = NetUtil.newURI(value);
          } catch (e) {
            break;
          }
          script.supportURL = uri.spec;
          break;
        case "jsversion":
          let jsVerIndx = JSVersions.indexOf(value);
          if (-1 === jsVerIndx) {
            throw new Error("@jsversion " + value + " " +
                Scriptish_stringBundle("error.isInvalidValue"));
          } else if (jsVerIndx > JSVersions.indexOf(maxJSVer)) {
            throw new Error("@jsversion " + value + " " +
                Scriptish_stringBundle("error.notSupported.Firefox"));
          } else {
            script._jsversion = JSVersions[jsVerIndx];
          }
          continue;
        case "run-at":
          let runAtIndx = runAtValues.indexOf(value);
          if (0 > runAtIndx)
            throw new Error("@run-at " + value + " " +
                Scriptish_stringBundle("error.isInvalidValue"));
          script["_run-at"] = runAtValues[runAtIndx];
          continue;
        case "domain":
          script.domains.push(value);
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
          var splitValue = value.match(valueSplitter);
          // icon
          try {
            script.icon.setIcon(splitValue[1], aURI);
          } catch (e) {
            if (aUpdateScript) script._dependFail = true;
            else Scriptish_logError(e);
            continue;
          }

          script._rawMeta += header + '\0' + value + '\0';

          // icon64
          var icon64 = splitValue[2];
          if (!icon64) continue;
          try {
             script.icon64.setIcon(icon64, aURI);
           } catch (e) {
             if (aUpdateScript) script._dependFail = true;
             else Scriptish_logError(e);
             continue;
           }
          continue;
        case "icon64":
        case "icon64url":
          try {
            script.icon64.setIcon(value, aURI);
          } catch (e) {
            if (aUpdateScript) script._dependFail = true;
            else Scriptish_logError(e);
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
              throw new Error(Scriptish_stringBundle("error.retrieving") +
                              " @require: '" + value + "'");
            }
          }
          continue;
        case "resource":
          var res = value.match(valueSplitter);
          if (res === null) {
            throw new Error(Scriptish_stringBundle("error.resource.syntax") +
                            ": '" + value + "'");
          }
          var resName = res[1];
          if (previousResourceNames[resName]) {
            throw new Error("'" + resName + "' " +
                            Scriptish_stringBundle("error.resource.dupName"));
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
                  Scriptish_stringBundle("error.retrieving") +
                  " @resource '" + resName + "' (" + res[2] + ")");
            }
          }
          continue;
      }
    }
  }

  // if no meta info, default to reasonable values
  if (!script._name && aURI) {
    script._name = Script.parseScriptName(
        (aUpdateScript && aUpdateScript.filename) || (aURI && aURI.spec));
  }
  if (!script._namespace && script._downloadURL)
    script._namespace = aURI.host;
  if (!script._description) script._description = "";
  if (!script._version) script._version = "";

  script.doBlockCheck();

  return script;
};

Script.loadFromJSON = function(aConfig, aSkeleton) {
  var script = new Script(aConfig);

  script._filename = aSkeleton.filename;
  script._basedir = aSkeleton.basedir;
  script._downloadURL = aSkeleton.downloadURL;
  script._updateURL = aSkeleton.updateURL;
  script._homepageURL = aSkeleton.homepageURL;
  script._contributionURL = aSkeleton.contributionURL;
  script._contributionAmount = aSkeleton.contributionAmount;
  script.supportURL = aSkeleton.supportURL;
  script._jsversion = aSkeleton.jsversion;
  script["_run-at"] = aSkeleton["run-at"];
  script.includesDisabled = aSkeleton.includesDisabled;

  if (!script.fileExists()) {
    script.uninstallProcess();
    return true;
  }

  script._modified = aSkeleton.modified;
  script._dependhash = aSkeleton.dependhash;
  script._version = aSkeleton.version;
  script._noframes = aSkeleton.noframes;

  script.domains = aSkeleton.domains;
  if (aSkeleton.developers)
    aSkeleton.developers.forEach(script.addDeveloper.bind(script));
  if (aSkeleton.contributors)
    aSkeleton.contributors.forEach(script.addContributor.bind(script));
  script.addInclude(aSkeleton.includes);
  script.addExclude(aSkeleton.excludes);
  script.addInclude(aSkeleton.user_includes, true);
  script.addExclude(aSkeleton.user_excludes, true);
  aSkeleton.matches.forEach(function(i) script._matches.push(new MatchPattern(i)));
  aSkeleton.requires.forEach(function(i) {
    var scriptRequire = new ScriptRequire(script);
    scriptRequire._filename = i;
    script._requires.push(scriptRequire);
  });
  aSkeleton.resources.forEach(function(i) {
    var scriptResource = new ScriptResource(script);
    scriptResource._name = i.name;
    scriptResource._filename = i.filename;
    scriptResource._mimetype = i.mimetype;
    scriptResource._charset = i.charset;
    script._resources.push(scriptResource);
  });
  aSkeleton.screenshots.forEach(function(i) {
    script._screenshots.push(new AddonManagerPrivate.AddonScreenshot(
        i.url, i.thumbnailURL));
  });

  script.id = aSkeleton.id;
  script._name = aSkeleton.name;
  script._namespace = aSkeleton.namespace;
  script.author = aSkeleton.author;
  script._description = aSkeleton.description;
  script.icon.fileURL = aSkeleton.icon;
  script.icon64.fileURL = aSkeleton.icon64;
  script.blocklistState = aSkeleton.blocklistState;
  script._enabled = aSkeleton.enabled;
  script.delay = aSkeleton.delay;
  script.priority = aSkeleton.priority;
  script.averageRating = aSkeleton.averageRating;
  script.reviewCount = aSkeleton.reviewCount;
  script.totalDownloads = aSkeleton.totalDownloads;
  script._applyBackgroundUpdates = aSkeleton.applyBackgroundUpdates

  script.update();

  aConfig.addScript(script);
  return false;
}

Script.loadFromXML = function(aConfig, aNode) {
  var script = new Script(aConfig);
  var fileModified = false;
  let tmp;

  script._filename = aNode.getAttribute("filename");
  script._basedir = aNode.getAttribute("basedir") || ".";
  script._downloadURL = aNode.getAttribute("downloadURL")
      || aNode.getAttribute("installurl") || null;
  script._updateURL = aNode.getAttribute("updateURL") || null;
  script._applyBackgroundUpdates =
      parseInt(aNode.getAttribute("applyBackgroundUpdates"), 10)
      || defaultAutoUpdateState;
  script._homepageURL = aNode.getAttribute("homepageURL")
      || aNode.getAttribute("homepage") || null;
  if (aNode.getAttribute("supportURL"))
    script.supportURL = aNode.getAttribute("supportURL");
  script._jsversion = aNode.getAttribute("jsversion") || null;
  script["_run-at"] = aNode.getAttribute("run-at") || null;
  tmp = (aNode.getAttribute("includesDisabled") || "").toLowerCase();
  if (tmp) script.includesDisabled = ("false" == tmp) ? false : true;

  if (!script.fileExists()) {
    script.uninstallProcess();
    return true;
  }

  if (!aNode.hasAttribute("modified")
      || !aNode.hasAttribute("dependhash")
      || !aNode.hasAttribute("version")) {
    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_cryptoHash.js", tools);

    // set up _modified and stat thrashing stuff
    script.isModified();

    var parsedScript = Script.parse(
        aConfig, Scriptish_getContents(script._file),
        script._downloadURL && NetUtil.newURI(script._downloadURL),
        script);
    script._dependhash = tools.Scriptish_cryptoHash(parsedScript._rawMeta);
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
      case "Domain":
          script.domains.push(childNode.firstChild.nodeValue.trim());
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
      case "UserInclude":
          script.addInclude(childNode.firstChild.nodeValue.trim(), true);
          break;
      case "UserExclude":
          script.addExclude(childNode.firstChild.nodeValue.trim(), true);
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
  script.icon64.fileURL = aNode.getAttribute("icon64");
  let blocklistState = parseInt(aNode.getAttribute("blocklistState"), 10);
  if (blocklistState) script.blocklistState = blocklistState;
  script._enabled = aNode.getAttribute("enabled") == true.toString();
  script.delay = aNode.getAttribute("delay");
  script.priority = parseInt(aNode.getAttribute("priority"), 10) || 0;
  if (aNode.getAttribute("averageRating"))
    script.averageRating = aNode.getAttribute("averageRating") * 1;
  if (aNode.getAttribute("reviewCount"))
    script.reviewCount = aNode.getAttribute("reviewCount") * 1;
  if (aNode.getAttribute("totalDownloads"))
    script.totalDownloads = aNode.getAttribute("totalDownloads") * 1;

  script.update();

  aConfig.addScript(script);
  return fileModified;
};

Script.parseScriptName = function(aURL) ((
    /\/([^\/]+)\.user(?:-\d+)?\.js(?:[\?#].*)?$/.test(aURL || "")) ? RegExp.$1 : "")
