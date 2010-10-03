var EXPORTED_SYMBOLS = ["ScriptDownloader"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/utils/Scriptish_config.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/utils/Scriptish_openManager.js");
Cu.import("resource://scriptish/utils/Scriptish_notification.js");
Cu.import("resource://scriptish/utils/Scriptish_stringBundle.js");
Cu.import("resource://scriptish/utils/Scriptish_hitch.js");
Cu.import("resource://scriptish/utils/Scriptish_getWriteStream.js");
Cu.import("resource://scriptish/utils/Scriptish_alert.js");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://scriptish/third-party/Timer.js");


function ScriptDownloader(uri, contentWin) {
  this._timer = new Timer();
  this.uri_ = uri || null;
  this.req_ = null;
  this.script = null;
  this.depQueue_ = [];
  this.dependenciesLoaded_ = false;
  this.installOnCompletion_ = false;
  this.tempFiles_ = [];
  this.updateScript = false;
  this.contentWin = contentWin || null;
}
ScriptDownloader.prototype.startInstall = function() {
  this.installing_ = true;
  this.startDownload();
};
ScriptDownloader.prototype.startViewScript = function(uri) {
  this.installing_ = false;
  this.startDownload();
}
ScriptDownloader.prototype.startDownload = function() {
  this.req_ = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Ci.nsIXMLHttpRequest);
  this.req_.overrideMimeType("text/plain");
  this.req_.open("GET", this.uri_.spec, true);
  this.req_.onreadystatechange = Scriptish_hitch(this, "chkContentTypeB4DL");
  this.req_.onload = Scriptish_hitch(this, "handleScriptDownloadComplete");
  this.req_.send(null);
}
ScriptDownloader.prototype.chkContentTypeB4DL = function() {
  if (this.req_.readyState == 2) {
    // If there is a 'Content-Type' header and it contains 'text/html',
    // then do not install the file, and display it instead.
    if (/text\/html/i.test(this.req_.getResponseHeader("Content-Type"))) {
      this.req_.abort();

      Scriptish_Services.scriptish.ignoreNextScript();

      if (this.contentWin) this.contentWin.location.href = this.uri_.spec;
      return;
    }
  }
}
ScriptDownloader.prototype.handleScriptDownloadComplete = function() {
  try {
    // If loading from file, status might be zero on success
    if (this.req_.status != 200 && this.req_.status != 0) {
      // NOTE: Unlocalized string
      Scriptish_alert("Error loading user script:\n" +
      this.req_.status + ": " +
      this.req_.statusText);
      return;
    }

    var source = this.req_.responseText;

    this.script = Scriptish_config.parse(source, this.uri_);

    var file = Cc["@mozilla.org/file/directory_service;1"]
                   .getService(Ci.nsIProperties)
                   .get("TmpD", Ci.nsILocalFile);

    var base = this.script.name.replace(/[^A-Z0-9_]/gi, "").toLowerCase();
    file.append(base + ".user.js");
    file.createUnique(Ci.nsILocalFile.NORMAL_FILE_TYPE, 0640);
    this.tempFiles_.push(file);

    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
        .createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    source = converter.ConvertFromUnicode(source);

    var ws = Scriptish_getWriteStream(file);
    ws.write(source, source.length);
    ws.close();

    this.script.setDownloadedFile(file);

    this._timer.setTimeout(Scriptish_hitch(this, "fetchDependencies"), 0);

    if (this.installing_) {
      this._callback = function() {
        this.showInstallDialog();
        this._callback = undefined;
      };
    } else {
      this.showScriptView();
    }

  } catch (e) {
    // NOTE: unlocalized string
    Scriptish_alert("Script could not be installed " + e);
    throw e;
  }
};
ScriptDownloader.prototype.fetchDependencies = function(){
  Scriptish_log("Fetching Dependencies");

  var deps = this.script.requires.concat(this.script.resources);
  // if this.script.icon._filename exists then the icon is a data scheme
  if (this.script.icon.hasDownloadURL()) {
    deps.push(this.script.icon);
  }

  for (var i = 0; i < deps.length; i++) {
    var dep = deps[i];
    if (this.checkDependencyURL(dep.urlToDownload)) {
      this.depQueue_.push(dep);
    } else {
      this.errorInstallDependency(this.script, dep,
        "SecurityException: Request to local and chrome url's is forbidden");
      return;
    }
  }
  this.downloadNextDependency();
};
ScriptDownloader.prototype.downloadNextDependency = function(){
  var tools = {};
  if (this.depQueue_.length > 0) {
    var dep = this.depQueue_.pop();
    try {
      var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                        .createInstance(Ci.nsIWebBrowserPersist);
      persist.persistFlags =
        persist.PERSIST_FLAGS_BYPASS_CACHE |
        persist.PERSIST_FLAGS_REPLACE_EXISTING_FILES; //doesn't work?

      Cu.import("resource://scriptish/utils/Scriptish_getTempFile.js", tools);

      var sourceUri = NetUtil.newURI(dep.urlToDownload);
      var sourceChannel = Services.io.newChannelFromURI(sourceUri);
      sourceChannel.notificationCallbacks = new NotificationCallbacks();

      var file = tools.Scriptish_getTempFile();
      this.tempFiles_.push(file);

      var progressListener = new PersistProgressListener(persist);
      progressListener.onFinish = Scriptish_hitch(this,
        "handleDependencyDownloadComplete", dep, file, sourceChannel);
      persist.progressListener = progressListener;

      persist.saveChannel(sourceChannel,  file);
    } catch(e) {
      Scriptish_log("Download exception " + e);
      this.errorInstallDependency(this.script, dep, e);
    }
  } else {
    this.dependenciesLoaded_ = true;
    if(this._callback) this._callback();
    this.finishInstall();
  }
};
ScriptDownloader.prototype.handleDependencyDownloadComplete =
function(dep, file, channel) {
  Scriptish_log("Dependency Download complete " + dep.urlToDownload);
  try {
    var httpChannel =
      channel.QueryInterface(Ci.nsIHttpChannel);
  } catch(e) {
    var httpChannel = false;
  }

  if (httpChannel) {
    if (httpChannel.requestSucceeded) {
      if (this.updateScript) {
        dep._script = this.script;
        dep.updateScript = true;
      }

      // if the dependency type is icon, then check it's mime type
      if (dep.type == "icon" &&
          !/^image\//i.test(channel.contentType)) {
        this.errorInstallDependency(this.script, dep,
          "Error! @icon is not a image MIME type");
      }

      dep.setDownloadedFile(file, channel.contentType, channel.contentCharset ? channel.contentCharset : null);
      this.downloadNextDependency();
    } else {
      this.errorInstallDependency(this.script, dep,
        "Error! Server Returned : " + httpChannel.responseStatus + ": " +
        httpChannel.responseStatusText);
    }
  } else {
    dep.setDownloadedFile(file);
    this.downloadNextDependency();
  }
};
ScriptDownloader.prototype.checkDependencyURL = function(url) {
  var scheme = Services.io.extractScheme(url);

  switch (scheme) {
    case "http":
    case "https":
    case "ftp":
        return true;
    case "file":
        var scriptScheme = Services.io.extractScheme(this.uri_.spec);
        return (scriptScheme == "file")
    default:
      return false;
  }
};
ScriptDownloader.prototype.finishInstall = function(){
  if (this.updateScript) {
    // Inject the script now that we have the new dependencies
    this.script.delayInjection = false;
    this.script._config.injectScript(this.script);

    // Save new values to config.xml
    this.script._config._save();
  } else if (this.installOnCompletion_) {
    this.installScript();
  }
};
ScriptDownloader.prototype.errorInstallDependency = function(script, dep, msg) {
  this.dependencyError = "Error loading dependency " + dep.urlToDownload + "\n" + msg;
  Scriptish_log(this.dependencyError)
  if (this.installOnCompletion_) {
    alert(this.dependencyError);
  }
  if (this._callback) {
    this._callback();
  }
};
ScriptDownloader.prototype.installScript = function() {
  if (this.dependencyError) {
    Scriptish_alert(this.dependencyError);
  } else if (this.dependenciesLoaded_) {
    var script = this.script;
    Scriptish_config.install(script);

    // notification that install is complete
    var msg = "'" + script.name;
    if (script.version) msg += " " + script.version;
    msg += "' " + Scriptish_stringBundle("statusbar.installed");
    Scriptish_notification(msg, null, null, function() {
      Scriptish_openManager();
    });
  } else {
    this.installOnCompletion_ = true;
  }
};
ScriptDownloader.prototype.cleanupTempFiles = function() {
  for (var i = 0, file = null; file = this.tempFiles_[i]; i++) {
    file.remove(false);
  }
};
ScriptDownloader.prototype.showInstallDialog = function(timer) {
  if (!timer) {
    // otherwise, the status bar stays in the loading state.
    this._timer.setTimeout(Scriptish_hitch(this, "showInstallDialog", true), 0);
    return;
  }
  Services.wm.getMostRecentWindow("navigator:browser").openDialog(
      "chrome://scriptish/content/install.xul", "",
      "chrome,centerscreen,modal,dialog,titlebar,resizable",
      this);
};
ScriptDownloader.prototype.showScriptView = function() {
  Services.wm.getMostRecentWindow("navigator:browser")
      .Scriptish_BrowserUI.showScriptView(this, this.script.previewURL);
};


