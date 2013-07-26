
function GM_xpath(details) {
  var contextNode, contextDocument, paths, resolver, namespace, result;

  if (typeof details == 'string') {
    details = { path: details }
  }

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

  if (details.resolver) {
    if (typeof details.resolver == "string") {
      resolver = {lookupNamespaceURI: function(p) details.resolver};
    }
    else if (typeof details.resolver == "function") {
      resolver = {lookupNamespaceURI: details.resolver};
    }
    else if (typeof resolver.lookupNamespaceURI == "function") {
      resolver = details.resolver;
    }
    else {
      throw new Error("resolver is invalid");
    }
  }
  else if (contextNode.namepaceURI) {
    namespace = contextNode.namespaceURI;
    resolver = {lookupNamespaceURI: function(p) namespace};
  }

  if (details.all) {
    var rv = [], n;
    for (var [,path] in Iterator(paths)) {
      result = contextDocument.evaluate(
        path,
        contextNode,
        resolver,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        null
      );
      while (n = result.iterateNext()) {
        rv.push(n);
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
