"use strict";
var EXPORTED_SYMBOLS = ["GM_console"];

const Cu = Components.utils;
Cu.import("resource://scriptish/logging.js");
Cu.import("resource://scriptish/utils/Scriptish_getFirebugConsole.js");

// moz-4: log, warn, error, info
// moz-5: debug (alias to log)
// moz-6: trace (callstack)
const log_functions = ["log", "debug", "warn", "error", "info", "trace"];

// based on http://www.getfirebug.com/firebug/firebugx.js
const aux_functions = ["assert", "dir", "dirxml", "group", "groupEnd", "time",
                        "timeEnd", "count", "profile", "profileEnd"
                        ];

function getConsoleFor(contentWindow, chromeWindow) {
  // we dont have a chromeWindow for e10s atm, see Scriptish_injectScripts impl
  if (chromeWindow) {
    let (rv = Scriptish_getFirebugConsole(contentWindow, chromeWindow)) {
      if (rv) return rv;
    }

    if (contentWindow.console) {
      return contentWindow.console;
    }
  }

  return {
    log: function() Scriptish_log(Array.slice(arguments).join(" "), true)
  };
}

function GM_console(script, contentWindow, chromeWindow) {
  const _console = getConsoleFor(contentWindow, chromeWindow);
  const console = { __exposedProps__: {__noSuchMethod__: "r"} };
  const prefix = "[" + (script.id || "Scriptish") + "]";

  // Wrap log functions
  // Redirect any missing log function to .log
  for (let i = 0, e = log_functions.length; i < e; ++i) {
    let fn = log_functions[i];
    console.__exposedProps__[fn] = "r";
    if (fn in _console) {
      console[fn] = _console[fn].bind(_console, prefix);
    }
    else if (fn == "trace") {
      console.trace = function() {
        let args = Array.slice(arguments);
        let msg = "";

        // Skip the top two frames
        let stack = Components.stack.caller;
        if (stack && (stack = stack.caller)) {
          for (let i = 0; i < 10 && stack; ++i, stack = stack.caller) {
            msg += "\n[@" + stack.filename + ":" + stack.lineNumber + "]";
          }
          args.push(msg);
        }
        console.log.apply(console, args);
      };
    }
    else {
      console[fn] = console.log.bind(console);
    }
  }

  // Wrap aux functions
  for (let i = 0, e = aux_functions.length; i < e; ++i) {
    let fn = aux_functions[i];
    if (fn in console) {
      console[fn] = _console[fn].bind(_console);
      console.__exposedProps__[fn] = "r";
    }
  }
  Object.defineProperty(console, "__noSuchMethod__", {
    value: function(id, args) {
      if (aux_functions.indexOf(id) != -1) {
        let fn = _console[id] || (function() {});
        return fn.apply(_console, args);
      }
      console.log("No such method in console", id);
    }
  });

  return console;
}
