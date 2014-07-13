"use strict";
var EXPORTED_SYMBOLS = ["GM_xmlhttpRequester"];

Components.utils.import("resource://scriptish/constants.js");
Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

lazyImport(this, "resource://scriptish/api.js", ["GM_apiSafeCallback"]);
lazyUtil(this, "stringBundle");

const MIME_JSON = /^(application|text)\/(?:x-)?json/i;

/**
 * Abstract base class for (chained) request notification callback overrides
 *
 * Use such overrides sparely, as the individual request performance might
 * degrade quite a bit.
 *
 * @param req XMLHttpRequest (chrome)
 * @author Nils Maier
 */
function NotificationCallbacks(req) {
  throw Error("trying to initiate an abstract NotificationCallbacks");
}
NotificationCallbacks.prototype = {
  init: function(req) {
    // rewrite notification callbacks
    this._channel = req.channel;
    this._notificationCallbacks = this._channel.notificationCallbacks;
    this._channel.notificationCallbacks = this;
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIInterfaceRequestor]),
  getInterface: function(iid) {
    try {
      return this.query(iid);
    }
    catch (ex) {
      return this.queryOriginal(iid);
    }
  },
  queryOriginal: function(iid) {
    if (this._notificationCallbacks) {
      return this._notificationCallbacks.getInterface(iid);
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  }
}

/**
 * Ignore (specific) redirects
 * @param req XMLHttpRequest (chrome)
 * @author Nils Maier
 */
function IgnoreRedirect(req, ignoreFlags) {
  this.init(req);
  this.ignoreFlags = ignoreFlags;
}
IgnoreRedirect.prototype = {
  __proto__: NotificationCallbacks.prototype,
  query: XPCOMUtils.generateQI([Ci.nsIChannelEventSink]),
  asyncOnChannelRedirect: function(oldChannel, newChannel, flags, callback) {
    if (this.ignoreFlags & flags) {
      // must throw here, not call callback.onRedirectVerifyCallback,
      // or else it will completely cancel the request
      throw Cr.NS_ERROR_UNEXPECTED;
    }

    try {
      let ces = this.queryOriginal(Ci.nsIChannelEventSink);
      if (ces) {
        ces.asyncOnChannelRedirect(oldChannel, newChannel, flags, callback);
        return;
      }
    }
    catch (ex) {}

    callback.onRedirectVerifyCallback(Cr.NS_OK);
  }
};


function GM_xmlhttpRequester(unsafeContentWin, safeWin, originUrl, aScript) {
  this.unsafeContentWin = unsafeContentWin;
  this.safeWin = safeWin;
  this.originUrl = originUrl;
  this.script = aScript;
}

// this function gets called by user scripts in content security scope to
// start a cross-domain xmlhttp request.
//
// details should look like:
// {method,url,onload,onerror,onreadystatechange,headers,data}
// headers should be in the form {name:value,name:value,etc}
// can't support mimetype because i think it's only used for forcing
// text/xml and we can't support that
GM_xmlhttpRequester.prototype.contentStartRequest = function(details) {
  try {
    // Validate and parse the (possibly relative) given URL.
    var uri = NetUtil.newURI(details.url, null, NetUtil.newURI(this.originUrl));
    var url = uri.spec;
  }
  catch (e) {
    // A malformed URL won't be parsed properly.
    throw Error(Scriptish_stringBundle("error.api.reqURL") + ": " + details.url);
  }

  // check if the script is allowed to access the url
  if (!this.script.matchesDomain(url))
    throw Error(
        "User script is attempting access to restricted domain '" + uri.host + "'",
        this.script.fileURL);

  // This is important - without it, GM_xmlhttpRequest can be used to get
  // access to things like files and chrome. Careful.
  switch (uri.scheme) {
    case "http":
    case "https":
    case "ftp":
    case "data":
    case "moz-blob":
    case "blob":
      var req = Instances.xhr;
      this.chromeStartRequest(url, details, req);
      break;
    default:
      throw Error(Scriptish_stringBundle("error.api.reqURL.scheme") + ": " + details.url);
  }

  return {
    __exposedProps__: {
      abort: "r"
    },
    abort: function() {
      req.abort();
    }
  };
}