function NotificationCallbacks() {}
NotificationCallbacks.prototype.QueryInterface = function(aIID) {
  if (aIID.equals(Ci.nsIInterfaceRequestor)) {
    return this;
  }
  throw Components.results.NS_NOINTERFACE;
};
NotificationCallbacks.prototype.getInterface = function(aIID) {
  if (aIID.equals(Ci.nsIAuthPrompt ))
    return Services.ww.getNewAuthPrompter(winWat.activeWindow);
  return undefined;
};


function PersistProgressListener(persist) {
  this.persist = persist;
  this.onFinish = function(){};
  this.persiststate = "";
}

PersistProgressListener.prototype.QueryInterface = function(aIID) {
 if (aIID.equals(Ci.nsIWebProgressListener)) {
   return this;
 }
 throw Components.results.NS_NOINTERFACE;
};

// nsIWebProgressListener
PersistProgressListener.prototype.onProgressChange =
  PersistProgressListener.prototype.onLocationChange =
    PersistProgressListener.prototype.onStatusChange =
      PersistProgressListener.prototype.onSecurityChange = function(){};

PersistProgressListener.prototype.onStateChange =
  function(aWebProgress, aRequest, aStateFlags, aStatus) {
    if (this.persist.currentState == this.persist.PERSIST_STATE_FINISHED) {
      Scriptish_log("Persister: Download complete " + aRequest.status);
      this.onFinish();
    }
  };
