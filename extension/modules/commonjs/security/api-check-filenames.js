"use strict";

let filenames = [];

function add(filename) {
  filenames.push(filename);
  return;
}
exports.add = add;

function check(filename) {
  for (let i = filenames.length - 1; i >= 0; i--) {
  	if (filenames[i] == filename) {
  	  return true;
  	}
  }
  return false;
}
exports.check = check;
