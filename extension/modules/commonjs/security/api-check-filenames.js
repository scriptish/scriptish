"use strict";

let compiled = null;
let filenames = [];
let prefixes = [];

const escapeRegex = string => string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");

function compile() {
  let rv = filenames.map(e => "^" + escapeRegex(e) + "$").
           concat(prefixes.map(e => "^" + escapeRegex(e))).
           join("|");
  compiled = new RegExp(rv);
}

function add(filename) {
  filenames.push(filename);
  compile();
}
exports.add = add;

let prefixes = [];
function addPrefix(prefix) {
  prefixes.push(prefix);
  compile();
}
exports.addPrefix = addPrefix;

function check(filename) {
  return compiled.test(filename);
}
exports.check = check;
