// this file is the JavaScript backing for the UI wrangling which happens in
// browser.xul. It also initializes the Scriptish singleton which contains
// all the main injection logic, though that should probably be a proper XPCOM
// service and wouldn't need to be initialized in that case.

var Scriptish_BrowserUI = new Object();

Components.utils.import("resource://scriptish/prefmanager.js");
Components.utils.import("resource://scriptish/utils/Scriptish_getConfig.js");
Components.utils.import("resource://scriptish/utils/Scriptish_hitch.js");
Components.utils.import("resource://scriptish/utils/Scriptish_newUserScript.js");
Components.utils.import("resource://scriptish/utils/Scriptish_getEnabled.js");
Components.utils.import("resource://scriptish/utils/Scriptish_setEnabled.js");

/**
 * nsISupports.QueryInterface
 */
Scriptish_BrowserUI.QueryInterface = function(aIID) {
  if (!aIID.equals(Components.interfaces.nsISupports) &&
      !aIID.equals(Components.interfaces.nsISupportsWeakReference) &&
      !aIID.equals(Components.interfaces.nsIWebProgressListener))
    throw Components.results.NS_ERROR_NO_INTERFACE;

  return this;
};


/**
 * Called when this file is parsed, by the last line. Set up initial objects,
 * do version checking, and set up listeners for browser xul load and location
 * changes.
 */
Scriptish_BrowserUI.init = function() {
  this.menuCommanders = [];
  this.currentMenuCommander = null;

  window.addEventListener("load", Scriptish_hitch(this, "chromeLoad"), false);
  window.addEventListener("unload", Scriptish_hitch(this, "chromeUnload"), false);
};

/**
 * The browser XUL has loaded. Find the elements we need and set up our
 * listeners and wrapper objects.
 */
Scriptish_BrowserUI.chromeLoad = function(e) {
  // get all required DOM elements
  this.tabBrowser = document.getElementById("content");
  this.statusImage = document.getElementById("gm-status-image");
  this.statusLabel = document.getElementById("gm-status-label");
  this.statusPopup = document.getElementById("gm-status-popup");
  this.statusEnabledItem = document.getElementById("gm-status-enabled-item");
  this.generalMenuEnabledItem = document.getElementById("gm-general-menu-enabled-item");
  this.bundle = document.getElementById("gm-browser-bundle");

  // update visual status when enabled state changes
  this.enabledWatcher = Scriptish_hitch(this, "refreshStatus");
  Scriptish_prefRoot.watch("enabled", this.enabledWatcher);

  // hook various events
  document.getElementById("appcontent").addEventListener(
    "DOMContentLoaded", Scriptish_hitch(this, "contentLoad"), true);
  document.getElementById("sidebar").addEventListener(
    "DOMContentLoaded", Scriptish_hitch(this, "contentLoad"), true);
  document.getElementById("contentAreaContextMenu").addEventListener(
    "popupshowing", Scriptish_hitch(this, "contextMenuShowing"), false);
  document.getElementById("menu_ToolsPopup").addEventListener(
    "popupshowing", Scriptish_hitch(this, "toolsMenuShowing"), false);

  // listen for clicks on the install bar
  Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService)
            .addObserver(this, "install-userscript", true);

  // we use this to determine if we are the active window sometimes
  this.winWat = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                          .getService(Components.interfaces.nsIWindowWatcher);

  // this gives us onLocationChange
  this.tabBrowser.addProgressListener(this,
    Components.interfaces.nsIWebProgress.NOTIFY_LOCATION);

  // update enabled icon
  this.refreshStatus();

  // register for notifications from scriptish-service about ui type things
  var gmSvc = Components.classes["@scriptish.erikvold.com/scriptish-service;1"]
                  .getService().wrappedJSObject;
  this.gmSvc = gmSvc;

  // check if GM was updated/installed
  setTimeout(function() {gmSvc.updateVersion()}, 100);
};

Scriptish_BrowserUI.showUserscriptList = function() {
  var tools = {};
  Components.utils.import(
    "resource://scriptish/utils/Scriptish_showUserscriptList.js", tools);
  tools.Scriptish_showUserscriptList();
}

/**
 * registerMenuCommand
 */
