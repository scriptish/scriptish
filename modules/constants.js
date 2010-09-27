var EXPORTED_SYMBOLS = [ "Cc", "Ci", "gmService"];
const Cc = Components.classes;
const Ci = Components.interfaces;
const gmService = Cc["@scriptish.erikvold.com/scriptish-service;1"]
    .getService().wrappedJSObject;
