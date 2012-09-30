/*jshint node:true, indent:2, curly:false, eqeqeq:true, immed:true, latedef:true, newcap:true, noarg:true,
regexp:true, undef:true, strict:true, trailing:true, white:true */
/*global X:true */

(function () {
  "use strict";
  
  var _http = X.http, _ = X._, parser, httpProxy = require("http-proxy"), _path = X.path;
  
  parser = {};
  parser.json = X.connect.utils.parseJSONCookies;
  parser.parse = require(_path.join(X.basePath, "node_modules/xt/node_modules/connect/node_modules/cookie")).parse;
  
  X.proxyController = X.Object.create({
    proxies: [],
    map: {},
    init: function () {
      this.retrieveList();
      
      // although VERY rare there is the possiblity of a datasource
      // being added during an iteration and missing the update event
      // if the proxy is registering at the same time, make sure we
      // catch any of these instances - it safely ignores attempts to
      // re-add datasource proxies that already exist
      setInterval(_.bind(this.retrieveList, this), 60000);
    },
    route: function (req, res) {
      var proxy = this.next(), sid, cookie, map, buffer;
      
      if (!proxy) return res.end("No proxy available");
      
      //X.debug("%@:%@".f(proxy.target.host, proxy.target.port));
      
      if (req.url.match(/socket\.io/g)) {
        cookie = req.cookies? req.cookies.xtsessioncookie: null;
        if (X.none(cookie)) {
          X.warn("Invalid or missing cookie on request for socket");
          //return res.end(); // ????????????
          return proxy.proxyRequest(req, res);
        }
        cookie = X.json(cookie);
        if (X.none(cookie)) {
          X.warn("Could not parse cookie");
          return proxy.proxyRequest(req, res);
        }
        sid = cookie.sid;
        if (X.none(sid)) {
          X.warn("Invalid or missing session id on request");
          //return res.end(); // ????????????
          return proxy.proxyRequest(req, res);
        }
        map = this.get("map");
        map[sid] = proxy;
      }
      proxy.proxyRequest(req, res);
    },
    upgrade: function (req, socket, head) {
      var proxy, map = this.get("map"), sid, cookie;
      cookie = req.headers.cookie? parser.json(parser.parse(req.headers.cookie)): null;
      if (X.none(cookie) || X.none(cookie.xtsessioncookie)) {
        X.warn("Invalid or missing cookie on upgrade request");
        return; // ??????????
      }
      cookie = X.json(cookie.xtsessioncookie);
      //X.debugging = true;
      //X.debug(cookie, map);
      sid = cookie? cookie.sid: null;
      if (X.none(sid) || X.none(map[sid])) {
        X.warn("Invalid or missing session id on upgrade request", req);
        return; // ??????????
      }
      proxy = map[sid];
      proxy.proxyWebSocketRequest(req, socket, head);
      delete map[sid];
    },
    retrieveList: function () {
      //X.debug("X.proxyController.retrieveList()");
      //X.log("Attempting to update the available datasources...");
      var req, options = {
        hostname: "localhost",
        port: 9000,
        path: "/datasources",
        method: "GET"
      };
      req = _http.request(options, _.bind(this.didRetrieveList, this));
      req.on("error", _.bind(this.didError, this));
      req.end();
    },
    next: function () {
      var proxies = this.get("proxies"), ret;
      if (!proxies || proxies.length <= 0) return undefined;
      ret = proxies.shift();
      proxies.push(ret);
      return ret;
    },
    didRetrieveList: function (res) {
      var data = {payload: ""};
      res.on("data", _.bind(this.chunk, this, data));
      res.on("end", _.bind(this.didEnd, this, data));
    },
    chunk: function (data, chunk) {
      data.payload += chunk;
    },
    didEnd: function (data) {
      //X.debug("didEnd(): ", data);
      this.set("_proxies", X.json(data.payload));
      this.emit("ready");
    },
    didError: function (err) {
      X.warn(err);
    },
    proxiesDidChange: function () {
      var proxies = this.get("_proxies");
      //proxies = proxies.map(_.bind(this.makeProxy, this));
      _.forEach(proxies, _.bind(this.addProxy, this));
      // avoid the observer
      //this.proxies = proxies;
    }.observes("_proxies"),
    addProxy: function (info) {
      var proxies = this.get("proxies"), details;
      details = _.pluck(proxies, "target");
      if (_.find(details, function (detail) {
        return (detail.host === info.hostname && detail.port === info.port);
      })) return; //X.warn("Cannot re-add active proxy");
      proxies.push(this.makeProxy(info));
    },
    removeProxy: function (info) {
      var proxies = this.get("proxies"), details, i, target;
      details = _.pluck(proxies, "target");
      target = _.find(details, function (detail) {
        return (detail.host === info.hostname && detail.port === info.port);
      });
      if (!target) return X.warn("Could not find datasource to remove %@:%@".f(info.host, info.port));
      i = _.indexOf(details, target);
      proxies.splice(i, 1);
      X.log("Removed datasource, %@ %@:%@".f(info.name, info.hostname, info.port));
    },
    makeProxy: function (info) {
      X.log("Adding datasource, %@ %@:%@".f(info.name, info.hostname, info.port));
      return (new httpProxy.HttpProxy({
        target: {
          host: info.hostname,
          port: info.port,
          https: true
        }
      }));
    },
    className: "X.proxyController"
  });
}());
