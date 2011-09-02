var EXPORTED_SYMBOLS = ["GM_Resources"];

const Cu = Components.utils;
Cu.import("resource://scriptish/utils/Scriptish_getUriFromFile.js");
Cu.import("resource://scriptish/utils/Scriptish_stringBundle.js");

function GM_Resources(script){
  this.script = script;
}

GM_Resources.prototype.getResourceURL = function(aName) (
    this.getDep(aName).dataContent)

GM_Resources.prototype.getResourceText = function(aName) (
    this.getDep(aName).textContent)

GM_Resources.prototype.getFileURL = function(name) {
  return Scriptish_getUriFromFile(this.getDep(name)._file).spec;
}

GM_Resources.prototype.getDep = function(name) {
  var resources = this.script.resources;
  for (var i = 0, resource; resource = resources[i]; i++) {
    if (resource.name == name) {
      return resource;
    }
  }
  throw new Error(
      Scriptish_stringBundle("error.api.noResourceWithName") + ": '" + name + "'");
}
