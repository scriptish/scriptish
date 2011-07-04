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
 * The Original Code is Page Modifications code.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   David Dahl <ddahl@mozilla.com>
 *   Drew Willcoxon <adw@mozilla.com>
 *   Erik Vold <erikvvold@gmail.com>
 *   Nils Maier <maierman@web.de>
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
var EXPORTED_SYMBOLS = ['MatchPattern'];

const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/utils/Scriptish_convert2RegExp.js");
Cu.import("resource://scriptish/utils/Scriptish_stringBundle.js");

const validSchemes = ['http', 'https', 'ftp', 'file'];
const REG_HOST = /^(?:\*\.)?[^*\/]+$|^\*$|^$/;

function MatchPattern(pattern) {
  this.pattern = pattern;

  // special case "<all_urls>
  if (pattern == "<all_urls>") {
    this.all = true;
    this.scheme = "all_urls";
    return;
  }

  // special case wild scheme
  var wildScheme = false;
  if (pattern[0] == "*") {
    this.wildScheme = true;
    // use http, because we need to ensure we get a host
    pattern = "http" + pattern.slice(1);
  }

  try {
    var uri = NetUtil.newURI(pattern);
  } catch (e) {
    throw new Error(Scriptish_stringBundle("error.pattern.parsing") + ": " + e);
  }

  var scheme = this.wildScheme ? "all" : uri.scheme;
  var host = uri.host;
  var path = uri.path;

  if (scheme != "all" && validSchemes.indexOf(scheme) == -1) {
    throw new Error(Scriptish_stringBundle("error.matchPattern.rules"));
  }
  if (!REG_HOST.test(host)) {
    throw new Error(Scriptish_stringBundle("error.matchPattern.rules"));
  }
  if (path[0] !== "/") {
    throw new Error(Scriptish_stringBundle("error.matchPattern.rules"));
  }

  this.scheme = scheme;
  if (host) {
    this.hostExpr = Scriptish_convert2RegExp(host.replace(/^\*\./, "*"));
  }
  else {
    // if omitted, then it means "", an alias for localhost
    this.hostExpr = /^$/;
  }
  this.pathExpr = Scriptish_convert2RegExp(path, false, true);
}

MatchPattern.prototype.doMatch = function (uriSpec) {
  var matchURI = NetUtil.newURI(uriSpec);

  if (validSchemes.indexOf(matchURI.scheme) == -1) {
    return false;
  }

  if (this.all) {
    return true;
  }
  if (!this.wildScheme && this.scheme != matchURI.scheme) {
    return false;
  }
  return this.hostExpr.test(matchURI.host) && this.pathExpr.test(matchURI.path);
};
