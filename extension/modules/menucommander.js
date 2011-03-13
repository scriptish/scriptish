var EXPORTED_SYMBOLS = ["Scriptish_MenuCommander"];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/logging.js");

function Scriptish_MenuCommander(aDoc) {
  this.doc = aDoc;
  this.$ = function(aID) aDoc.getElementById(aID);
  this.keyset = this.$("mainKeyset");
  this.keys = [];
  this.attached = false;
  this.tbMenuItems = [];

  this.toolsMenu = this.$("scriptish-tools-commands");
  this.toolsMenuPopup = this.toolsMenu.firstChild;
  this.toolsMenuItems = [];
}

Scriptish_MenuCommander.prototype.getTBMenu = function() {
  var tbMenu = this.$("scriptish-tb-cmds");
  return tbMenu && tbMenu.firstChild;
}

Scriptish_MenuCommander.prototype.registerMenuCommand =
    function(commandName, commandFunc, accelKey, accelModifiers, accessKey) {
  // Protection against item duplication
  for (var i = 0; i < this.tbMenuItems.length; i++)
    if (this.tbMenuItems[i].getAttribute("label") == commandName)
      return this.tbMenuItems[i].getAttribute("uuid");

  var commandUUID = Services.uuid.generateUUID().toString();

  // create toolbar button menu item
  var menuItem =
      this.createMenuItem(commandUUID, commandName, commandFunc, accessKey);
  this.tbMenuItems.push(menuItem);

  // create tools menu menu item
  var menuItem2 =
      this.createMenuItem(commandUUID, commandName, commandFunc, accessKey);
  this.toolsMenuItems.push(menuItem2);

  if (accelKey) {
    var key =
        this.createKey(commandUUID, commandFunc, accelKey, accelModifiers, menuItem);
    this.keys.push(key);
  }

  // if this menucommander is for the current document, then we should add the
  // elements immediately. otherwise it will be added in attach()
  if (this.attached) {
    var menuPopup = this.getTBMenu();
    menuPopup && menuPopup.appendChild(menuItem);
    this.toolsMenuPopup.appendChild(menuItem2);
    if (accelKey) this.keyset.appendChild(key);
    this.setDisabled(false);
  }

  return commandUUID;
}

Scriptish_MenuCommander.prototype.unregisterMenuCommand = function(commandUUID) {
  var removedSomething = false;

  // remove key
  var keys = this.keys;
  for (var i = keys.length - 1; ~i; i--) {
    if (commandUUID == keys[i].getAttribute("uuid")) {
      this.keyset.removeChild(keys[i]);
      keys.splice(i, 1);
      removedSomething = true;
      break;
    }
  }

  // remove tools menu menu item
  var toolsMenuItems = this.toolsMenuItems;
  for (var i = toolsMenuItems.length - 1; ~i; i--) {
    if (commandUUID == toolsMenuItems[i].getAttribute("uuid")) {
      this.toolsMenuPopup.removeChild(toolsMenuItems[i]);
      toolsMenuItems.splice(i, 1);
      removedSomething = true;
      break;
    }
  }

  // remove toolbar button menu item
  var menuPopup = this.getTBMenu();
  if (menuPopup) {
    let tbMenuItems = this.tbMenuItems;
    for (var i = tbMenuItems.length - 1; ~i; i--) {
      if (commandUUID == tbMenuItems[i].getAttribute("uuid")) {
        try {menuPopup.removeChild(tbMenuItems[i]);}
        catch (e) {} // TB was added but not opened before the user changed pages
        tbMenuItems.splice(i, 1);
        removedSomething = true;
        break;
      }
    }
  }

  return removedSomething;
}

Scriptish_MenuCommander.prototype.attach = function() {
  Scriptish_log("> Scriptish_MenuCommander.attach");

  for (var i = 0; i < this.keys.length; i++)
    this.keyset.appendChild(this.keys[i]);

  for (var i = 0; i < this.toolsMenuItems.length; i++)
    this.toolsMenuPopup.appendChild(this.toolsMenuItems[i]);

  var menuPopup = this.getTBMenu();
  if (menuPopup)
    for (var i = 0; i < this.tbMenuItems.length; i++)
      menuPopup.appendChild(this.tbMenuItems[i]);

  this.setDisabled(this.tbMenuItems.length == 0);
  this.attached = true;
  return this;
}

Scriptish_MenuCommander.prototype.detach = function() {
  Scriptish_log("> Scriptish_MenuCommander.detach");

  for (var i = 0; i < this.keys.length; i++)
    this.keyset.removeChild(this.keys[i]);

  for (var i = 0; i < this.toolsMenuItems.length; i++)
    this.toolsMenuPopup.removeChild(this.toolsMenuItems[i]);

  var menuPopup = this.getTBMenu();
  if (menuPopup)
    for (var i = 0; i < this.tbMenuItems.length; i++) {
      try {menuPopup.removeChild(this.tbMenuItems[i]);}
      catch (e) {} // TB was added but not opened before the user changed pages
    }

  this.setDisabled(true);
  this.attached = false;
  return null;
}

//TODO: restructure accel/access validation to be at register time.
//Should throw when called, not when building menu.
//This has side effect of one script's bad reg affecting another script's.


Scriptish_MenuCommander.prototype.createMenuItem =
    function(commandUUID, commandName, commandFunc, accessKey) {
  Scriptish_log("> Scriptish_MenuCommander.createMenuItem");

  var menuItem = this.doc.createElement("menuitem");
  menuItem._commandFunc = commandFunc;
  menuItem.setAttribute("uuid", commandUUID);
  menuItem.setAttribute("label", commandName);
  menuItem.setAttribute("oncommand", "this._commandFunc()");

  if (accessKey) {
    if (typeof(accessKey) == "string" && accessKey.length == 1) {
      menuItem.setAttribute("accesskey", accessKey);
    } else {
      throw "accessKey must be a single character";
    }
  }
  return menuItem;
}

Scriptish_MenuCommander.prototype.createKey =
    function(commandUUID, commandFunc, accelKey, modifiers, menuItem) {
  var key = this.doc.createElement("key");

  key.setAttribute("uuid", commandUUID);

  if ((typeof accelKey) == "number") {
    key.setAttribute("keycode", accelKey);
  } else if ((typeof accelKey) == "string" && accelKey.length == 1) {
    key.setAttribute("key", accelKey);
  } else {
    throw "accelKey must be a numerical keycode or a single character";
  }

  key.setAttribute("modifiers", modifiers);

  // hack, because listen("oncommand", commandFunc) does not work!
  // this is ok because .detach() gets called when the document is unloaded
  // and this key is destroyed
  key._commandFunc = commandFunc;
  key.setAttribute("oncommand", "this._commandFunc()");

  var id = "userscript-command-" + this.keys.length;
  key.setAttribute("id", id);
  menuItem.setAttribute("key", id);

  return key;
}

Scriptish_MenuCommander.prototype.setDisabled = function(aStatus) {
  function setStatus(aEle, aStatus) {
    if (!aEle) return;
    var marker = aEle.nextSibling;
    var parent = aEle.parentNode;
    aEle.setAttribute("disabled", aStatus);
    parent.removeChild(aEle);
    parent.insertBefore(aEle, marker);
  }
  setStatus(this.$("scriptish-tb-cmds"), aStatus);
  setStatus(this.toolsMenu, aStatus);
}
