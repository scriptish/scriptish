
Components.utils.import("resource://scriptish/constants.js");

module("Tools Menuitem");

test("Exists", function() {
  expect(3);

  var win = Services.wm.getMostRecentWindow("navigator:browser");
  function $(aID) win.document.getElementById(aID);
  var scriptish_menu = $("scriptish_general_menu");
  var tools_menu = $("menu_ToolsPopup");
  ok(!!scriptish_menu, "Scriptish menu exists");
  ok(!!tools_menu, "Tools menu exists");
  equal(scriptish_menu.parentNode, tools_menu, "The Scriptish menu is a child of the Tools menu");
});
