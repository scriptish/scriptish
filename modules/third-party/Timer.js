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
 * The Original Code is Jetpack.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
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


// JSM exported symbols
var EXPORTED_SYMBOLS = ["Timer"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

const timerService = Cc["@mozilla.org/timer;1"];


const Timer = function() {
  var timers = new Timers();

  this.setTimeout = function(aCallback, aDelay) {
    return timers.addTimer(aCallback, aDelay, false);
  }

  this.clearTimeout = function(aTimerID) {
    timers.removeTimer(aTimerID);
  }

  this.setInterval = function(aCallback, aDelay) {
    return timers.addTimer(aCallback, aDelay, true);
  }

  this.clearInterval = function(aTimerID) {
    timers.removeTimer(aTimerID);
  }
}


const Timers = function() {
  this.cache = {};
  this.nextTimerID = 0;
}
Timers.prototype = {
  getTimer: function getTimer(aTimerID) {
    return this.cache[aTimerID];
  },
  addTimer: function addTimer(aCallback, aDelay, aInterval) {
    var timer = timerService.createInstance(Ci.nsITimer);
    var timerID = this.nextTimerID++;
    var removeFunc = false;
    var timerType = timer.TYPE_ONE_SHOT;

    this.cache[timerID] = timer;

    if (aInterval) {
      var self = this;
      removeFunc = function() { self.removeTimer(timerID); }
      timerType = timer.TYPE_REPEATING_SLACK;
    }

    timer.initWithCallback(
        new TimerCallback(aCallback, removeFunc), aDelay, timerType);

    return timerID;
  },
  removeTimer: function(aTimerID) {
    var timer = this.cache[this.nextTimerID];
    if (!timer) return;
    timer.cancel();
    delete this.cache[this.nextTimerID];
  }
}


function TimerCallback(aCallback, aRemoveFunc) {
  this._callback = aCallback;
  this.remove = aRemoveFunc;

  this.QueryInterface = XPCOMUtils.generateQI([Ci.nsITimerCallback]);
};

TimerCallback.prototype = {
  notify: function notify(aTimer) {
    this._callback.call(null);

    if (this.remove) this.remove();
  }
};
