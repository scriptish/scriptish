/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Scriptish mozmill test suite.
 *
 * The Initial Developer of the Original Code is Erik Vold.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Erik Vold <erikvvold@gmail.com> (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var tabs = require("../../../../../mozmill-tests/lib/tabs");

var setupModule = function(module) {
  module.controller = mozmill.getBrowserController();
}

var testFailed = false;

var testAboutScriptishTestsRan = function() {
  // Go to about:scriptish?test and verify the page loaded
  controller.open("about:scriptish?test");
  controller.waitForPageLoad();
  controller.assertNode(
      new elementslib.ID(controller.tabs.activeTab, "qunit-header2"));
  var QUnit = controller.tabs.activeTab.defaultView.QUnit;
  var config = controller.tabs.activeTab.defaultView.QUnit.config;

  controller.waitFor(function() {
    if (!config.blocking
        && ("END" == config.currentModule)
        && ("END" == config.previousModule)) {
      testFailed = (config.stats.bad > 0);
      return true;
    } else {
      return false;
    }
  }, null, 1500);
}

var testAboutScriptishTestFailed = function() {
  controller.assert(function() !testFailed);
}
