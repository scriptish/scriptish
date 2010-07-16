
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_compareVersions"];

// Todo: replace with nsIVersionComparator?
/**
 * Compares two version numbers
 *
 * @param {String} aV1 Version of first item in 1.2.3.4..9. format
 * @param {String} aV2 Version of second item in 1.2.3.4..9. format
 *
 * @returns {Int}  1 if first argument is higher
 *                 0 if arguments are equal
 *                 -1 if second argument is higher
 */
function GM_compareVersions(aV1, aV2) {
  var v1 = aV1.split(".");
  var v2 = aV2.split(".");
  var numSubversions = (v1.length > v2.length) ? v1.length : v2.length;

  for (var i = 0; i < numSubversions; i++) {
    if (typeof v2[i] == "undefined") {
      return 1;
    }

    if (typeof v1[i] == "undefined") {
      return -1;
    }

    if (parseInt(v2[i], 10) > parseInt(v1[i], 10)) {
      return -1;
    } else if (parseInt(v2[i], 10) < parseInt(v1[i], 10)) {
      return 1;
    }
  }

  // v2 was never higher or lower than v1
  return 0;
}
