// JSM exported symbols
var EXPORTED_SYMBOLS = ["Script"];

const Cu = Components.utils;
Cu.import("resource://greasemonkey/constants.js");
Cu.import("resource://greasemonkey/utils.js");
Cu.import("resource://greasemonkey/miscapis.js");
Cu.import("resource://greasemonkey/convert2RegExp.js");
Cu.import("resource://greasemonkey/scriptdownloader.js");

GM_apiAcceptableFile(Components.stack.filename);

function Script(config) {
  this._config = config;
  this._observers = [];

  this._downloadURL = null; // Only for scripts not installed
  this._tempFile = null; // Only for scripts not installed
  this._basedir = null;
  this._filename = null;
  this._modified = null;
  this._dependhash = null;

  this._name = null;
  this._namespace = null;
  this._id = null;
  this._prefroot = null;
  this._description = null;
  this._version = null;
  this._enabled = true;
  this._includes = [];
  this._excludes = [];
  this._includeRegExps = [];
  this._excludeRegExps = [];
  this._requires = [];
  this._resources = [];
  this._unwrap = false;
  this._dependFail = false
  this.delayInjection = false;
  this._rawMeta = null;
}

Script.prototype = {
  matchesURL: function(url) {
    function test(regExp) {
      return regExp.test(url);
    }

    return this._includeRegExps.some(test) && !this._excludeRegExps.some(test);
  },

  _changed: function(event, data) { this._config._changed(this, event, data); },

  get name() { return this._name; },
  get namespace() { return this._namespace; },
  get id() {
    if (!this._id) this._id = this._namespace + "/" + this._name;
    return this._id;
  },
  get prefroot() { 
    if (!this._prefroot) this._prefroot = ["scriptvals.", this.id, "."].join("");
    return this._prefroot;
  },
  get description() { return this._description; },
  get version() { return this._version; },
  get enabled() { return this._enabled; },
  set enabled(enabled) { this._enabled = enabled; this._changed("edit-enabled", enabled); },

  get includes() { return this._includes.concat(); },
  get excludes() { return this._excludes.concat(); },
  addInclude: function(aPattern) {
    this._includes.push(aPattern);
    this._includeRegExps.push(GM_convert2RegExp(aPattern));
  },
  addExclude: function(aPattern) {
    this._excludes.push(aPattern);
    this._excludeRegExps.push(GM_convert2RegExp(aPattern));
  },

  get requires() { return this._requires.concat(); },
  get resources() { return this._resources.concat(); },
  get unwrap() { return this._unwrap; },

  get _file() {
    var file = this._basedirFile;
    file.append(this._filename);
    return file;
  },

  get editFile() { return this._file; },

  get _basedirFile() {
    var file = this._config._scriptDir;
    file.append(this._basedir);
    file.normalize();
    return file;
  },

  get fileURL() { return GM_getUriFromFile(this._file).spec; },
  get textContent() { return GM_getContents(this._file); },

  _initFileName: function(name, useExt) {
    var ext = "";
    name = name.toLowerCase();

    var dotIndex = name.lastIndexOf(".");
    if (dotIndex > 0 && useExt) {
      ext = name.substring(dotIndex + 1);
      name = name.substring(0, dotIndex);
    }

    name = name.replace(/\s+/g, "_").replace(/[^-_A-Z0-9]+/gi, "");
    ext = ext.replace(/\s+/g, "_").replace(/[^-_A-Z0-9]+/gi, "");

    // If no Latin characters found - use default
    if (!name) name = "gm_script";

    // 24 is a totally arbitrary max length
    if (name.length > 24) name = name.substring(0, 24);

    if (ext) name += "." + ext;

    return name;
  },

  _initFile: function(tempFile) {
    var file = this._config._scriptDir;
    var name = this._initFileName(this._name, false);

    file.append(name);
    file.createUnique(Ci.nsIFile.DIRECTORY_TYPE, 0755);
    this._basedir = file.leafName;

    file.append(name + ".user.js");
    file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0644);
    this._filename = file.leafName;

    GM_log("Moving script file from " + tempFile.path + " to " + file.path);

    file.remove(true);
    tempFile.moveTo(file.parent, file.leafName);
  },

  get urlToDownload() { return this._downloadURL; },
  setDownloadedFile: function(file) { this._tempFile = file; },

  get previewURL() {
    return ioService.newFileURI(this._tempFile).spec;
  },

  isModified: function() {
    if (this._modified != this._file.lastModifiedTime) {
      this._modified = this._file.lastModifiedTime;
      return true;
    }
    return false;
  },

  updateFromNewScript: function(newScript) {
    // Empty cached values.
    this._id = null;
    this._prefroot = null;

    // Migrate preferences.
    if (this.prefroot != newScript.prefroot) {
      var storageOld = new GM_ScriptStorage(this);
      var storageNew = new GM_ScriptStorage(newScript);

      var names = storageOld.listValues();
      for (var i = 0, name = null; name = names[i]; i++) {
        storageNew.setValue(name, storageOld.getValue(name));
        storageOld.deleteValue(name);
      }
    }

    // Copy new values.
    this._includes = newScript._includes;
    this._excludes = newScript._excludes;
    this._includeRegExps = newScript._includeRegExps;
    this._excludeRegExps = newScript._excludeRegExps;
    this._name = newScript._name;
    this._namespace = newScript._namespace;
    this._description = newScript._description;
    this._unwrap = newScript._unwrap;
    this._version = newScript._version;

    var dependhash = GM_sha1(newScript._rawMeta);
    if (dependhash != this._dependhash && !newScript._dependFail) {
      this._dependhash = dependhash;
      this._requires = newScript._requires;
      this._resources = newScript._resources;

      // Get rid of old dependencies.
      var dirFiles = this._basedirFile.directoryEntries;
      while (dirFiles.hasMoreElements()) {
        var nextFile = dirFiles.getNext()
            .QueryInterface(Ci.nsIFile);
        if (!nextFile.equals(this._file)) nextFile.remove(true);
      }

      // Redownload dependencies.
      var scriptDownloader = new GM_ScriptDownloader(null, null, null);
      scriptDownloader.script = this;
      scriptDownloader.updateScript = true;
      scriptDownloader.fetchDependencies();

      this.delayInjection = true;
    }
  },

  createXMLNode: function(doc) {
    var scriptNode = doc.createElement("Script");

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

    scriptNode.appendChild(doc.createTextNode("\n\t"));

    scriptNode.setAttribute("filename", this._filename);
    scriptNode.setAttribute("name", this._name);
    scriptNode.setAttribute("namespace", this._namespace);
    scriptNode.setAttribute("description", this._description);
    scriptNode.setAttribute("version", this._version);
    scriptNode.setAttribute("enabled", this._enabled);
    scriptNode.setAttribute("basedir", this._basedir);
    scriptNode.setAttribute("modified", this._modified);
    scriptNode.setAttribute("dependhash", this._dependhash);

    if (this._downloadURL) {
      scriptNode.setAttribute("installurl", this._downloadURL);
    }

    return scriptNode;
  },

  install: function() {
    this._initFile(this._tempFile);
    this._tempFile = null;

    for (var i = 0; i < this._requires.length; i++) {
      this._requires[i]._initFile();
    }

    for (var i = 0; i < this._resources.length; i++) {
      this._resources[i]._initFile();
    }

    this._modified = this._file.lastModifiedTime;
    this._metahash = GM_sha1(this._rawMeta);
  }
};
