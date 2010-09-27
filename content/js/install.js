Components.utils.import("resource://scriptish/logging.js");
Components.utils.import("resource://scriptish/utils/Scriptish_stringBundle.js");

var Scriptish_Install = {
  init: function() {
    this.doc = document;
    var $ = function(aID) document.getElementById(aID);

    var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);

    this.htmlNs_ = "http://www.w3.org/1999/xhtml";

    this.scriptDownloader_ = window.arguments[0];
    var script = this.script_ = this.scriptDownloader_.script;

    this.setupIncludes("match", "matches", "matches-desc", script.matches);
    this.setupIncludes("include", "includes", "includes-desc", script.includes);
    this.setupIncludes("include", "excludes", "excludes-desc", script.excludes);

    this.dialog_ = document.documentElement;
    this.dialog_.setAttribute("title", Scriptish_stringBundle("install.title"));

    this.extraButton_ = this.dialog_.getButton("extra1");
    this.extraButton_.setAttribute("type", "checkbox");
    this.extraButton_.setAttribute("label",
        Scriptish_stringBundle("install.showscriptsource"));
    this.extraButton_.addEventListener(
            "command", function() { Scriptish_Install.onShowSource() }, false);

    this.acceptButton_ = this.dialog_.getButton("accept");
    this.acceptButton_.setAttribute("label",
        Scriptish_stringBundle("install.installbutton"));
    this.acceptButton_.addEventListener(
        "command", function() { Scriptish_Install.onOK() }, false);

    this.dialog_.getButton("cancel").addEventListener(
        "command", function() { Scriptish_Install.onCancel() }, false);

    $("matches-label").setAttribute("value", Scriptish_stringBundle("install.matches"));
    $("includes-label").setAttribute("value", Scriptish_stringBundle("install.runson"));
    $("excludes-label").setAttribute("value", Scriptish_stringBundle("install.butnoton"));
    $("warning1").setAttribute("value", Scriptish_stringBundle("install.warning1"));
    $("warning2").setAttribute("value", Scriptish_stringBundle("install.warning2"));

    var desc = $("scriptDescription");
    desc.appendChild(this.doc.createElementNS(this.htmlNs_, "strong"));
    desc.firstChild.appendChild(this.doc.createTextNode(script.name + " " + script.version));
    desc.appendChild(this.doc.createElementNS(this.htmlNs_, "br"));
    desc.appendChild(this.doc.createTextNode(script.description));
  },

  setupIncludes: function(type, box, desc, includes) {
    if (includes.length > 0) {
      desc = document.getElementById(desc);
      document.getElementById(box).setAttribute("class", "display");

      if (type == "match") {
        for (var i = 0; i < includes.length; i++) {
          desc.appendChild(document.createTextNode(includes[i].pattern));
          desc.appendChild(document.createElementNS(this.htmlNs_, "br"));
        }
      } else {
        for (var i = 0; i < includes.length; i++) {
          desc.appendChild(document.createTextNode(includes[i]));
          desc.appendChild(document.createElementNS(this.htmlNs_, "br"));
        }
      }

      desc.removeChild(desc.lastChild);
    }
  },

  onOK: function() {
    window.removeEventListener("unload", Scriptish_Install.cleanup, false);
    this.scriptDownloader_.installScript();
    Scriptish_Install.close();
  },
  onCancel: function() Scriptish_Install.close(),
  onShowSource: function() {
    this.scriptDownloader_.showScriptView();
    Scriptish_Install.close();
  },
  cleanup: function() Scriptish_Install.scriptDownloader_.cleanupTempFiles(),
  close: function() window.setTimeout(function() { window.close() }, 0)
};

window.addEventListener("unload", Scriptish_Install.cleanup, false);
window.addEventListener("load", function() { Scriptish_Install.init() }, false);
