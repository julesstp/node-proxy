(function () {
  "use strict";
  
  var _ = X._;
  
  X.ProxyServer = X.Server.extend({
    autoStart: false,
    name: "Proxy Server",
    port: 443,
    secure: true,
    parseCookies: true,
    delegate: null,
    
    keyFile: X.options.proxyServer.keyFile,
    certFile: X.options.proxyServer.certFile,
    caFile: X.options.proxyServer.caFile,

    className: "X.ProxyServer",
    init: function () {
      var delegate = this.get("delegate");
      delegate.once("ready", _.bind(this.start, this));
      this._super.init.call(this);
    },
    route: function (req, res) {
      var delegate = this.get("delegate");
      delegate.route.call(delegate, req, res);
    },
    start: function () {
      var delegate = this.get("delegate");
      this._super.start.call(this);
      this.server.on("upgrade", _.bind(delegate.upgrade, delegate));
    }
  });
}());