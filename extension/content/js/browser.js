var Scriptish_BrowserUI = {
  menuCommanders: [],
  currentMenuCommander: null
};
var Scriptish_BrowserUIM;

(function(inc, tools){
inc("resource://scriptish/content/browser.js");
inc("resource://scriptish/prefmanager.js");
inc("resource://scriptish/scriptish.js");
inc("resource://scriptish/utils/Scriptish_hitch.js", tools);
inc("resource://scriptish/utils/Scriptish_stringBundle.js");
inc("resource://scriptish/utils/Scriptish_openInEditor.js");
inc("resource://scriptish/utils/Scriptish_getURLsForContentWindow.js");
inc("resource://scriptish/config/configdownloader.js");
inc("resource://scriptish/menucommander.js");
inc("resource://scriptish/logging.js");
inc("resource://scriptish/constants.js", tools);
var Ci = tools.Ci;
var Services = tools.Services;
var gmSvc = Services.scriptish;
var $ = function(aID) document.getElementById(aID);
function hitch() tools.Scriptish_hitch.apply(null, arguments);

Scriptish_BrowserUI.QueryInterface = tools.XPCOMUtils.generateQI([
    Ci.nsISupports, Ci.nsISupportsWeakReference, Ci.nsIWebProgressListener]);

Scriptish_BrowserUI.tbBtnSetup = function() {
  var statusEnabledItem = $("scriptish-tb-enabled-item");
  $("scriptish-button").addEventListener(
      "click", hitch(Scriptish_BrowserUIM, "onIconClick"), false);

  statusEnabledItem.setAttribute("label", Scriptish_stringBundle("statusbar.enabled"));
  statusEnabledItem.setAttribute("accesskey", Scriptish_stringBundle("statusbar.enabled.accesskey"));
  statusEnabledItem.addEventListener("command", function() { Scriptish_BrowserUIM.onToggleStatus() }, false);

  $("scriptish-tb-no-scripts").setAttribute(
      "label", Scriptish_stringBundle("statusbar.noscripts"));

  var sbCmdsEle = $("scriptish-tb-cmds");
  sbCmdsEle.setAttribute("label", Scriptish_stringBundle("menu.commands"));
  sbCmdsEle.setAttribute("accesskey", Scriptish_stringBundle("menu.commands.accesskey"));
  sbCmdsEle.addEventListener("popupshowing", function(aEvt) { aEvt.stopPropagation() }, true);

  var sbNewUSEle = $("scriptish-tb-new-us");
  sbNewUSEle.setAttribute("label", Scriptish_stringBundle("menu.new"));
  sbNewUSEle.setAttribute("accesskey", Scriptish_stringBundle("menu.new.accesskey"));
  sbNewUSEle.addEventListener("command", function(){ Scriptish_BrowserUIM.newUserScript() }, false);

  var sbShowUSEle = $("scriptish-tb-show-us");
  sbShowUSEle.setAttribute("label", Scriptish_stringBundle("menu.manage"));
  sbShowUSEle.setAttribute("accesskey", Scriptish_stringBundle("menu.manage.accesskey"));
  sbShowUSEle.addEventListener("command", function(){ Scriptish_BrowserUIM.showUserscriptList() }, false);

  var showOptionsEle = $("scriptish-tb-options");
  showOptionsEle.setAttribute("label", Scriptish_stringBundle("options")+"...");
  showOptionsEle.setAttribute("accesskey", Scriptish_stringBundle("menu.options.accesskey"));
  showOptionsEle.addEventListener("command", function(){ Scriptish_BrowserUIM.openOptionsWin() }, false);

  var sbPopUp = $("scriptish-tb-popup");
  sbPopUp.addEventListener("click", function(aEvt) {
    Scriptish_popupClicked(aEvt);
    aEvt.stopPropagation();
  }, false);
  sbPopUp.addEventListener("popupshowing", function(aEvt) {
    Scriptish_showPopup(aEvt);
    aEvt.stopPropagation();
  }, false);

  // update enabled icon
  Scriptish_BrowserUIM.refreshStatus();

  (Scriptish_BrowserUI.tbBtnSetup = Scriptish_BrowserUI.reattachMenuCmds)();
}

/**
 * The browser XUL has loaded. Find the elements we need and set up our
 * listeners and wrapper objects.
 */
Scriptish_BrowserUI.chromeLoad = function(e) {
  Scriptish_BrowserUIM = new Scriptish_BrowserUIM(window, this);

  var tbBtnAdd = function(evt) {
    if ("scriptish-tb-item" != evt.target.id) return;
    Scriptish_BrowserUI.tbBtnSetup();
  }
  gNavToolbox.addEventListener("DOMNodeInserted", tbBtnAdd, false);
  $("addon-bar").addEventListener("DOMNodeInserted", tbBtnAdd, false);
  if ($("scriptish-tb-item")) this.tbBtnSetup();

  // get all required DOM elements
  this.toolsMenuEnabledItem = $("scriptish-tools-enabled-item");
  this.contextItem = $("scriptish-context-menu-viewsource");

  var tmEle = $('scriptish_general_menu');
  tmEle.setAttribute("label", Scriptish_stringBundle("menu.title"));
  tmEle.setAttribute("accesskey", Scriptish_stringBundle("menu.title.accesskey"));

  var tmStatusEle = $('scriptish-tools-enabled-item');
  tmStatusEle.setAttribute("label", Scriptish_stringBundle("statusbar.enabled"));
  tmStatusEle.setAttribute("accesskey", Scriptish_stringBundle("statusbar.enabled.accesskey"));

  $("scriptish-tools-menupop").addEventListener("popupshowing", function(aEvt) {
    // set the enabled/disabled state
    Scriptish_BrowserUI.toolsMenuEnabledItem.setAttribute(
        "checked", Scriptish.enabled);
    aEvt.stopPropagation();
  }, false);

  this.toolsMenuEnabledItem.addEventListener("command", function() { Scriptish_BrowserUIM.onToggleStatus() }, false);

  var tmCmdsEle = $("scriptish-tools-commands");
  tmCmdsEle.setAttribute("label", Scriptish_stringBundle("menu.commands"));
  tmCmdsEle.setAttribute("accesskey", Scriptish_stringBundle("menu.commands.accesskey"));
  tmCmdsEle.addEventListener("popupshowing", function(aEvt) { aEvt.stopPropagation() }, false);

  var tmNewUSEle = $("scriptish-tools-new");
  tmNewUSEle.setAttribute("label", Scriptish_stringBundle("menu.new"));
  tmNewUSEle.setAttribute("accesskey", Scriptish_stringBundle("menu.new.accesskey"));
  tmNewUSEle.addEventListener("command", function(){ Scriptish_BrowserUIM.newUserScript() }, false);

  var tmShowUSEle = $("scriptish-tools-show-us");
  tmShowUSEle.setAttribute("label", Scriptish_stringBundle("menu.manage"));
  tmShowUSEle.setAttribute("accesskey", Scriptish_stringBundle("menu.manage.accesskey"));
  tmShowUSEle.addEventListener("command", function(){ Scriptish_BrowserUIM.showUserscriptList() }, false);

  this.contextItem.setAttribute("label", Scriptish_stringBundle("menu.show"));
  this.contextItem.setAttribute("accesskey", Scriptish_stringBundle("menu.show.accesskey"));
  this.contextItem.addEventListener("command", function(aEvt) {
    Scriptish_BrowserUI.viewContextItemClicked(aEvt);
  }, false)

  // update visual status when enabled state changes
  this.statusWatcher = hitch(Scriptish_BrowserUIM, "refreshStatus");
  Scriptish_prefRoot.watch("enabled", this.statusWatcher);

  // hook various events
  $("appcontent").addEventListener(
      "DOMContentLoaded", hitch(this, "contentLoad"), true);
  ($("sidebar") || $("sidebar-box")).addEventListener(
      "DOMContentLoaded", hitch(this, "contentLoad"), true);
  $("contentAreaContextMenu").addEventListener(
      "popupshowing", hitch(this, "contextMenuShowing"), false);

  // this gives us onLocationChange
  gBrowser.addProgressListener(this, Ci.nsIWebProgress.NOTIFY_LOCATION);

  // update enabled icon
  Scriptish_BrowserUIM.refreshStatus();

  // register for notifications from scriptish-service about ui type things
  gmSvc.updateChk && setTimeout(function() gmSvc.updateChk(), 100);
}

Scriptish_BrowserUI.registerMenuCommand = function(menuCommand) {
  var commander = this.getCommander(menuCommand.window);
  commander.registerMenuCommand(
      menuCommand.name, menuCommand.doCommand, menuCommand.accelKey,
      menuCommand.accelModifiers, menuCommand.accessKey);
}

/**
 * Gets called when a DOMContentLoaded event occurs somewhere in the browser.
 * If that document is in in the top-level window of the focused tab, find
 * it's menu items and activate them.
 */
Scriptish_BrowserUI.contentLoad = function(e) {
  if (!Scriptish.enabled) return;
  var safeWin = e.target.defaultView;
  var unsafeWin = safeWin.wrappedJSObject;
  var href = safeWin.location.href;

  if (Scriptish.isGreasemonkeyable(href)) {
    // if this content load is in the focused tab, attach the menuCommaander
    if (unsafeWin == gBrowser.selectedBrowser.contentWindow) {
      var commander = this.getCommander(safeWin);
      this.currentMenuCommander = commander;
      this.currentMenuCommander.attach();
    }

    gmSvc.domContentLoaded(safeWin, window);
    safeWin.addEventListener("pagehide", hitch(this, "contentUnload"), false);
  }

  // Show the scriptish install banner if we are navigating to a .user.js
  // file in a top-level tab.  If the file was previously cached it might have
  // been given a number after .user, like gmScript.user-12.js
  if (safeWin == safeWin.top && href.match(/\.user(?:-\d+)?\.js$/)
      && !/text\/html/i.test(safeWin.document.contentType)) {
    var browser = gBrowser.getBrowserForDocument(safeWin.document);
    this.showInstallBanner(browser);
  }
}


/**
 * Shows the install banner across the top of the tab that is displayed when
 * a user selects "show script source" in the install dialog.
 */
Scriptish_BrowserUI.showInstallBanner = function(browser) {
  var greeting = Scriptish_stringBundle("greeting.msg");
  var notificationBox = gBrowser.getNotificationBox(browser);

  // Remove existing notifications. Notifications get removed
  // automatically onclick and on page navigation, but we need to remove
  // them ourselves in the case of reload, or they stack up.
  for (var i = 0, child; child = notificationBox.childNodes[i]; i++) {
    if (child.getAttribute("value") == "install-userscript")
      notificationBox.removeNotification(child);
  }

  var notification = notificationBox.appendNotification(
    greeting,
    "install-userscript",
    "chrome://scriptish/skin/icon_16.png",
    notificationBox.PRIORITY_WARNING_MEDIUM,
    [{label: Scriptish_stringBundle("greeting.btn"),
      accessKey: Scriptish_stringBundle("greeting.btnAccess"),
      popup: null,
      callback: hitch(this, "installCurrentScript")
    }]
  );
}

/**
 * Open the tab to show the contents of a script and display the banner to let
 * the user install it.
 */
Scriptish_BrowserUI.showScriptView = function(aSD, aURL) {
  this.scriptDownloader_ = aSD;
  gBrowser.selectedTab = gBrowser.addTab(aURL);
}

/**
 * Implements nsIObserve.observe. Right now we're only observing our own
 * install-userscript, which happens when the install bar is clicked.
 */
Scriptish_BrowserUI.observe = function(subject, topic, data) {
  if (topic == "install-userscript")
    if (window == Services.ww.activeWindow) this.installCurrentScript();
  else
    throw new Error("Unexpected topic received: {" + topic + "}");
};

// Handles the install button getting clicked.
Scriptish_BrowserUI.installCurrentScript = function() {
  this.scriptDownloader_.installScript();
}

/**
 * The browser's location has changed. Usually, we don't care. But in the case
 * of tab switching we need to change the list of commands displayed in the
 * User Script Commands submenu.
 */
Scriptish_BrowserUI.onLocationChange = function(a,b,c) {
  this.reattachMenuCmds();
}
Scriptish_BrowserUI.reattachMenuCmds = function() {
  if (this.currentMenuCommander) {
    Scriptish_BrowserUI.currentMenuCommander.detach();
    Scriptish_BrowserUI.currentMenuCommander = null;
  }
  var menuCommander = Scriptish_BrowserUI.getCommander(gBrowser.selectedBrowser.contentWindow);
  if (menuCommander) (Scriptish_BrowserUI.currentMenuCommander = menuCommander).attach();
}

/**
 * A content document has unloaded. We need to remove it's menuCommander to
 * avoid leaking it's memory.
 */
Scriptish_BrowserUI.contentUnload = function(e) {
  if (e.persisted || !this.menuCommanders || 0 == this.menuCommanders.length)
    return;

  var unsafeWin = e.target.defaultView;

  // looping over commanders rather than using getCommander because we need
  // the index into commanders.splice.
  for (var i = 0, item; item = this.menuCommanders[i]; i++) {
    if (item.win != unsafeWin) continue;

    if (item.commander == this.currentMenuCommander) {
      this.currentMenuCommander.detach();
      this.currentMenuCommander = null;
    }

    this.menuCommanders.splice(i, 1);
    break;
  }
}

/**
 * The browser XUL has unloaded. We need to let go of the pref watcher so
 * that a non-existant window is not informed when scriptish enabled state
 * changes. And we need to let go of the progress listener so that we don't
 * leak it's memory.
 */
Scriptish_BrowserUI.chromeUnload = function() {
  Scriptish_prefRoot.unwatch("enabled", this.statusWatcher);
  gBrowser.removeProgressListener(this);
  delete this.menuCommanders;
}

/**
 * Called when the content area context menu is showing. We figure out whether
 * to show our context items.
 */
Scriptish_BrowserUI.contextMenuShowing = function() {
  var contextItem = this.contextItem;
  var contextSep = $("scriptish-context-menu-viewsource-sep");
  var culprit = document.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a")
    culprit = culprit.parentNode;

  contextItem.hidden = contextSep.hidden = !this.getUserScriptLinkUnderPointer();
}


Scriptish_BrowserUI.getUserScriptLinkUnderPointer = function() {
  var culprit = document.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a")
    culprit = culprit.parentNode;

  if (!culprit || !culprit.href || !culprit.href.match(/\.user\.js(\?|$)/i))
    return null;
  return tools.NetUtil.newURI(culprit.href);
}

/**
 * Helper method which gets the menuCommander corresponding to a given
 * document
 */
Scriptish_BrowserUI.getCommander = function(aWin) {
  for (var i = 0; i < this.menuCommanders.length; i++)
    if (this.menuCommanders[i].win === aWin)
      return this.menuCommanders[i].commander;

  // no commander found. create one and add it.
  var commander = new Scriptish_MenuCommander(document);
  this.menuCommanders.push({win: aWin, commander: commander});
  return commander;
}

function Scriptish_showPopup(aEvent) {
  function scriptsMatching(urls) {
    function testMatchURLs(script) {
      return urls.some(function(url) script.matchesURL(url));
    }
    return Scriptish.config.getMatchingScripts(testMatchURLs);
  }

  function appendScriptToPopup(script) {
    if (script.needsUninstall) return;
    var mi = document.createElement("menuitem");
    mi.setAttribute("label", script.name);
    mi.script = script;
    mi.setAttribute("type", "checkbox");
    mi.setAttribute("closemenu", "none");
    mi.setAttribute("checked", script.enabled.toString());
    popup.insertBefore(mi, tail);
  }

  var popup = aEvent.target;
  var tail = $("scriptish-tb-no-scripts-sep");

  // set the enabled/disabled state
  var statusEnabledItem = $("scriptish-tb-enabled-item");
  statusEnabledItem && statusEnabledItem.setAttribute(
      "checked", Scriptish.enabled);

  // remove all the scripts from the list
  for (var i = popup.childNodes.length - 1; i >= 0; i--) {
    var node = popup.childNodes[i];
    if (node.script || node.getAttribute("value") == "hack")
      popup.removeChild(node);
  }

  var urls = Scriptish_getURLsForContentWindow(getBrowser().contentWindow);
  var runsOnTop = scriptsMatching([urls.shift()]); // first url = top window
  var runsFramed = scriptsMatching(urls); // remainder are all its subframes

  // drop all runsFramed scripts already present in runsOnTop
  for (var i = 0; i < runsOnTop.length; i++) {
    var j = 0, item = runsOnTop[i];
    while (j < runsFramed.length) {
      if (item === runsFramed[j]) runsFramed.splice(j, 1);
      else j++;
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

  $("scriptish-tb-no-scripts").collapsed =
      !!(runsFramed.length + runsOnTop.length);
}

/**
 * Handle clicking one of the items in the popup. Left-click toggles the enabled
 * state, rihgt-click opens in an editor.
 */
function Scriptish_popupClicked(aEvt) {
  var script = aEvt.target.script;
  if (!script) return;
  switch (aEvt.button) {
    // left-click
    case 0:
      script.enabled = !script.enabled;
      break;
    // right-click
    case 2:
      Scriptish_openInEditor(script, window);
      $("scriptish-tb-popup").hidePopup();
      break;
  }
}

Scriptish_BrowserUI.viewContextItemClicked = function() {
  Scriptish_configDownloader.startViewScript(
      Scriptish_BrowserUI.getUserScriptLinkUnderPointer());
}

// necessary for webProgressListener implementation
Scriptish_BrowserUI.onProgressChange = function(webProgress,b,c,d,e,f){};
Scriptish_BrowserUI.onStateChange = function(a,b,c,d){};
Scriptish_BrowserUI.onStatusChange = function(a,b,c,d){};
Scriptish_BrowserUI.onSecurityChange = function(a,b,c){};
Scriptish_BrowserUI.onLinkIconAvailable = function(a){};

window.addEventListener("load", hitch(Scriptish_BrowserUI, "chromeLoad"), false);
window.addEventListener("unload", hitch(Scriptish_BrowserUI, "chromeUnload"), false);
})(Components.utils.import, {})