Scriptish_BrowserUI.registerMenuCommand = function(menuCommand) {
  var commander = this.getCommander(menuCommand.window);

  commander.registerMenuCommand(menuCommand.name,
                                menuCommand.doCommand,
                                menuCommand.accelKey,
                                menuCommand.accelModifiers,
                                menuCommand.accessKey);
};

/**
 * Gets called when a DOMContentLoaded event occurs somewhere in the browser.
 * If that document is in in the top-level window of the focused tab, find
 * it's menu items and activate them.
 */
Scriptish_BrowserUI.contentLoad = function(e) {
  var tools = {};
  Components.utils.import(
      "resource://scriptish/utils/Scriptish_isGreasemonkeyable.js", tools);

  if (!Scriptish_getEnabled()) return;

  var safeWin = e.target.defaultView;
  var unsafeWin = safeWin.wrappedJSObject;
  var href = safeWin.location.href;

  if (tools.Scriptish_isGreasemonkeyable(href)) {
    // if this content load is in the focused tab, attach the menuCommaander
    if (unsafeWin == this.tabBrowser.selectedBrowser.contentWindow) {
      var commander = this.getCommander(safeWin);
      this.currentMenuCommander = commander;
      this.currentMenuCommander.attach();
    }

    this.gmSvc.domContentLoaded(safeWin, window, this);

    safeWin.addEventListener("pagehide", Scriptish_hitch(this, "contentUnload"), false);
  }

  // Show the scriptish install banner if we are navigating to a .user.js
  // file in a top-level tab.  If the file was previously cached it might have
  // been given a number after .user, like gmScript.user-12.js
  if (safeWin == safeWin.top &&
      href.match(/\.user(?:-\d+)?\.js$/) &&
      !/text\/html/i.test(safeWin.document.contentType)) {
    var browser = this.tabBrowser.getBrowserForDocument(safeWin.document);
    this.showInstallBanner(browser);
  }
};


/**
 * Shows the install banner across the top of the tab that is displayed when
 * a user selects "show script source" in the install dialog.
 */
Scriptish_BrowserUI.showInstallBanner = function(browser) {
  var greeting = this.bundle.getString("greeting.msg");

  var notificationBox = this.tabBrowser.getNotificationBox(browser);

  // Remove existing notifications. Notifications get removed
  // automatically onclick and on page navigation, but we need to remove
  // them ourselves in the case of reload, or they stack up.
  for (var i = 0, child; child = notificationBox.childNodes[i]; i++) {
    if (child.getAttribute("value") == "install-userscript") {
      notificationBox.removeNotification(child);
    }
  }

  var notification = notificationBox.appendNotification(
    greeting,
    "install-userscript",
    "chrome://scriptish/skin/icon_small.png",
    notificationBox.PRIORITY_WARNING_MEDIUM,
    [{
      label: this.bundle.getString("greeting.btn"),
      accessKey: this.bundle.getString("greeting.btnAccess"),
      popup: null,
      callback: Scriptish_hitch(this, "installCurrentScript")
    }]
  );
};

/**
 * Called from scriptish service when we should load a user script.
 */
Scriptish_BrowserUI.startInstallScript = function(uri, timer) {
  if (!timer) {
    // docs for nsicontentpolicy say we're not supposed to block, so short
    // timer.
    setTimeout(function() { Scriptish_BrowserUI.startInstallScript(uri, true) }, 0);

    return;
  }

  var tools = {};
  Components.utils.import("resource://scriptish/script/scriptdownloader.js", tools);

  this.scriptDownloader_ = new tools.ScriptDownloader(window, uri, this.bundle);
  this.scriptDownloader_.startInstall();
};


/**
 * Open the tab to show the contents of a script and display the banner to let
 * the user install it.
 */
Scriptish_BrowserUI.showScriptView = function(scriptDownloader) {
  this.scriptDownloader_ = scriptDownloader;

  var tab = this.tabBrowser.addTab(scriptDownloader.script.previewURL);
  var browser = this.tabBrowser.getBrowserForTab(tab);

  this.tabBrowser.selectedTab = tab;
};

/**
 * Implements nsIObserve.observe. Right now we're only observing our own
 * install-userscript, which happens when the install bar is clicked.
 */
Scriptish_BrowserUI.observe = function(subject, topic, data) {
  if (topic == "install-userscript") {
    if (window == this.winWat.activeWindow) {
      this.installCurrentScript();
    }
  } else {
    throw new Error("Unexpected topic received: {" + topic + "}");
  }
};

