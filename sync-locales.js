#!/usr/bin/env node

var path = require("path");
var glob = require("glob").glob;
var globSync = require("glob").globSync;
var fs = require("fs");


function Properties(file) {
  this.file = file;
  this.items = {};
  var self = this;

  // store the keys/values
  var data = fs.readFileSync(file, "utf-8");
  var list = data.match(/[^\n]*(\n|$)/g);

  for (var i = list.length - 1; ~i; i--) {
    var m = list[i].match(/(^[^#=]*)=([^\n]*)(\n|$)/, "");
    if (!m) continue;
    self.items[m[1]] = m[2];
  }
}

Properties.prototype.merge = function(rhs) {
  // remove the obsolete keys
  for (var key in this.items)
    if (!rhs.items[key])
      delete this.items[key];

  // add new keys
  for (var key in rhs.items)
    if (!this.items[key])
      this.items[key] = "";
};

Properties.prototype.save = function() {
  var keys = [], newStr = [], self = this;
  for (var key in this.items) {
    keys.push(key);
  }

  keys.sort(function(a, b) {
    return (a.toLowerCase() > b.toLowerCase()) ? 1 : -1;
  });
  for (var i = 0, e = keys.length; i < e; i++) {
    newStr.push(keys[i] + "=" + this.items[keys[i]]);
  }
  newStr = newStr.join("\n") + "\n";
  fs.writeFile(self.file, newStr, "utf-8", function(e) {
    if (e) throw e;
  });
};

function process_properties(base, files) {
  base = new Properties(base);

  for (var i = files.length - 1, file; ~i; i--) {
    file = files[i];
    if (file == base.file)
      continue
    console.log(file);
    file = new Properties(file);
    file.merge(base);
    file.save();
  }
}

glob("extension/locale/en-US/*.properties", function(e, m) {
  if (e) throw e;
  m.forEach(function(f) {
    var fn = f.match(/[^\\\/\.]*.properties$/)[0];
    var files = globSync("extension/locale/*/" + fn);
    process_properties(f, files);
  });
})

