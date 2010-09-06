
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_Resources"];

const Cu = Components.utils;
Cu.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");

function GM_Resources(script){
  this.script = script;
}

GM_Resources.prototype.getResourceURL = function(name) {
  return this.getDep_(name).dataContent;
}

GM_Resources.prototype.getResourceText = function(name) {
  return this.getDep_(name).textContent;
}

GM_Resources.prototype.getFileURL = function(name) {
  return Scriptish_getUriFromFile(this.getDep_(name)._file).spec;
}

GM_Resources.prototype.getDep_ = function(name) {
  var resources = this.script.resources;
  for (var i = 0, resource; resource = resources[i]; i++) {
    if (resource.name == name) {
      return resource;
    }
  }

  // NOTE: Non localised string
  throw new Error("No resource with name: " + name);
}
