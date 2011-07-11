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
  var contextNode, contextDocument, paths, resolver, namespace, result;
  contextNode = "node" in details ? details.node : document;
  if (!contextNode) {
    throw new Error("The value specified for node is invalid");
  }

  if (contextNode.ownerDocument) {
    contextDocument = contextNode.ownerDocument;
  }
  else if (contextNode.evaluate) {
    // contextNode is a Document already
    contextDocument = contextNode;
  }
  else {
    throw new Error("No owning document for the specified node. Make sure you pass a valid node!");
  }

  paths = details.paths || details.path;
  if (typeof paths == "string") {
    paths = [paths];
  }

  if (contextNode.namepaceURI) {
    namespace = contextNode.namespaceURI;
    resolver = {lookupNamespaceURI: function(p) namespace};
  }

  if (details.all) {
    var rv = [], i, e;
    for (var [,path] in Iterator(paths)) {
      result = contextDocument.evaluate(
        path,
        contextNode,
        resolver,
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
     result = contextDocument.evaluate(
        path,
        contextNode,
        resolver,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;
    if (result) {
      return result;
    }
  }
  return null;
}
