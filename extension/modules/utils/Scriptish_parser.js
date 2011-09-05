"use strict";
var EXPORTED_SYMBOLS = ["Scriptish_parser"];

function Scriptish_parser(aSource) {
  var headers = {};
  var foundMeta = false;
  var line;

  // do not 'optimize' by reusing this reg exp! it should not be reused!
  var metaRegExp = /\/\/[ \t]*(?:==(\/?UserScript)==|\@(\S+)(?:[ \t]+([^\r\f\n]+))?)/g;

  // read one line at a time looking for start meta delimiter or EOF
  while (line = metaRegExp.exec(aSource)) {
    if (line[1]) {
      if ("userscript" == line[1].toLowerCase()) {
        foundMeta = true; // start
        continue;
      } else {
        break; // done
      }
    }
    if (!foundMeta) continue;

    var header = line[2].toLowerCase();
    var value = line[3];

    if (!headers[header]) headers[header] = [value];
    else headers[header].push(value);
  }

  return headers;
}
