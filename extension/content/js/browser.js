var Scriptish_BrowserUI = {
  menuCommanders: [],
  currentMenuCommander: null
};
var Scriptish_BrowserUIM;

(function(inc, tools){
inc("resource://scriptish/content/browser.js");
inc("resource://scriptish/prefmanager.js");
inc("resource://scriptish/scriptish.js");
inc("resource://scriptish/utils/Scriptish_installUri.js");
inc("resource://scriptish/utils/Scriptish_openInEditor.js");
inc("resource://scriptish/utils/Scriptish_getURLsForContentWindow.js");
inc("resource://scriptish/utils/Scriptish_getWindowIDs.js");
inc("resource://scriptish/utils/Scriptish_stringBundle.js");
inc("resource://scriptish/config/configdownloader.js");
inc("resource://scriptish/menucommander.js");
inc("resource://scriptish/logging.js");
inc("resource://scriptish/constants.js", tools);
var Ci = tools.Ci;
var Services = tools.Services;
var gmSvc = Services.scriptish;
var $ = function(aID) document.getElementById(aID);

Scriptish_BrowserUI.QueryInterface = tools.XPCOMUtils.generateQI([
    Ci.nsISupports, Ci.nsISupportsWeakReference, Ci.nsIWebProgressListener]);

Scriptish_BrowserUI.tbBtnSetup = function() {
  var statusEnabledItem = $("scriptish-tb-enabled-brd");
  $("scriptish-button-brd").setAttribute(
      "onclick", "Scriptish_BrowserUIM.onIconClick(event)");

  statusEnabledItem.setAttribute("label",
      Scriptish_stringBundle("statusbar.enabled"));
  statusEnabledItem.setAttribute("accesskey",
      Scriptish_stringBundle("statusbar.enabled.ak"));
  statusEnabledItem.setAttribute("oncommand",
      "Scriptish_BrowserUIM.onToggleStatus()");

  $("scriptish-tb-no-scripts-brd").setAttribute(
      "label", Scriptish_stringBundle("statusbar.noScripts"));

  var sbCmdsEle = $("scriptish-tb-cmds-brd");
  sbCmdsEle.setAttribute("label", Scriptish_stringBundle("menu.commands"));
  sbCmdsEle.setAttribute("accesskey",
      Scriptish_stringBundle("menu.commands.ak"));
  sbCmdsEle.setAttribute("onpopupshowing", "event.stopPropagation()");

  var sbNewUSEle = $("scriptish-tb-new-us-brd");
  sbNewUSEle.setAttribute("label", Scriptish_stringBundle("menu.new"));
  sbNewUSEle.setAttribute("accesskey", Scriptish_stringBundle("menu.new.ak"));
  sbNewUSEle.setAttribute("oncommand", "Scriptish_BrowserUIM.newUserScript()");

  var sbShowUSEle = $("scriptish-tb-show-us-brd");
  sbShowUSEle.setAttribute("label", Scriptish_stringBundle("menu.manage"));
  sbShowUSEle.setAttribute("accesskey", Scriptish_stringBundle("menu.manage.ak"));
  sbShowUSEle.setAttribute("oncommand",
      "Scriptish_BrowserUIM.showUserscriptList()");

  var showOptionsEle = $("scriptish-tb-options-brd");
  showOptionsEle.setAttribute("label", Scriptish_stringBundle("options")+"...");
  showOptionsEle.setAttribute("accesskey",
      Scriptish_stringBundle("menu.options.ak"));
  showOptionsEle.setAttribute("oncommand",
      "Scriptish_BrowserUIM.openOptionsWin()");

  var sbPopUp = $("scriptish-tb-popup-brd");
  sbPopUp.setAttribute("onclick",
      "Scriptish_popupClicked(event);event.stopPropagation();");
  sbPopUp.setAttribute("onpopupshowing", "Scriptish_showPopup(event);");

  // update enabled icon
  Scriptish_BrowserUIM.refreshStatus();

  delete Scriptish_BrowserUI["tbBtnSetup"];
}

/**
 * The browser XUL has loaded. Find the elements we need and set up our
 * listeners and wrapper objects.
 */
Scriptish_BrowserUI.chromeLoad = function(e) {
  Scriptish_BrowserUIM = new Scriptish_BrowserUIM(window, this);

  this.tbBtnSetup();

  // get all required DOM elements
  this.toolsMenuEnabledItem = $("scriptish-tools-enabled-item");
  this.contextItemInstall = $("scriptish-context-menu-install");
  this.contextItemVS = $("scriptish-context-menu-viewsource");

  var tmEle = $('scriptish_general_menu');
  tmEle.setAttribute("label", Scriptish_stringBundle("menu.title"));
  tmEle.setAttribute("accesskey", Scriptish_stringBundle("menu.title.ak"));

  var tmStatusEle = $('scriptish-tools-enabled-item');
  tmStatusEle.setAttribute("label", Scriptish_stringBundle("statusbar.enabled"));
  tmStatusEle.setAttribute("accesskey", Scriptish_stringBundle("statusbar.enabled.ak"));

  $("scriptish-tools-menupop").addEventListener("popupshowing", function(aEvt) {
    // set the enabled/disabled state
    Scriptish_BrowserUI.toolsMenuEnabledItem.setAttribute(
        "checked", Scriptish.enabled);
  }, false);

  this.toolsMenuEnabledItem.addEventListener("command", function() { Scriptish_BrowserUIM.onToggleStatus() }, false);

  var tmCmdsEle = $("scriptish-tools-commands");
  tmCmdsEle.setAttribute("label", Scriptish_stringBundle("menu.commands"));
  tmCmdsEle.setAttribute("accesskey", Scriptish_stringBundle("menu.commands.ak"));

  var tmNewUSEle = $("scriptish-tools-new");
  tmNewUSEle.setAttribute("label", Scriptish_stringBundle("menu.new"));
  tmNewUSEle.setAttribute("accesskey", Scriptish_stringBundle("menu.new.ak"));
  tmNewUSEle.addEventListener("command", function(){ Scriptish_BrowserUIM.newUserScript() }, false);

  var tmShowUSEle = $("scriptish-tools-show-us");
  tmShowUSEle.setAttribute("label", Scriptish_stringBundle("menu.manage"));
  tmShowUSEle.setAttribute("accesskey", Scriptish_stringBundle("menu.manage.ak"));
  tmShowUSEle.addEventListener("command", function(){ Scriptish_BrowserUIM.showUserscriptList() }, false);

  this.contextItemInstall.setAttribute("label", Scriptish_stringBundle("menu.install"));
  this.contextItemInstall.setAttribute("accesskey", Scriptish_stringBundle("menu.install.ak"));
  this.contextItemInstall.addEventListener("command", function(aEvt) {
    Scriptish_installUri(
        Scriptish_BrowserUI.getUserScriptLinkUnderPointer(), window);
  }, false)

  this.contextItemVS.setAttribute("label", Scriptish_stringBundle("menu.show"));
  this.contextItemVS.setAttribute("accesskey", Scriptish_stringBundle("menu.show.ak"));
  this.contextItemVS.addEventListener("command", function(aEvt) {
    Scriptish_BrowserUI.viewContextItemClicked(aEvt);
  }, false)

  // update visual status when enabled state changes
  this.statusWatcher = Scriptish_BrowserUIM.refreshStatus.bind(Scriptish_BrowserUIM);
  Scriptish_prefRoot.watch("enabled", this.statusWatcher);

  // hook on to context menu popup event
  $("contentAreaContextMenu").addEventListener(
      "popupshowing", this.contextMenuShowing.bind(this), false);

  // this gives us onLocationChange
  gBrowser.addProgressListener(this);

  // update enabled icon
  Scriptish_BrowserUIM.refreshStatus();

  // register for notifications from scriptish-service about ui type things
  gmSvc.updateChk && setTimeout(function() gmSvc.updateChk(), 1000);
}

Scriptish_BrowserUI.registerMenuCommand = function(menuCommand) {
  var commander = this.getCommander(menuCommand.winID);
  return commander.registerMenuCommand(
      menuCommand.name, menuCommand.doCommand, menuCommand.accelKey,
      menuCommand.accelModifiers, menuCommand.accessKey);
}

Scriptish_BrowserUI.unregisterMenuCommand = function(commandUUID, aWinID) {
  var commander = this.getCommander(aWinID);
  return commander.unregisterMenuCommand(commandUUID);
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
      accessKey: Scriptish_stringBundle("greeting.btn.ak"),
      popup: null,
      callback: this.installCurrentScript.bind(this)
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
  var menuCommander = Scriptish_BrowserUI.getCommander(
      Scriptish_getWindowIDs(gBrowser.selectedBrowser.contentWindow).innerID);
  if (menuCommander) (Scriptish_BrowserUI.currentMenuCommander = menuCommander).attach();
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
  let culprit = document.popupNode;
  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a")
    culprit = culprit.parentNode;

  this.contextItemInstall.hidden
      = this.contextItemVS.hidden
      = $("scriptish-context-menu-viewsource-sep").hidden
      = !this.getUserScriptLinkUnderPointer();
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
Scriptish_BrowserUI.getCommander = function(aWinID) {
  for (var i = 0; i < this.menuCommanders.length; i++)
    if (this.menuCommanders[i].winID === aWinID)
      return this.menuCommanders[i].commander;

  // no commander found. create one and add it.
  var commander = new Scriptish_MenuCommander(document);
  this.menuCommanders.push({winID: aWinID, commander: commander});
  return commander;
}

Scriptish_BrowserUI.viewContextItemClicked = function() {
  Scriptish_configDownloader.startViewScript(
      Scriptish_BrowserUI.getUserScriptLinkUnderPointer());
}

window.addEventListener("load", Scriptish_BrowserUI.chromeLoad.bind(Scriptish_BrowserUI), false);
window.addEventListener("unload", Scriptish_BrowserUI.chromeUnload.bind(Scriptish_BrowserUI), false);
})(Components.utils.import, {})

/**
 * Handle clicking one of the items in the popup. Left-click toggles the enabled
 * state, right-click opens in an editor.
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
      document.getElementById("scriptish-tb-popup").hidePopup();
      break;
  }
}

function Scriptish_showPopup(aEvent) {
  var $ = function(aID) document.getElementById(aID);
  Scriptish_BrowserUI.reattachMenuCmds();

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
