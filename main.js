#!/usr/bin/env node

(function () {
  
  require("xt");
  
  X.setup({requireServer: true, autoStart: true});
  
  X.debugging = true;
  
  require("./lib/redirector");
  
  // TODO: RIGHT NOW THE NODE-ROUTER INSTANCE IS ASSUMED TO
  // BE LOCALHOST
  require("./lib/proxy_server");
  require("./lib/proxy_controller");
  require("./lib/register_service");
  
  var pc = X.proxyController,
      ps = X.ProxyServer.create({delegate: pc});
  
}());