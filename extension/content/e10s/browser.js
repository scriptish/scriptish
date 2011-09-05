
(function(inc, tools, global){
  inc("resource://scriptish/constants.js", tools);
  const {lazyImport, lazyUtil, Services} = tools;
  lazyImport(global, "resource://scriptish/logging.js", ["Scriptish_log"]);
  lazyImport(global, "resource://scriptish/manager.js", ["Scriptish_manager"]);
  lazyImport(global, "resource://scriptish/config.js", ["Scriptish_config"]);
  lazyImport(this, "resource://scriptish/api/GM_Resources.js", ["GM_Resources"]);

  lazyUtil(global, "installUri");
  lazyUtil(this, "notification");

  var $ = function(id) document.getElementById(id);

  addEventListener("load", function() {
    // Check if Scriptish has been updated/installed
    inc("resource://scriptish/utils/Scriptish_updateChk.js");

    var us_head = $("addons-userscripts");
    var parent = us_head.parentNode;

    function createNode(script) {
      var ele = ExtensionsView._createItem(script, "userscript");
      ele.setAttribute("typeLabel", "User Script");
      // TODO: implement for Fennec.. #517
      //ele.setAttribute("optionsURL", script.optionsURL);
      ele.setAttribute("isDisabled", !script.enabled);
      ele.setAttribute("data-scriptish-scriptid", script.id);
      ele.addon = script;
      return ele;
    }

    function insertScript(script) {
      parent.insertBefore(createNode(script), us_head.nextSibling);
    }

    // insert script nodes into the EM
    Scriptish_config.scripts.forEach(insertScript);
    Services.obs.addObserver({
      observe: function(aSubject, aTopic, aData) {
        tools.timeout(function() {
          var script = Scriptish_config.getScriptById(JSON.parse(aData).id);
          insertScript(script);
        });
      }
    }, "scriptish-script-installed", false);
  }, false);

  var mm = messageManager;

  mm.addMessageListener("Scriptish:InstallScriptURL", function({json}) {
    return Scriptish_installUri(json);
  });

  mm.addMessageListener("Scriptish:FrameSetup", function() {
    return Scriptish_config.toJSON();
  });

  mm.addMessageListener("Scriptish:GetScriptContents", function({json}) {
    return Scriptish_config.getScriptById(json).textContent;
  });

  mm.addMessageListener("Scriptish:GetScriptResourceURL", function({json}) {
    return new GM_Resources(Scriptish_config.getScriptById(json.scriptID)).getResourceURL(json.resource);
  });

  mm.addMessageListener("Scriptish:GetScriptResourceText", function({json}) {
    return new GM_Resources(Scriptish_config.getScriptById(json.scriptID)).getResourceText(json.resource);
  });

  mm.addMessageListener("Scriptish:GetScriptRequires", function({json}) {
    var script = Scriptish_config.getScriptById(json);
    if (!script) return [];

    var rtnAry = [];
    script.requires.forEach(function(req) {
      rtnAry.push({
        fileURL: req.fileURL,
        textContent: req.textContent
      });
    });
    return rtnAry;
  });

  mm.addMessageListener("Scriptish:ScriptNotification", function({json}) {
    Scriptish_notification.apply(null, json);
  });

  mm.loadFrameScript(
      "chrome://scriptish/content/e10s/browser-content.js",
      true); // no delay loading frame script
})(Components.utils.import, {}, this);
