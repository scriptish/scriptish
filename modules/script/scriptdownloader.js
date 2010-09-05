
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_ScriptDownloader"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/utils.js");
Cu.import("resource://scriptish/utils/GM_getWriteStream.js");

function GM_ScriptDownloader(win, uri, bundle) {
  this.win_ = win;
  this.uri_ = uri;
  this.bundle_ = bundle;
  this.req_ = null;
  this.script = null;
  this.depQueue_ = [];
  this.dependenciesLoaded_ = false;
  this.installOnCompletion_ = false;
  this.tempFiles_ = [];
  this.updateScript = false;
}

GM_ScriptDownloader.prototype.startInstall = function() {
  this.installing_ = true;
  this.startDownload();
};

GM_ScriptDownloader.prototype.startViewScript = function(uri) {
  this.installing_ = false;
  this.startDownload();
};

GM_ScriptDownloader.prototype.startDownload = function() {
  this.req_ = new this.win_.XMLHttpRequest();
  this.req_.overrideMimeType("text/plain");
  this.req_.open("GET", this.uri_.spec, true);
  this.req_.onreadystatechange = GM_hitch(this, "checkContentTypeBeforeDownload");
  this.req_.onload = GM_hitch(this, "handleScriptDownloadComplete");
  this.req_.send(null);
};

GM_ScriptDownloader.prototype.checkContentTypeBeforeDownload = function () {
  if (this.req_.readyState == 2) {
    // If there is a 'Content-Type' header and it contains 'text/html',
    // then do not install the file, and display it instead.
    if (/text\/html/i.test(this.req_.getResponseHeader("Content-Type"))) {
      this.req_.abort();

      gmService.ignoreNextScript();

      this.win_.content.location.href = this.uri_.spec;
      return;
    }

    // display "Fetching user script" msg in status bar
    this.win_.GM_BrowserUI.statusImage.src =
      "chrome://scriptish/content/third-party/throbber.gif";
    this.win_.GM_BrowserUI.statusImage.style.opacity = "0.5";
    this.win_.GM_BrowserUI.statusImage.tooltipText =
        this.bundle_.getString("tooltip.loading");
    this.win_.GM_BrowserUI.showStatus("Fetching user script", false);
  }
};

GM_ScriptDownloader.prototype.handleScriptDownloadComplete = function() {
  try {
    // If loading from file, status might be zero on success
    if (this.req_.status != 200 && this.req_.status != 0) {
      // NOTE: Unlocalized string
      GM_alert("Error loading user script:\n" +
      this.req_.status + ": " +
      this.req_.statusText);
      return;
    }

    var source = this.req_.responseText;

    this.script = GM_getConfig().parse(source, this.uri_);

    var file = Cc["@mozilla.org/file/directory_service;1"]
                   .getService(Ci.nsIProperties)
                   .get("TmpD", Ci.nsILocalFile);

    var base = this.script.name.replace(/[^A-Z0-9_]/gi, "").toLowerCase();
    file.append(base + ".user.js");
    file.createUnique(
      Ci.nsILocalFile.NORMAL_FILE_TYPE,
      0640
    );
    this.tempFiles_.push(file);

    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
        .createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    source = converter.ConvertFromUnicode(source);

    var ws = GM_getWriteStream(file);
    ws.write(source, source.length);
    ws.close();

    this.script.setDownloadedFile(file);

    this.win_.setTimeout(GM_hitch(this, "fetchDependencies"), 0);

    if (this.installing_) {
      this._callback = function() {
        this.showInstallDialog();
        this._callback = undefined;
      };
    } else {
      this.showScriptView();
      this._callback = function() {
        this.hideFetchMsg();
        this._callback = undefined;
      };
    }

  } catch (e) {
    this.hideFetchMsg();
    // NOTE: unlocalized string
    GM_alert("Script could not be installed " + e);
    throw e;
  }
};

