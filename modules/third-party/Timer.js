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
    return timers.addTimer(
        false, Ci.nsIThread.TYPE_ONE_SHOT, aCallback, TimeoutCallback, aDelay,
        Array.slice(arguments, 2));
  }

  this.clearTimeout = function(aTimerID) {
    timers.removeTimer(aTimerID);
  }

  this.setInterval = function(aCallback, aDelay) {
    return timers.addTimer(
        true, Ci.nsIThread.TYPE_REPEATING_SLACK, aCallback, IntervalCallback,
        aDelay, Array.slice(arguments, 2));
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
  getTimer: function(aTimerID) {
    return this.cache[aTimerID];
  },
  addTimer: function(aInterval, aType, aCallback, aCbType, aDelay, aParams) {
    var timer = timerService.createInstance(Ci.nsITimer);
    var timerID = this.nextTimerID++;
    var removeFunc = false;

    this.cache[timerID] = timer;

    if (!aInterval) {
      var self = this;
      removeFunc = function() { self.removeTimer(timerID); }
    }

    timer.initWithCallback(
        new aCbType(aCallback, aParams, removeFunc), aDelay, aType);

    return timerID;
  },
  removeTimer: function(aTimerID) {
    var timer = this.cache[this.nextTimerID];
    if (!timer) return;
    timer.cancel();
    delete this.cache[this.nextTimerID];
  }
}


function TimerCallback(aCallback, aParams) {
  this._callback = aCallback;
  this._params = aParams;
};
TimerCallback.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsITimerCallback])
};

function TimeoutCallback(aCallback, aParams, aRemoveFunc) {
  TimerCallback.apply(this, arguments);
  this._remove = aRemoveFunc;
};
TimeoutCallback.prototype = new TimerCallback();
TimeoutCallback.prototype.notify = function notifyOnTimeout(timer) {
  this._remove();
  this._callback.apply(null, this._params);
};

function IntervalCallback(aCallback, aParams) {
  TimerCallback.apply(this, arguments)
};
IntervalCallback.prototype = new TimerCallback();
IntervalCallback.prototype.notify = function notifyOnInterval() {
  this._callback.apply(null, this._params);
};
