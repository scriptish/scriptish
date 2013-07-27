'use strict';

const { Cu } = require('chrome')
const { setTimeout } = require('sdk/timers')

const { Services } = Cu.import("resource://scriptish/constants.js", {});

function alert(aMsg, aTitle, aWait) {
  if (typeof aWait == "number")
    return setTimeout(function() alert(aMsg, aTitle), aWait);
  Services.prompt.alert(null, aTitle || "Scriptish", aMsg+"");
}
exports.alert = alert;