/**
 * Handles the install button getting clicked.
 */
Scriptish_BrowserUI.installCurrentScript = function() {
  this.scriptDownloader_.installScript();
};

Scriptish_BrowserUI.installScript = function(script){
  Scriptish_getConfig().install(script);
  this.showHorrayMessage(script.name);
};

/**
 * The browser's location has changed. Usually, we don't care. But in the case
 * of tab switching we need to change the list of commands displayed in the
 * User Script Commands submenu.
 */
Scriptish_BrowserUI.onLocationChange = function(a,b,c) {
  if (this.currentMenuCommander != null) {
    this.currentMenuCommander.detach();
    this.currentMenuCommander = null;
  }

  var menuCommander = this.getCommander(this.tabBrowser.selectedBrowser.
                                        contentWindow);

  if (menuCommander) {
    this.currentMenuCommander = menuCommander;
    this.currentMenuCommander.attach();
  }
};

/**
 * A content document has unloaded. We need to remove it's menuCommander to
 * avoid leaking it's memory.
 */
Scriptish_BrowserUI.contentUnload = function(e) {
  if (e.persisted || !this.menuCommanders || 0 == this.menuCommanders.length) {
    return;
  }

  var unsafeWin = e.target.defaultView;

  // looping over commanders rather than using getCommander because we need
  // the index into commanders.splice.
  for (var i = 0, item; item = this.menuCommanders[i]; i++) {
    if (item.win != unsafeWin) {
      continue;
    }

    if (item.commander == this.currentMenuCommander) {
      this.currentMenuCommander.detach();
      this.currentMenuCommander = null;
    }

    this.menuCommanders.splice(i, 1);

    break;
  }
};

/**
 * The browser XUL has unloaded. We need to let go of the pref watcher so
 * that a non-existant window is not informed when scriptish enabled state
 * changes. And we need to let go of the progress listener so that we don't
 * leak it's memory.
 */
Scriptish_BrowserUI.chromeUnload = function() {
  Scriptish_prefRoot.unwatch("enabled", this.enabledWatcher);
  this.tabBrowser.removeProgressListener(this);
  delete this.menuCommanders;
};

/**
 * Called when the content area context menu is showing. We figure out whether
 * to show our context items.
 */
Scriptish_BrowserUI.contextMenuShowing = function() {
  var contextItem = document.getElementById("view-userscript");
  var contextSep = document.getElementById("install-userscript-sep");

  var culprit = document.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a") {
     culprit = culprit.parentNode;
  }

  contextItem.hidden =
    contextSep.hidden =
    !this.getUserScriptLinkUnderPointer();
};


Scriptish_BrowserUI.getUserScriptLinkUnderPointer = function() {
  var culprit = document.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a") {
     culprit = culprit.parentNode;
  }

  if (!culprit || !culprit.href ||
      !culprit.href.match(/\.user\.js(\?|$)/i)) {
    return null;
  }

  var ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);
  var uri = ioSvc.newURI(culprit.href, null, null);

  return uri;
};

Scriptish_BrowserUI.toolsMenuShowing = function() {
  var installItem = document.getElementById("userscript-tools-install");
  var hidden = true;

  if (window._content && window._content.location &&
      window.content.location.href.match(/\.user\.js(\?|$)/i)) {
    hidden = false;
  }

  // Better to use hidden than collapsed because collapsed still allows you to
  // select the item using keyboard navigation, but hidden doesn't.
  installItem.setAttribute("hidden", hidden.toString());
};


/**
 * Helper method which gets the menuCommander corresponding to a given
 * document
 */
Scriptish_BrowserUI.getCommander = function(unsafeWin) {
  for (var i = 0; i < this.menuCommanders.length; i++) {
    if (this.menuCommanders[i].win == unsafeWin) {
      return this.menuCommanders[i].commander;
    }
  }

  var tools = {};
  Components.utils.import("resource://scriptish/menucommander.js", tools);

  // no commander found. create one and add it.
  var commander = new tools.Scriptish_MenuCommander(document);
  this.menuCommanders.push({win:unsafeWin, commander:commander});

  return commander;
};

function Scriptish_showGeneralPopup(aEvent) {
  // set the enabled/disabled state
  Scriptish_BrowserUI.generalMenuEnabledItem.setAttribute(
      "checked", Scriptish_getEnabled());
}

