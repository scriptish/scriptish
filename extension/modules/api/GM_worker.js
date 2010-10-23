var EXPORTED_SYMBOLS = ["GM_worker"];
const Cu = Components.utils;
Cu.import("resource://scriptish/constants.js");
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/third-party/Timer.js");

const gTimer = new Timer();

const GM_worker = function (aResource, aPgURL) {
  const self = this;
  var created = false;
  var alive = true;
  var thread = Services.tm.newThread(0);
  var tempWorker = {
    postMessage: function() {},
    thread: {
      shutdown: function() {
        if (alive) alive = false;
      }
    }
  };
  var fakeWorker = tempWorker;

  this.onmessage = function() {};
  this.postMessage = function(aMsg) {
    if (!alive) return;
    gTimer.setTimeout(function() {
      fakeWorker.postMessage(aMsg);
    }, 0);
  }
  this.onerror = function() {};
  this.terminate = function() {
    if (!alive) return;
    alive = false;
    gTimer.setTimeout(function() {
      Services.tm.mainThread.dispatch(
          new Dispatcher(null, thread, "shutdown"), Ci.nsIThread.DISPATCH_NORMAL);
    }, 0);
    Scriptish_log("terminated GM_worker");
    fakeWorker = tempWorker;
  }

  gTimer.setTimeout(function() {
    fakeWorker =
        new fake_worker(
            thread, self, aResource.textContent, aResource.fileURL, aPgURL);
  }, 0);
}


function fake_worker(aThread, aBoss, aJSContent, aJSPath, aPgURL) {
  const self = this;
  this.boss = aBoss;
  this.jsContent = aJSContent;
  this.jsPath = aJSPath;
  this.sandbox = Cu.Sandbox(aPgURL);
  this.timer = new Timer();
  this.thread = aThread;

  for (let [k, v] in Iterator(this._functions))
    this.sandbox.importFunction(v, k);

  this.sandbox.importFunction(function postMessage(aMsg) {
    var msg = (typeof aMsg != "object") ? (aMsg + "") : JSON.stringify(aMsg);
    Services.tm.mainThread.dispatch(
        new Dispatcher(msg, self, "_onmessage"), Ci.nsIThread.DISPATCH_NORMAL);
  }, "postMessage")

  this.sandbox.importFunction(function close() {
    Services.tm.mainThread.dispatch(
        new Dispatcher(null, self, "_terminate"), Ci.nsIThread.DISPATCH_SYNC);
  }, "close")

  this.thread.dispatch(this, Ci.nsIThread.DISPATCH_NORMAL);
}
fake_worker.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIRunnable]),

  run: function () {
    var self = this;
    this._tryRunning(function() {
      Cu.evalInSandbox(self.jsContent, self.sandbox, "1.8", self.jsPath, 1);
    })
  },

  _tryRunning: function(aFunc) {
    try {
      aFunc();
    } catch (e) {
      Services.tm.mainThread.dispatch(
          new Dispatcher(e, this, "_onerror"), Ci.nsIThread.DISPATCH_NORMAL);
    }
  },

  _onerror: function(e) {
    this.boss.onerror({
      message: e.message,
      filename: this.jsPath,
      lineno: e.lineNumber
    });
  },

  _terminate: function() {
    this.boss.terminate();
  },

  onmessage: function (aEvt) { this.boss.onmessage(aEvt); },
  _onmessage: function (aMsg) {
    var msg;
    try {
      msg = JSON.parse(aMsg);
    } catch (e) {
      msg = aMsg;
    }
    this.onmessage({"data": msg});
  },

  postMessage: function (aMsg) {
    var msg = (typeof aMsg != "object") ? (aMsg + "") : aMsg;
    this.thread.dispatch(
        new Dispatcher(JSON.stringify({"data": msg}), this, "_postMessage"),
        Ci.nsIThread.DISPATCH_NORMAL);
  },
  _postMessage: function (aEvtStr) {
    var self = this;
    this._tryRunning(function() {
      Cu.evalInSandbox("onmessage(" + aEvtStr + ")", self.sandbox);
    })
  },

  _functions: {
    onmessage: function () {},
    setTimeout: function setTimeout(aCallback, aDelay) {
      return this.timer.setTimeout(aCallback, aDelay);
    },
    clearTimeout: function clearTimeout(aTimerID) {
      return this.timer.clearTimeout(aTimerID);
    },
    setInterval: function setInterval(aCallback, aDelay) {
      return this.timer.setInterval(aCallback, aDelay);
    },
    clearInterval: function clearInterval(aIntervalID) {
      return this.timer.clearInterval(aIntervalID);
    }
  }
}


function Dispatcher(aArg, aObj, aFuncName) {
  this.arg = aArg;
  this.obj = aObj;
  this.func = aFuncName;
}
Dispatcher.prototype = {
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIRunnable]),
  run: function () { this.obj[this.func](this.arg); }
}
