// JSM exported symbols
var EXPORTED_SYMBOLS = ["Scriptish_MenuCommander"];

Components.utils.import("resource://scriptish/logging.js");

function Scriptish_MenuCommander(aDocument) {
  Scriptish_log("> Scriptish_MenuCommander")

  this.doc = aDocument;

  this.menu = this.doc.getElementById("scriptish-commands-sb");
  this.keyset = this.doc.getElementById("mainKeyset");
  this.menuPopup = this.menu.firstChild;

  this.menuItems = [];
  this.keys = [];
  this.attached = false;

  this.menu2 = this.doc.getElementById("scriptish-commands-sb2");
  this.menuPopup2 = this.menu2.firstChild;
  this.menuItems2 = [];

  Scriptish_log("< Scriptish_MenuCommander")
}

Scriptish_MenuCommander.prototype.registerMenuCommand =
  function(commandName, commandFunc, accelKey, accelModifiers, accessKey) {
    //Scriptish_log("> Scriptish_MenuCommander.registerMenuCommand");

    // Protection against item duplication
    for (var i = 0; i < this.menuItems.length; i++) {
      if (this.menuItems[i].getAttribute("label") == commandName) {
        return;
      }
    }

    //Scriptish_log("accelKey: " + accelKey);
    //Scriptish_log("modifiers: " + accelModifiers);
    //Scriptish_log("accessKey: " + accessKey);

    var menuItem = this.createMenuItem(commandName, commandFunc, accessKey);
    var menuItem2 = this.createMenuItem(commandName, commandFunc, accessKey);
    this.menuItems.push(menuItem);
    this.menuItems2.push(menuItem2);

    if (accelKey) {
      var key = this.createKey(commandFunc, accelKey, accelModifiers, menuItem);
      this.keys.push(key);
    }

    // if this menucommander is for the current document, we should add the
    // elements immediately. otherwise it will be added in attach()
    if (this.attached) {
      this.menuPopup.appendChild(menuItem);
      this.menuPopup2.appendChild(menuItem2);

      if (accelKey) {
        this.keyset.appendChild(key);
      }

      this.setDisabled(false);
    }

    //Scriptish_log("< Scriptish_MenuCommmander.registerMenuCommand")
  };

Scriptish_MenuCommander.prototype.attach = function() {
  Scriptish_log("> Scriptish_MenuCommander.attach");

  for (var i = 0; i < this.menuItems.length; i++) {
    this.menuPopup.appendChild(this.menuItems[i]);
    this.menuPopup2.appendChild(this.menuItems2[i]);
  }

  for (var i = 0; i < this.keys.length; i++) {
    this.keyset.appendChild(this.keys[i]);
  }

  this.setDisabled(this.menuItems.length == 0);
  this.attached = true;

  Scriptish_log("< Scriptish_MenuCommander.attach");
};

Scriptish_MenuCommander.prototype.detach = function() {
  Scriptish_log("> Scriptish_MenuCommander.detach");
  Scriptish_log("* this.menuPopup: " + this.menuPopup);
  Scriptish_log("* this.menuPopup2: " + this.menuPopup2);

  for (var i = 0; i < this.menuItems.length; i++) {
    this.menuPopup.removeChild(this.menuItems[i]);
    this.menuPopup2.removeChild(this.menuItems2[i]);
  }

  for (var i = 0; i < this.keys.length; i++) {
    this.keyset.removeChild(this.keys[i]);
  }

  this.setDisabled(true);
  this.attached = false;

  Scriptish_log("< Scriptish_MenuCommander.detach");
};

//TODO: restructure accel/access validation to be at register time.
//Should throw when called, not when building menu.
//This has side effect of one script's bad reg affecting another script's.


Scriptish_MenuCommander.prototype.createMenuItem =
function(commandName, commandFunc, accessKey) {
  Scriptish_log("> Scriptish_MenuCommander.createMenuItem");

  var menuItem = this.doc.createElement("menuitem");
  menuItem._commandFunc = commandFunc;
  menuItem.setAttribute("label", commandName);
  menuItem.setAttribute("oncommand", "this._commandFunc()");

  if (accessKey) {
    if (typeof(accessKey) == "string" && accessKey.length == 1) {
      menuItem.setAttribute("accesskey", accessKey);
    } else {
      throw "accessKey must be a single character";
    }
  }

  Scriptish_log("< Scriptish_MenuCommander.createMenuItem");
  return menuItem;
};

Scriptish_MenuCommander.prototype.createKey =
  function(commandFunc, accelKey, modifiers, menuItem) {
    Scriptish_log("> Scriptish_MenuCommander.createKey");

    var key = this.doc.createElement("key");

    if ((typeof accelKey) == "number") {
      Scriptish_log("keycode: " + accelKey);
      key.setAttribute("keycode", accelKey);
    } else if ((typeof accelKey) == "string" && accelKey.length == 1) {
      Scriptish_log("key: " + accelKey);
      key.setAttribute("key", accelKey);
    } else {
      throw "accelKey must be a numerical keycode or a single character";
    }

    Scriptish_log("modifiers: " + modifiers);
    key.setAttribute("modifiers", modifiers);

    // hack, because listen("oncommand", commandFunc) does not work!
    // this is ok because .detach() gets called when the document is unloaded
    // and this key is destroyed
    key._commandFunc = commandFunc;
    key.setAttribute("oncommand", "this._commandFunc()");

    var id = "userscript-command-" + this.keys.length;
    key.setAttribute("id", id);
    menuItem.setAttribute("key", id);

    Scriptish_log("< Scriptish_MenuCommander.createKey");
    return key;
  };

Scriptish_MenuCommander.prototype.setDisabled = function(disabled) {
  var menu = this.menu;
  var marker = menu.nextSibling;
  var parent = menu.parentNode;

  var menu2 = this.menu2;
  var marker2 = menu2.nextSibling;
  var parent2 = menu2.parentNode;

  menu.setAttribute("disabled", disabled);
  menu2.setAttribute("disabled", disabled);

  parent.removeChild(menu);
  parent.insertBefore(menu, marker);

  parent2.removeChild(menu2);
  parent2.insertBefore(menu2, marker2);
};