function Scriptish_showPopup(aEvent) {
  function urlsOfAllFrames(contentWindow) {
    function collect(contentWindow) {
      urls = urls.concat(urlsOfAllFrames(contentWindow));
    }
    var urls = [contentWindow.location.href];
    Array.prototype.slice.call(contentWindow.frames).forEach(collect);
    return urls;
  }

  function uniq(a) {
    var seen = {}, list = [], item;
    for (var i = 0; i < a.length; i++) {
      item = a[i];
      if (!seen.hasOwnProperty(item))
        seen[item] = list.push(item);
    }
    return list;
  }

  function scriptsMatching(urls) {

    function testMatchURLs(script) {

      function testMatchURL(url) {
        return script.matchesURL(url);
      }

      return urls.some(testMatchURL);
    }

    return Scriptish_getConfig().getMatchingScripts(testMatchURLs);
  }

  function appendScriptToPopup(script) {
    if (script.needsUninstall) return;
    var mi = document.createElement("menuitem");
    mi.setAttribute("label", script.name);
    mi.script = script;
    mi.setAttribute("type", "checkbox");
    mi.setAttribute("checked", script.enabled.toString());
    popup.insertBefore(mi, tail);
  }

  var popup = aEvent.target;
  var tail = document.getElementById("gm-status-no-scripts-sep");

  // set the enabled/disabled state
  Scriptish_BrowserUI.statusEnabledItem.setAttribute(
      "checked", Scriptish_getEnabled());

  // remove all the scripts from the list
  for (var i = popup.childNodes.length - 1; i >= 0; i--) {
    var node = popup.childNodes[i];
    if (node.script || node.getAttribute("value") == "hack") {
      popup.removeChild(node);
    }
  }

  var urls = uniq( urlsOfAllFrames( getBrowser().contentWindow ));
  var runsOnTop = scriptsMatching( [urls.shift()] ); // first url = top window
  var runsFramed = scriptsMatching( urls ); // remainder are all its subframes

  // drop all runsFramed scripts already present in runsOnTop
  for (var i = 0; i < runsOnTop.length; i++) {
    var j = 0, item = runsOnTop[i];
    while (j < runsFramed.length) {
      if (item === runsFramed[j]) {
        runsFramed.splice(j, 1);
      } else {
        j++;
      }
    }
  }

  // build the new list of scripts
  if (runsFramed.length) {
    runsFramed.forEach(appendScriptToPopup);
    if (runsOnTop.length) { // only add the separator if there is stuff below
      var separator = document.createElement("menuseparator");
      separator.setAttribute("value", "hack"); // remove it in the loop above
      popup.insertBefore(separator, tail);
    }
  }
  runsOnTop.forEach(appendScriptToPopup);

  var foundInjectedScript = !!(runsFramed.length + runsOnTop.length);
  document.getElementById("gm-status-no-scripts").collapsed = foundInjectedScript;
}

/**
 * Handle clicking one of the items in the popup. Left-click toggles the enabled
 * state, rihgt-click opens in an editor.
 */
function Scriptish_popupClicked(aEvent) {
  var tools = {};

  if (aEvent.button == 0 || aEvent.button == 2) {
    var script = aEvent.target.script;
    if (!script) return;

    if (aEvent.button == 0) // left-click: toggle enabled state
      script.enabled =! script.enabled;
    else { // right-click: open in editor
      Components.utils.import("resource://scriptish/utils/Scriptish_openInEditor.js", tools);
      tools.Scriptish_openInEditor(script, window);
    }

    closeMenus(aEvent.target);
  }
}

/**
 * Scriptish's enabled state has changed, either as a result of clicking
 * the icon in this window, clicking it in another window, or even changing
 * the mozilla preference that backs it directly.
 */
Scriptish_BrowserUI.refreshStatus = function() {
  if (Scriptish_getEnabled()) {
    this.statusImage.src = "chrome://scriptish/skin/icon_small.png";
    this.statusImage.tooltipText = this.bundle.getString("tooltip.enabled");
  } else {
    this.statusImage.src = "chrome://scriptish/skin/icon_small_disabled.png";
    this.statusImage.tooltipText = this.bundle.getString("tooltip.disabled");
  }

  this.statusImage.style.opacity = "1.0";
};

