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

const validScheme = ['http', 'https', 'ftp', 'file'];

// matches *. or * or text of host
const validateHost = /^(\*|\*\.[^/*]+|[^/*]+)$/;

const validatePath = /^(\*|\/.*)$/;

// create and return a match pattern obj validate match pattern!
function MatchPattern(pattern){
  this.pattern = pattern;

  try {
    var uri = NetUtil.newURI(pattern);
  } catch (e) {
    throw new Error(Scriptish_stringBundle("error.pattern.parsing") + ": " + e);
  }

  var scheme = uri.scheme;
  var host = uri.host;
  var path = uri.path;

  if (scheme === 'file') {
    if (!validatePath.test(path)) {
      throw new Error(Scriptish_stringBundle("error.matchPattern.rules.file"));
    }
  }
  else {
    if (validScheme.indexOf(scheme) < 0 || !validateHost.test(host) ||
        !validatePath.test(path)) {
      throw new Error(Scriptish_stringBundle("error.matchPattern.rules"));
    }

    if (host == "*" && uri.path == "/") path = host;
  }

  var regexs = {};
  regexs.scheme = scheme;
  regexs.host = (scheme !== 'file') ? Scriptish_convert2RegExp(host) : null;
  regexs.path = Scriptish_convert2RegExp(path, true);

  this.regexs = regexs;
  return this;
}

MatchPattern.prototype.doMatch = function (uriSpec) {
  var matchURI = NetUtil.newURI(uriSpec);
  var regexs = this.regexs;

  if (regexs.host === null){
    return (regexs.scheme === matchURI.scheme &&
        regexs.path.test(matchURI.path));
  } else {
    return (regexs.scheme === matchURI.scheme &&
        regexs.path.test(matchURI.path) &&
        regexs.host.test(matchURI.host));

  }
};
