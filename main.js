#!/usr/bin/env node

/*jshint node:true, indent:2, curly:false, eqeqeq:true, immed:true, latedef:true, newcap:true, noarg:true,
regexp:true, undef:true, strict:true, trailing:true, white:true */
/*global X:true */

(function () {
  "use strict";
  
  // use config file the same way that node-datasource does
  var options = require("./lib/options"), pc, ps;
  
  require("xt");
  
  options.requireServer = true;
  options.autoStart = true;
  
  X.setup(options);
  
  X.debugging = true;
  
  require("./lib/redirector");
  
  // TODO: RIGHT NOW THE NODE-ROUTER INSTANCE IS ASSUMED TO
  // BE LOCALHOST
  require("./lib/proxy_server");
  require("./lib/proxy_controller");
  require("./lib/register_service");
  
  pc = X.proxyController;
  ps = X.ProxyServer.create({delegate: pc});
  
}());