Scriptish_BrowserUI.openChromeWindow = function(url) {
  var windowWatcher = Components
    .classes["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Components.interfaces.nsIWindowWatcher);
  windowWatcher.openWindow(
    window, url, null,
    "chrome,dependent,centerscreen,resizable,dialog", null
  );
}

Scriptish_BrowserUI.newUserScript = function() {
  Scriptish_BrowserUI.openChromeWindow("chrome://scriptish/content/newscript.xul");
};

Scriptish_BrowserUI.openOptionsWin = function() {
  Scriptish_BrowserUI.openChromeWindow("chrome://scriptish/content/options.xul");
};

Scriptish_BrowserUI.showStatus = function(message, autoHide) {
  if (this.statusLabel.collapsed) {
    this.statusLabel.collapsed = false;
  }

  message += " ";

  var box = document.createElement("vbox");
  var label = document.createElement("label");
  box.style.position = "fixed";
  box.style.left = "-10000px";
  box.style.top = "-10000px";
  box.style.border = "5px solid red";
  box.appendChild(label);
  document.documentElement.appendChild(box);
  label.setAttribute("value", message);

  var current = parseInt(this.statusLabel.style.width);
  this.statusLabel.value = message;
  var max = label.boxObject.width;

  var tools = {};
  Components.utils.import("resource://scriptish/accelimation.js", tools);
  this.showAnimation = new tools.Accelimation(
    window, this.statusLabel.style, "width", max, 300, 2, "px");
  this.showAnimation.onend = Scriptish_hitch(this, "showStatusAnimationEnd", autoHide);
  this.showAnimation.start();
};

Scriptish_BrowserUI.showStatusAnimationEnd = function(autoHide) {
  this.showAnimation = null;

  if (autoHide) {
    this.setAutoHideTimer();
  }
};

Scriptish_BrowserUI.setAutoHideTimer = function() {
  if (this.autoHideTimer) {
    window.clearTimeout(this.autoHideTimer);
  }

  this.autoHideTimer = window.setTimeout(Scriptish_hitch(this, "hideStatus"), 3000);
};

Scriptish_BrowserUI.hideStatusImmediately = function() {
  if (this.showAnimation) {
    this.showAnimation.stop();
    this.showAnimation = null;
  }

  if (this.hideAnimation) {
    this.hideAnimation.stop();
    this.hideAnimation = null;
  }

  if (this.autoHideTimer) {
    window.clearTimeout(this.autoHideTimer);
    this.autoHideTimer = null;
  }

  this.statusLabel.style.width = "0";
  this.statusLabel.collapsed = true;
};

Scriptish_BrowserUI.hideStatus = function() {
  if (!this.hideAnimation) {
    this.autoHideTimer = null;

    var tools = {};
    Components.utils.import("resource://scriptish/accelimation.js", tools);
    this.hideAnimation = new tools.Accelimation(
      window, this.statusLabel.style, "width", 0, 300, 2, "px");
    this.hideAnimation.onend = Scriptish_hitch(this, "hideStatusAnimationEnd");
    this.hideAnimation.start();
  }
};

Scriptish_BrowserUI.hideStatusAnimationEnd = function() {
  this.hideAnimation = null;
  this.statusLabel.collapsed = true;
};

// necessary for webProgressListener implementation
Scriptish_BrowserUI.onProgressChange = function(webProgress,b,c,d,e,f){};
Scriptish_BrowserUI.onStateChange = function(a,b,c,d){};
Scriptish_BrowserUI.onStatusChange = function(a,b,c,d){};
Scriptish_BrowserUI.onSecurityChange = function(a,b,c){};
Scriptish_BrowserUI.onLinkIconAvailable = function(a){};

Scriptish_BrowserUI.showHorrayMessage = function(scriptName) {
  this.showStatus("'" + scriptName + "' " + this.bundle.getString("statusbar.installed"), true);
};

Scriptish_BrowserUI.installMenuItemClicked = function() {
  Scriptish_BrowserUI.startInstallScript(
    gBrowser.currentURI
  );
};

Scriptish_BrowserUI.viewContextItemClicked = function() {
  var tools = {};
  Components.utils.import("resource://scriptish/scriptdownloader.js", tools);

  var uri = Scriptish_BrowserUI.getUserScriptLinkUnderPointer();

  this.scriptDownloader_ = new tools.ScriptDownloader(window, uri, this.bundle);
  this.scriptDownloader_.startViewScript();
};

Scriptish_BrowserUI.init();
