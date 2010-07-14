// JSM exported symbols
var EXPORTED_SYMBOLS = ["Script"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/utils.js");
Cu.import("resource://scriptish/convert2RegExp.js");
Cu.import("resource://scriptish/scriptdownloader.js");
Cu.import("resource://scriptish/scriptrequire.js");
Cu.import("resource://scriptish/scriptresource.js");

const metaRegExp = /\/\/ (?:==\/?UserScript==|\@\S+(?:\s+(?:[^\r\f\n]+))?)/g;

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
  this._author = null;
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
  get author() { return this._author; },
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
    var tools = {};

    // Migrate preferences.
    if (this.prefroot != newScript.prefroot) {
      var tools = {};
      Cu.import("resource://scriptish/miscapis.js", tools);

      var storageOld = new tools.GM_ScriptStorage(this);
      var storageNew = new tools.GM_ScriptStorage(newScript);

      var names = storageOld.listValues();
      for (var i = 0, name = null; name = names[i]; i++) {
        storageNew.setValue(name, storageOld.getValue(name));
        storageOld.deleteValue(name);
      }
    }

    // Copy new values.
    this._id = newScript.id;
    this._prefroot = newScript.prefroot;
    this._includes = newScript._includes;
    this._excludes = newScript._excludes;
    this._includeRegExps = newScript._includeRegExps;
    this._excludeRegExps = newScript._excludeRegExps;
    this._name = newScript._name;
    this._namespace = newScript._namespace;
    this._author = newScript._author;
    this._description = newScript._description;
    this._unwrap = newScript._unwrap;
    this._version = newScript._version;

    var dependhash = GM_sha1(newScript._rawMeta);
    if (dependhash != this._dependhash && !newScript._dependFail) {
      Cu.import("resource://scriptish/scriptdownloader.js", tools);

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
      var scriptDownloader = new tools.GM_ScriptDownloader(null, null, null);
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
    scriptNode.setAttribute("author", this._author);
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

Script.parse = function parse(aConfig, aSource, aURI, aUpdate) {
  var script = new Script(aConfig);

  if (aURI) {
    script._downloadURL = aURI.spec;
    script._enabled = true;
  }

  // read one line at a time looking for start meta delimiter or EOF
  var lines = aSource.match(metaRegExp);
  var i = 0;
  var result;
  var foundMeta = false;

  // used for duplicate resource name detection
  var previousResourceNames = {};
  script._rawMeta = "";

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
      case "name":
      case "namespace":
      case "author":
      case "description":
      case "version":
        script["_" + header] = value;
        continue;
      case "include":
        script.addInclude(value);
        continue;
      case "exclude":
        script.addExclude(value);
        continue;
      case "require":
        try {
          var reqUri = GM_uriFromUrl(value, aURI);
          var scriptRequire = new ScriptRequire(script);
          scriptRequire._downloadURL = reqUri.spec;
          script._requires.push(scriptRequire);
          script._rawMeta += header + '\0' + value + '\0';
        } catch (e) {
          if (aUpdate) {
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
          var resUri = GM_uriFromUrl(res[2], aURI);
          var scriptResource = new ScriptResource(script);
          scriptResource._name = resName;
          scriptResource._downloadURL = resUri.spec;
          script._resources.push(scriptResource);
          script._rawMeta +=
              header + '\0' + resName + '\0' + resUri.spec + '\0';
        } catch (e) {
          if (aUpdate) {
            script._dependFail = true;
          } else {
            throw new Error(
                'Failed to get @resource '+ resName +' from '+ res[2]);
          }
        }
        continue;
      case "unwrap":
        if (!value) script._unwrap = true;
        continue;
      default:
        continue;
    }
  }

  // if no meta info, default to reasonable values
  if (!script._name && aURI) script._name = GM_parseScriptName(aURI);
  if (!script._namespace && aURI) script._namespace = aURI.host;
  if (!script._description) script._description = "";
  if (!script._version) script._version = "";
  if (script._includes.length == 0) script.addInclude("*");

  return script;
};

Script.load = function load(aConfig, aNode) {
  var script = new Script(aConfig);
  var fileModified = false;
  var rightTrim = /\s*$/g;

  script._filename = aNode.getAttribute("filename");
  script._basedir = aNode.getAttribute("basedir") || ".";
  script._downloadURL = aNode.getAttribute("installurl") || null;

  if (!aNode.getAttribute("modified")
      || !aNode.getAttribute("dependhash")
      || !aNode.getAttribute("version")
  ) {
    script._modified = script._file.lastModifiedTime;
    var parsedScript = Script.parse(
        aConfig, GM_getContents(script._file), {spec: script._downloadURL}, true);
    script._dependhash = GM_sha1(parsedScript._rawMeta);
    script._version = parsedScript._version;
    fileModified = true;
  } else {
    script._modified = aNode.getAttribute("modified");
    script._dependhash = aNode.getAttribute("dependhash");
    script._version = aNode.getAttribute("version");
  }

  for (var i = 0, childNode; childNode = aNode.childNodes[i]; i++) {
    switch (childNode.nodeName) {
      case "Include":
        script.addInclude(childNode.firstChild.nodeValue.replace(rightTrim, ''));
        break;
      case "Exclude":
        script.addExclude(childNode.firstChild.nodeValue.replace(rightTrim, ''));
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
      case "Unwrap":
        script._unwrap = true;
        break;
    }
  }

  script._name = aNode.getAttribute("name");
  script._namespace = aNode.getAttribute("namespace");
  script._author = aNode.getAttribute("author");
  script._description = aNode.getAttribute("description");
  script._enabled = aNode.getAttribute("enabled") == true.toString();

  aConfig.addScript(script);
  return fileModified;
};
