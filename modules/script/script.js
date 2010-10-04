var EXPORTED_SYMBOLS = ["Script"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/prefmanager.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");
Cu.import("resource://scriptish/utils/Scriptish_getContents.js");
Cu.import("resource://scriptish/utils/Scriptish_convert2RegExp.js");
Cu.import("resource://scriptish/script/scripticon.js");
Cu.import("resource://scriptish/script/scriptrequire.js");
Cu.import("resource://scriptish/script/scriptresource.js");
Cu.import("resource://scriptish/third-party/MatchPattern.js");
Cu.import("resource://scriptish/config/configdownloader.js");
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

const metaRegExp = /\/\/ (?:==\/?UserScript==|\@\S+(?:[ \t]+(?:[^\r\f\n]+))?)/g;
const nonIdChars = /[^\w@\.\-_]+/g; // any char matched by this is not valid
const JSVersions = ['1.6', '1.7', '1.8', '1.8.1'];
var getMaxJSVersion = function(){ return JSVersions[2]; };

// Implements Addon https://developer.mozilla.org/en/Addons/Add-on_Manager/Addon
function Script(config) {
  this._config = config;
  this._observers = [];

  this._homepageURL = null; // Only for scripts not installed
  this._downloadURL = null; // Only for scripts not installed
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
  this._requires = [];
  this._resources = [];
  this._screenshots = [];
  this._unwrap = false;
  this._noframes = false;
  this._dependFail = false
  this.delayInjection = false;
  this._rawMeta = null;
  this._jsversion = null;
}

Script.prototype = {
  isCompatible: true,
  providesUpdatesSecurely: true,
  blocklistState: 0,
  appDisabled: false,
  scope: AddonManager.SCOPE_PROFILE,
  get isActive() { return !this.appDisabled || !this.userDisabled },
  pendingOperations: 0,
  type: "userscript",
  get sourceURI () { return NetUtil.newURI(this._downloadURL); },
  get userDisabled() { return !this._enabled; },
  set userDisabled(val) {
    if (val == this.userDisabled) return val;

    AddonManagerPrivate.callAddonListeners(
        val ? "onEnabling" : "onDisabling", this, false);

    this._enabled = !val;
    this._changed("edit-enabled", this._enabled);

    AddonManagerPrivate.callAddonListeners(
        val ? "onEnabled" : "onDisabled", this);
  },

  isCompatibleWith: function() { return true; },

  get permissions() {
    var perms = AddonManager.PERM_CAN_UNINSTALL;
    perms |= this.userDisabled ? AddonManager.PERM_CAN_ENABLE : AddonManager.PERM_CAN_DISABLE;
    return perms;
  },

  get updateDate () { return new Date(parseInt(this._modified)); },

  findUpdates: function(aListener) {
    if ("onNoCompatibilityUpdateAvailable" in aListener)
      aListener.onNoCompatibilityUpdateAvailable(this);
    if ("onNoUpdateAvailable" in aListener)
      aListener.onNoUpdateAvailable(this);
    if ("onUpdateFinished" in aListener)
      aListener.onUpdateFinished(this);
  },

  uninstall: function() {
    AddonManagerPrivate.callAddonListeners("onUninstalling", this, false);
    this.needsUninstall = true;
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
  get homepageURL() { return this._homepageURL; },
  get name() { return this._name; },
  get namespace() { return this._namespace; },
  get prefroot() { 
    if (!this._prefroot) this._prefroot = ["scriptvals.", this.id, "."].join("");
    return this._prefroot;
  },
  get creator() { return this._creator; },
  get author() { return this._author; },
  set author(aVal) {
    this._author = aVal;
    this._creator = new AddonManagerPrivate.AddonAuthor(aVal);
  },
  get contributors() {
    var contributors = [];
    for (var i = this._contributors.length-1; i >= 0; i--) {
      contributors.unshift(
          new AddonManagerPrivate.AddonAuthor(this._contributors[i]));
    }
    return this._contributors;
  },
  addContributor: function(aContributor) {
    this._contributors.push(aContributor);
  },
  get description() { return this._description; },
  get version() { return this._version; },
  get icon() { return this._icon; },
  get iconURL() { return this._icon.fileURL; },
  get enabled() { return this._enabled; },
  set enabled(enabled) { this.userDisabled = !enabled; },

  get includes() { return this._includes.concat(); },
  get excludes() { return this._excludes.concat(); },
  get matches() { return this._matches.concat(); },
  addInclude: function(aPattern) {
    this._includes.push(aPattern);
    this._includeRegExps.push(Scriptish_convert2RegExp(aPattern));
  },
  addExclude: function(aPattern) {
    this._excludes.push(aPattern);
    this._excludeRegExps.push(Scriptish_convert2RegExp(aPattern));
  },

  get requires() { return this._requires.concat(); },
  get resources() { return this._resources.concat(); },
  get unwrap() { return this._unwrap; },
  get noframes() { return this._noframes; },
  get jsversion() { return this._jsversion || getMaxJSVersion() },

  get _file() {
    var file = this._basedirFile;
    file.append(this._filename);
    return file;
  },
  get filename() { return this._filename; },

  get editFile() { return this._file; },

  get _basedirFile() {
    var file = this._config._scriptDir;
    file.append(this._basedir);
    file.normalize();
    return file;
  },

  get fileURL() { return Scriptish_getUriFromFile(this._file).spec; },
  get textContent() { return Scriptish_getContents(this._file); },

  get size() {
    var size = this._file.fileSize;
    for each (var r in this._requires) size += r._file.fileSize;
    for each (var r in this._resources) size += r._file.fileSize;
    return size;
  },

  get screenshots() { return this._screenshots; },

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

  get urlToDownload() { return this._downloadURL; },
  setDownloadedFile: function(file) { this._tempFile = file; },

  get previewURL() {
    return Services.io.newFileURI(this._tempFile).spec;
  },

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

  updateFromNewScript: function(newScript, aDL) {
    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_sha1.js", tools);

    // Copy new values.
    this._includes = newScript._includes;
    this._excludes = newScript._excludes;
    this._includeRegExps = newScript._includeRegExps;
    this._excludeRegExps = newScript._excludeRegExps;
    this._matches = newScript._matches;
    this._screenshots = newScript._screenshots;
    this._homepageURL = newScript._homepageURL;
    this._name = newScript._name;
    this._namespace = newScript._namespace;
    this.author = newScript._author;
    this._contributors = newScript._contributors;
    this._description = newScript._description;
    this._jsversion = newScript._jsversion;
    this._unwrap = newScript._unwrap;
    this._noframes = newScript._noframes;
    this._version = newScript._version;

    if (aDL) {
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

        // Redownload dependencies.
        Scriptish_configDownloader.refetchDependencies(this);
      }
    }
    this.updateProcess();
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
      screenshotNode.appendChild(doc.createTextNode(this._screenshots[j].url));
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

    if (this._unwrap) {
      scriptNode.appendChild(doc.createTextNode("\n\t\t"));
      scriptNode.appendChild(doc.createElement("Unwrap"));
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
    scriptNode.setAttribute("icon", this.icon.filename);
    scriptNode.setAttribute("enabled", this._enabled);
    scriptNode.setAttribute("basedir", this._basedir);
    scriptNode.setAttribute("modified", this._modified);
    scriptNode.setAttribute("dependhash", this._dependhash);
    if (this._jsversion) scriptNode.setAttribute("jsversion", this._jsversion);

    if (this.homepageURL) {
      scriptNode.setAttribute("homepageURL", this.homepageURL);
    }

    if (this._downloadURL) {
      scriptNode.setAttribute("installurl", this._downloadURL);
    }

    return scriptNode;
  },

  installProcess: function() {
    this._initFile(this._tempFile);
    this._tempFile = null;
    // if icon had a file to download, then move the file
    if (this.icon.hasDownloadURL())
      this.icon._initFile();

    for (var i = 0; i < this._requires.length; i++)
      this._requires[i]._initFile();

    for (var i = 0; i < this._resources.length; i++)
      this._resources[i]._initFile();

    var tools = {};
    Cu.import("resource://scriptish/utils/Scriptish_sha1.js", tools);

    if (Scriptish_Services.pbs.privateBrowsingEnabled) this._downloadURL = null;

    this._modified = this._file.lastModifiedTime;
    this._dependhash = tools.Scriptish_sha1(this._rawMeta);
  },

  updateProcess: function() {
    AddonManagerPrivate.callAddonListeners("onUninstalled", this);

    this._changed("modified", null, true);

    AddonManagerPrivate.callInstallListeners(
            "onExternalInstall", null, this, null, false);
    
  }
};

Script.parse = function parse(aConfig, aSource, aURI, aUpdateScript) {
  var tools = {};
  var script = new Script(aConfig);

  if (aURI && !Scriptish_Services.pbs.privateBrowsingEnabled)
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

    switch (header) {
      case "id":
        if (value) script.id = value;
        continue;
      case "author":
        if (!script.author) script.author = value;
        continue;
      case "name":
      case "namespace":
      case "description":
      case "version":
        script["_" + header] = value;
        continue;
      case "homepage":
      case "homepageurl":
        script._homepageURL = value;
        continue;
      case "jsversion":
        var jsVerIndx = JSVersions.indexOf(value);
        if (jsVerIndx === -1) {
          throw new Error("'" + value + "' is an invalid value for @jsversion.");
        } else if (jsVerIndx > JSVersions.indexOf(getMaxJSVersion())) {
          throw new Error("The @jsversion value '" + value + "' is not "
              + "supported by this version of Firefox.");
        } else {
          script._jsversion = JSVersions[jsVerIndx];
        }
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
        script._screenshots.push(new AddonManagerPrivate.AddonScreenshot(value));
        continue;
      case "icon":
      case "iconurl":
        script._rawMeta += header + '\0' + value + '\0';
        // aceept data uri schemes for image MIME types
        if (/^data:image\//i.test(value)){
          script.icon._dataURI = value;
          continue;
       }
       try {
          var iconUri = NetUtil.newURI(value, null, aURI);
          script.icon._downloadURL = iconUri.spec;
        } catch (e) {
          if (aUpdateScript) {
            script._dependFail = true;
          } else {
            throw new Error('Failed to get @icon '+ value);
          }
        }
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
        var res = value.match(/(\S+)\s+(.*)/);
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
      case "unwrap":
      case "noframes":
        if (!value) script["_" + header] = true;
        continue;
      default:
        continue;
    }
  }

  // if no meta info, default to reasonable values
  if (!script._name && aURI) {
    Cu.import("resource://scriptish/utils/Scriptish_parseScriptName.js", tools);
    script._name = tools.Scriptish_parseScriptName(
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
  script._downloadURL = aNode.getAttribute("installurl") || null;
  script._homepageURL = aNode.getAttribute("homepageURL") || null;
  script._jsversion = aNode.getAttribute("jsversion") || null;

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
        NetUtil.newURI(script._downloadURL), script);
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
        script._screenshots.push(new AddonManagerPrivate.AddonScreenshot(childNode.firstChild.nodeValue.trim()));
        break;
      case "Noframes":
      case "Unwrap":
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

  aConfig.addScript(script);
  return fileModified;
};