GM_ScriptDownloader.prototype.fetchDependencies = function(){
  GM_log("Fetching Dependencies");

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

GM_ScriptDownloader.prototype.downloadNextDependency = function(){
  var tools = {};
  if (this.depQueue_.length > 0) {
    var dep = this.depQueue_.pop();
    try {
      var persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
                        .createInstance(Ci.nsIWebBrowserPersist);
      persist.persistFlags =
        persist.PERSIST_FLAGS_BYPASS_CACHE |
        persist.PERSIST_FLAGS_REPLACE_EXISTING_FILES; //doesn't work?

      Cu.import("resource://scriptish/utils/GM_uriFromUrl.js", tools);
      Cu.import("resource://scriptish/utils/GM_getTempFile.js", tools);

      var sourceUri = tools.GM_uriFromUrl(dep.urlToDownload);
      var sourceChannel = ioService.newChannelFromURI(sourceUri);
      sourceChannel.notificationCallbacks = new NotificationCallbacks();

      var file = tools.GM_getTempFile();
      this.tempFiles_.push(file);

      var progressListener = new PersistProgressListener(persist);
      progressListener.onFinish = GM_hitch(this,
        "handleDependencyDownloadComplete", dep, file, sourceChannel);
      persist.progressListener = progressListener;

      persist.saveChannel(sourceChannel,  file);
    } catch(e) {
      GM_log("Download exception " + e);
      this.errorInstallDependency(this.script, dep, e);
    }
  } else {
    this.dependenciesLoaded_ = true;
    if(this._callback) this._callback();
    this.finishInstall();
  }
};

GM_ScriptDownloader.prototype.handleDependencyDownloadComplete =
function(dep, file, channel) {
  GM_log("Dependency Download complete " + dep.urlToDownload);
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

GM_ScriptDownloader.prototype.checkDependencyURL = function(url) {
  var scheme = ioService.extractScheme(url);

  switch (scheme) {
    case "http":
    case "https":
    case "ftp":
        return true;
    case "file":
        var scriptScheme = ioService.extractScheme(this.uri_.spec);
        return (scriptScheme == "file")
    default:
      return false;
  }
};

GM_ScriptDownloader.prototype.finishInstall = function(){
  if (this.updateScript) {
    // Inject the script now that we have the new dependencies
    this.script._config.injectScript(this.script);
    this.script.delayInjection = false;

    // Save new values to config.xml
    this.script._config._save();
  } else if (this.installOnCompletion_) {
    this.installScript();
  }
};

GM_ScriptDownloader.prototype.errorInstallDependency = function(script, dep, msg) {
  this.dependencyError = "Error loading dependency " + dep.urlToDownload + "\n" + msg;
  GM_log(this.dependencyError)
  if (this.installOnCompletion_) {
    alert(this.dependencyError);
  }
  if (this._callback) {
    this._callback();
  }
};

GM_ScriptDownloader.prototype.installScript = function() {
  if (this.dependencyError) {
    GM_alert(this.dependencyError);
  } else if(this.dependenciesLoaded_) {
    this.win_.GM_BrowserUI.installScript(this.script)
  } else {
    this.installOnCompletion_ = true;
  }
};

GM_ScriptDownloader.prototype.cleanupTempFiles = function() {
  for (var i = 0, file = null; file = this.tempFiles_[i]; i++) {
    file.remove(false);
  }
};

GM_ScriptDownloader.prototype.showInstallDialog = function(timer) {
  if (!timer) {
    // otherwise, the status bar stays in the loading state.
    this.win_.setTimeout(GM_hitch(this, "showInstallDialog", true), 0);
    return;
  }
  this.hideFetchMsg();
  this.win_.openDialog("chrome://scriptish/content/install.xul", "",
                       "chrome,centerscreen,modal,dialog,titlebar,resizable",
                       this);
};

GM_ScriptDownloader.prototype.hideFetchMsg = function() {
  this.win_.GM_BrowserUI.refreshStatus();
  this.win_.GM_BrowserUI.hideStatusImmediately();
};

GM_ScriptDownloader.prototype.showScriptView = function() {
  this.win_.GM_BrowserUI.showScriptView(this);
};


function NotificationCallbacks() {}

NotificationCallbacks.prototype.QueryInterface = function(aIID) {
  if (aIID.equals(Ci.nsIInterfaceRequestor)) {
    return this;
  }
  throw Components.results.NS_NOINTERFACE;
};

NotificationCallbacks.prototype.getInterface = function(aIID) {
  if (aIID.equals(Ci.nsIAuthPrompt )) {
     var winWat = Cc["@mozilla.org/embedcomp/window-watcher;1"]
                      .getService(Ci.nsIWindowWatcher);
     return winWat.getNewAuthPrompter(winWat.activeWindow);
  }
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
      GM_log("Persister: Download complete " + aRequest.status);
      this.onFinish();
    }
  };
