// These script bits will only run unprivileged in a sandbox

const GM_updatingEnabled = true;

function GM_addStyle(css) {
  var head = document.getElementsByTagName("head")[0];
  if (head) {
    var style = document.createElement("style");
    style.textContent = css;
    style.type = "text/css";
    head.appendChild(style);
  }
  return style;
}

function GM_xpath(details) {
  var contextNode = details.node || document;
  var paths = details.paths || [details.path];
  var result;

  if (details.all) {
    var rv = [], i, e;
    for (var [,path] in Iterator(paths)) {
      result = document.evaluate(
        path,
        contextNode,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      for (i = 0, e = result.snapshotLength; i < e; ++i) {
        rv.push(result.snapshotItem(i));
      }
    }
    return rv;
  }


  for (var [,path] in Iterator(paths)) {
     result = document.evaluate(
        path,
        contextNode,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;
    if (result) {
      return result;
    }
  }
  return null;
}
