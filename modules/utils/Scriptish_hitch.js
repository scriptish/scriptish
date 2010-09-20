
var EXPORTED_SYMBOLS = ["Scriptish_hitch"];

const Scriptish_hitch = function (aObj, aMeth) {
  if (!aObj[aMeth])
    throw "method '" + meth + "' does not exist on object '" + obj + "'";

  var staticArgs = Array.slice(arguments, 2);

  return function() {
    // make a copy of staticArgs
    var args = Array.slice(staticArgs);
    // add all the new arguments.
    args.push.apply(args, arguments);

    // invoke the original function with the correct this obj and the combined
    // list of static and dynamic arguments.
    return aObj[aMeth].apply(aObj, args);
  };
}