// this function is intended to be called in chrome's security context, so
// that it can access other domains without security warning
GM_xmlhttpRequester.prototype.chromeStartRequest =
    function(safeUrl, details, req) {
  details = Components.utils.waiveXrays(details);
  
  this.setupRequestEvent(this.unsafeContentWin, req, "onload", details);
  this.setupRequestEvent(this.unsafeContentWin, req, "onerror", details);
  this.setupRequestEvent(this.unsafeContentWin, req, "onprogress", details);
  this.setupRequestEvent(this.unsafeContentWin, req, "onreadystatechange", details);

  if (details.mozBackgroundRequest) req.mozBackgroundRequest = true;

  req.open(
      details.method || "GET",
      safeUrl,
      true,
      details.user || "",
      details.password || ""
      );

  if (details.overrideMimeType) req.overrideMimeType(details.overrideMimeType);

  if (details.ignoreCache)
    req.channel.loadFlags |= Ci.nsIRequest.LOAD_BYPASS_CACHE; // bypass cache

  if (details.ignoreRedirect)
    new IgnoreRedirect(req,
      Ci.nsIChannelEventSink.REDIRECT_TEMPORARY | Ci.nsIChannelEventSink.REDIRECT_PERMANENT);
  if (details.ignoreTempRedirect)
    new IgnoreRedirect(req, Ci.nsIChannelEventSink.REDIRECT_TEMPORARY);
  if (details.ignorePermanentRedirect)
    new IgnoreRedirect(req, Ci.nsIChannelEventSink.REDIRECT_PERMANENT);

  let redirectionLimit = null;
  if (details.failOnRedirect) {
    redirectionLimit = 0;
  }
  if ("redirectionLimit" in details) {
    if (details.redirectionLimit < 0 || details.redirectionLimit > 10) {
      throw Error("redirectionLimit must be within (0, 10), but it is " + details.redirectionLimit);
    }
    redirectionLimit = details.redirectionLimit;
  }
  if (redirectionLimit !== null && req.channel instanceof Ci.nsIHttpChannel) {
    req.channel.redirectionLimit = redirectionLimit;
  }

  if (details.headers) {
    var headers = details.headers;

    for (var prop in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, prop))
        req.setRequestHeader(prop, headers[prop]);
    }
  }

  // Loads initiated from private windows should always be private as well.
  let makePrivate = details.makePrivate || PrivateBrowsingUtils.isWindowPrivate(this.safeWin);
  if (makePrivate && req.channel instanceof Ci.nsIPrivateBrowsingChannel) {
    req.channel.setPrivate(true);
  }

  var body = details.data ? details.data : null;
  if (details.binary) req.sendAsBinary(body);
  else req.send(body);
}

// arranges for the specified 'event' on xmlhttprequest 'req' to call the
// method by the same name which is a property of 'details' in the content
// window's security context.
GM_xmlhttpRequester.prototype.setupRequestEvent =
    function(unsafeContentWin, req, event, details) {
  var origMimeType = details.overrideMimeType;
  var script = this.script;

  if (details[event]) {
    req[event] = function(ev) {
      var responseState = {
        // can't support responseXML because security won't
        // let the browser call properties on it
        __exposedProps__: {
          responseText: "r",
          responseJSON: "r",
          readyState: "r",
          responseHeaders: "r",
          status: "r",
          statusText: "r",
          finalUrl: "r"
        },
        responseText: req.responseText,
        readyState: req.readyState,
        responseHeaders: null,
        status: null,
        statusText: null,
        finalUrl: null
      };
      if ("onprogress" == event) {
        responseState.__exposedProps__.lengthComputable = "r";
        responseState.__exposedProps__.loaded = "r";
        responseState.__exposedProps__.total = "r";
        responseState.lengthComputable = ev.lengthComputable;
        responseState.loaded = ev.loaded;
        responseState.total = ev.total;
      }
      else if (4 == req.readyState && "onerror" != event) {
        responseState.responseHeaders = req.getAllResponseHeaders();
        responseState.status = req.status;
        responseState.statusText = req.statusText;
        if (MIME_JSON.test(origMimeType)
            || MIME_JSON.test(details.overrideMimeType)
            || MIME_JSON.test(req.channel.contentType)) {
          try {
            responseState.responseJSON = JSON.parse(req.responseText);
          } catch (e) {
            responseState.responseJSON = {};
          }
        }
        responseState.finalUrl = req.channel.URI.spec;
      }

      GM_apiSafeCallback(
          unsafeContentWin, script, details, details[event], [responseState]);
    }
  }
}
