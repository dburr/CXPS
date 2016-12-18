const Q = require("q");
const fs = require("fs");
const extend = require("extend");
const path = require("path");
const Log = require("./log.js");
const readline = require("readline");
const log = new Log.create(Log.LEVEL.VERBOSE, "Global");
const formidable = require("formidable");
const querystring = require("querystring");
const crypto = require("crypto");
const sqlite3 = require("sqlite3");
const chalk = require("chalk");
const mysql = require("mysql");
const Database = require("./database.js");
const promiseMySQL = require("promise-mysql");
const timeout = require("./timeout.js");

var common;
const FILES = {
  CONFIG: "./config.json"
};
const CONSTANT = {
  AUTH: {
    REJECTED: 0,
    NONE: 1,
    PRE_LOGIN: 2,
    CONFIRMED_USER: 3
  },
  REQUEST_TYPE: {
    BOTH: 0,   //  api & module/action
    SINGLE: 1, //  module/action only
    MULTI: 2   //  api only
  },
  RESPONSE_TYPE: {
    SINGLE: 1,
    MULTI: 2
  }

};

var database = null;
var database2 = null;


Array.prototype.forEachAsync = function(each){
  var array = this;
  var defer = Q.defer();
  if (typeof each !== "function"){ throw new Error("Argument is not a Function"); }
  var loop = function(i, a){
    if (typeof a[i] === "undefined"){
      defer.resolve();
      return;
    }
    each(a[i], function(){
      loop(i+1,array);
    });
  };loop(0,array);
  return defer.promise;
};
const defaultConfig = {
  server:{
    port: 8080,
    hostname: "0.0.0.0"
  },
  hmac_key: "",
  misc_settings: {
    enable_quick_restart: true
  },
  database: {
    autoReconnect: true,
    autoReconnectDelay: 1000,
    autoReconnectMaxAttempt: 10,
    dateStrings: true,
    host: "",
    user: "",
    password: "",
    database: ""
  },
  log: {
    level: Log.LEVEL.VERBOSE
  },
  modules: {
    award: {
      unlock_all: true
    },
    background: {
      unlock_all: true
    },
    live: {
      unlock_all_lives: false //TODO: unlock all lives not implimented.
    }

  }
};

const config = {};
const loadConfig = function () {
  var defer = Q.defer();
  fs.readFile(FILES.CONFIG, "UTF-8", function(err,data){
    if (err){
      if (err.code === "ENOENT"){
        extend(true, config, defaultConfig);
        defer.resolve();
      }else{
        defer.reject(err);
      }
      return;
    }
    try {
      var loadedConfig = JSON.parse(data);
      extend(true, config, defaultConfig, loadedConfig);
      log.LOG_LEVEL = config.log.level;
      defer.resolve();
    } catch (e){
      defer.reject(e);
    }
  });
  return defer.promise;
};
const Modules = {};
const AUTH_TOKENS = {};
const loadModules = function () {
  var defer = Q.defer();
  common = require("./common.js")(module.exports);
  fs.readdir("./modules/","UTF-8",function(err,files){
    files.forEachAsync(function(file, next){
      var p = path.parse("./modules/" + file);
      if (p.ext !== ".js") { next(); return; }
      fs.stat(path.format(p), function(err, stats){
        if (err || !stats.isFile()) { next(); return; }
        var nameValidate = p.name.match(/^[a-z][a-z0-9]*$/g);
        if (!nameValidate || nameValidate[0]!== p.name) {
          log.warn("Module '" + p.name + "' has an invalid name. " +
                            "It will not be loaded.");
          next();
          return;
        }
        Modules[p.name] = require.main.require(path.format(p))(module.exports);
        log.verbose("Loaded Module: " + p.name);
        next();
      });
    }).then(function(){
      defer.resolve();
    }).catch(function(e){
      defer.reject(e);
    });
  });


  return defer.promise;
};
const Action = function(auth, requestType, method){
  this.requiredAuthLevel = auth;
  this.requestType = requestType;
  this.method = method;
};
const Module = function(actions, other){
  this.actions = actions;
  this.commands = {};
  if (typeof other === "object" && typeof other.commands === "object"){
    this.commands = other.commands;
  }

  this.runAction = function(action, requestData){
    var defer = Q.defer();
    if (this.actions[action] instanceof Action){
      let a = this.actions[action];
      requestData.getAuthLevel().then(function(authLevel){
        if (authLevel >= a.requiredAuthLevel){
          a.method(requestData,function(status_code, responseData){
            defer.resolve({status: status_code, result: responseData});
          });
        }else{
          defer.resolve({status: 403, result: {message: "No Permission"}});
        }
      });

    }else{
      log.warn("Action not Found: " + requestData.formData.module + "/" + requestData.formData.action);
      defer.resolve({status: 404, result: {message: "Action not found."}});
    }
    return defer.promise;
  };

};

const RequestData = function(headers, formData){
  this.user_id = null;
  this.authorize_token = null;
  this.auth_level = CONSTANT.AUTH.NONE;
  this.formData = formData;


  if (formData && formData.request_data){
    try {
      console.log(formData.request_data);
      this.formData = JSON.parse(this.formData.request_data);
    } catch (e){
      log.error(e);
      this.auth_level = CONSTANT.AUTH.REJECTED;
    }
  }

  if (headers.authorize){
    var authorizeHeader = querystring.parse(headers.authorize);

    if (authorizeHeader.token && authorizeHeader.token.match(/^[a-z0-9]{70,90}$/gi)){
      this.authorize_token = authorizeHeader.token;
    }
  }
  if (headers["user-id"] && headers["user-id"].match(/^\d+$/gi)){
    this.user_id = parseInt(headers["user-id"]);
  }

  this.getAuthLevel = function(){
    var defer = Q.defer();

    var t = this;
    switch(this.auth_level){
    case CONSTANT.AUTH.PRE_LOGIN:
    case CONSTANT.AUTH.CONFIRMED_USER:
    case CONSTANT.AUTH.REJECTED: {
      defer.resolve(this.auth_level);
      break;
    }
    default: {
      if (this.user_id === null && this.authorize_token === null){
        log.debug(headers);
        defer.resolve(CONSTANT.AUTH.NONE);
        break;
      }
      if (this.user_id === null && typeof this.authorize_token === "string"){
        //Has Token, but not User ID: PreLogin
        if (typeof AUTH_TOKENS[this.authorize_token] === "object"){
          //Token Exists
          if (AUTH_TOKENS[this.authorize_token].expire >= Date.now()){
            //Token Valid
            this.auth_level = CONSTANT.AUTH.PRE_LOGIN;
          }else{
            //Token Expired
            this.auth_level = CONSTANT.AUTH.REJECTED;
          }
        }else{
          //Token Doesn't Exist
          this.auth_level = CONSTANT.AUTH.REJECTED;
        }
        defer.resolve(this.auth_level);
        return defer.promise;
      }

      if (this.authorize_token && this.user_id){

        //Has a Token and a User ID: Logged In
        database.query("SELECT user_id FROM user_login WHERE user_id = :user AND login_token = :token", {
          user: this.user_id,
          token: this.authorize_token
        }, function(err,userCheck){
          if (err || userCheck.length != 1){
            if (err) log.error(err);
            this.auth_level = CONSTANT.AUTH.REJECTED;
            defer.resolve(this.auth_level);
            return;
          }

          if (userCheck[0].user_id === t.user_id){
            this.auth_level = CONSTANT.AUTH.CONFIRMED_USER;
          }else{
            this.auth_level = CONSTANT.AUTH.REJECTED;
          }
          defer.resolve(this.auth_level);
        });
      }
    }
    }
    return defer.promise;
  };
};
const timeStamp = function(){
  return Math.floor(Date.now()/1000);
};
const writeJsonResponse = function(response,status,object, userData){

  response.setHeader("content-type", "application/json; charset=utf-8");
  var authorizeHeader = {consumerKey:"lovelive_test", timeStamp: timeStamp(), version: "1.1", requestTimeStamp: timeStamp()};
  if (userData && userData.token) authorizeHeader.token = userData.token;
  response.setHeader("status_code", status);
  //response.setHeader("server-version", "8.0.69");
  response.setHeader("server_version", "20120129");
  if (userData && userData.user_id) {
    response.setHeader("user_id", userData.user_id);
    authorizeHeader.user_id = userData.user_id;
  }else{
    response.setHeader("user_id","");
    authorizeHeader.user_id = "";
  }
  authorizeHeader.nonce = 1;
  response.setHeader("authorize", querystring.stringify(authorizeHeader));
  response.setHeader("version_up",0);
  response.setHeader("x-powered-by", "Caraxian Private Server");
  var o = {
    response_data: object.response_data,
    release_info: [],
    status_code: status
  };
  object.release_info = [];
  var responseString = JSON.stringify(o);
  log.verbose(o);
  response.setHeader("x-message-code",crypto.createHmac("sha1", config.hmac_key).update(responseString).digest("hex"));
  response.setHeader("x-message-sign",crypto.createHmac("sha256", config.hmac_key).update(responseString).digest("hex"));
  response.statusCode = status;
  response.writeHead(status, {});
  response.end(responseString);
};
const mainRequestHandler = function(request,response, module, action){

  var form = new formidable.IncomingForm();
  form.parse(request, function(err,fields){
    if (err){
      log.error(err);
      writeJsonResponse(response, 600, {status_code: 600, response_data: {message:err.message}});
      return;
    }
    var requestData = new RequestData(request.headers, fields);

    requestData.getAuthLevel().then(function(authLevel){
      if (authLevel === CONSTANT.AUTH.REJECTED){
        //Rejected
        writeJsonResponse(response, 403, {status_code: 403, response_data: {message: "Not Authorized"}});
        return;
      }

      switch(module){
      case "api":{


        var actions = [];

        try {
          actions = JSON.parse(fields.request_data);
        } catch (e){
          log.error(e);
          writeJsonResponse(response, 403, {status_code: 403, response_data: {message: e.message}});
          return;
        }

        var responseData = [];

        var loop = function(callback){
          var next = actions.shift();
          if (!next){ callback(); return; }
          var actionResp = {
            status: 0,
            result: {},
            timeStamp: Math.floor(Date.now()/1000),
            request: next.module + "/" + next.action,
            commandNum: false
          };
          if (Modules[next.module.toLowerCase()] instanceof Module){
            log.verbose(chalk.yellow(next.module + "/" + next.action), "api/multirequest");
            requestData.formData = next;
            Modules[next.module.toLowerCase()].runAction(next.action.toLowerCase(), requestData, CONSTANT.RESPONSE_TYPE.MULTI).then(function(actionResponse){
              actionResp.status = actionResponse.status,
              actionResp.result = actionResponse.result;
              responseData.push(actionResp);
              loop(callback);
            });
          }else{
            log.warn("Module Not Found - " + next.module);
            actionResp.status = 404;
            actionResp.result = "Module not Found";
            responseData.push(actionResp);
            loop(callback);
          }
        };
        loop(function(){
          writeJsonResponse(response, 200, {response_data: responseData} , {token: requestData.authorize_token, user_id: requestData.user_id});
        });

        break;
      }
      default:{
        if (Modules[module] instanceof Module){
          //console.log(module);
          Modules[module].runAction(action,requestData, CONSTANT.RESPONSE_TYPE.SINGLE).then(function(actionResponse){
            writeJsonResponse(response, actionResponse.status, {status_code: actionResponse.status, response_data: actionResponse.result}, {token: requestData.authorize_token, user_id: requestData.user_id});
          });
          return;
        }

        writeJsonResponse(response, 404, {status_code: 404, response_data: {message: "Module not Found"}});
        break;
      }
      }
    });
  });

};
const httpRequestHandler = function(request,response){
  log.verbose(request.method + " " + request.url);
  var urlSplit = request.url.toLowerCase().replace(/\?.*$/,"").split("/");
  if (urlSplit.length >= 2){
    switch(urlSplit[1]){
    case "main.php":{
      if (urlSplit.length >= 3 && request.method === "POST"){
        if (urlSplit[2] == "download" && urlSplit[3]=="geturl"){ return; }
        mainRequestHandler(request,response, urlSplit[2], urlSplit[3]);
        return;
      }else{
        writeJsonResponse(response, 400, {error: "Bad Request"});
      }
      break;
    }
    default: {
      writeJsonResponse(response, 404, {error: "Page not Found"});
    }
    }
    return;
  }
  writeJsonResponse(response, 400, {error: "Bad Request"});
};

const readLineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const initReadLine = function(){
  readLineInterface.question("", (answer)=>{
    initReadLine();
    if (answer == "" && config.misc_settings.enable_quick_restart){
      fs.writeFileSync("./.restart", "");
      process.exit(0);
      return;
    }

    var command = answer.match(/(?=\S)[^"\s]*(?:"[^\\"]*(?:\\[\s\S][^\\"]*)*"[^"\s]*)*/g);
    if (!command){ return; }
    for (let i=0;i<command.length;i++){
      if (command[i].startsWith("\"") && command[i].endsWith("\"")){
        command[i] = command[i].substr(1,command[i].length-2);
      }
    }

    var f = command.shift();
    if (typeof common.COMMANDS[f] === "function"){
      common.COMMANDS[f].apply(null, command);
      return;
    }

    log.warn("Invalid Command");

  });
};

const createAuthToken = function(token, user, expire){
  if (!AUTH_TOKENS[token]){
    AUTH_TOKENS[token] = {expire: expire, user: user};
    return token;
  }
  return false;
};
//Handle Clearing Temp Auth Tokens
setInterval(function(){
  var tokens = Object.keys(AUTH_TOKENS);
  tokens.forEach(function(t){
    if (AUTH_TOKENS[t]){
      if (AUTH_TOKENS[t].expire <= Date.now()){
        delete AUTH_TOKENS[t];
      }
    }
  });
},5000);

const mysqlConnect = function(){
  return new Promise(function(resolve, reject){
    database = new Database(extend({
      logLevel: config.log.level,
      disconnected: function(){
        log.fatal("Lost Connection to MySQL Database");
        process.exit(1);
      },
    },config.database));
    database.connect().then(resolve).catch(function(err){
      log.error(err.message, "Database");
      timeout(1000).then(mysqlConnect).then(resolve).catch(function(err){
        reject(err);
      });
    });
  });
};

module.exports = {
  CONSTANT: CONSTANT,
  Log: Log,
  Config: function(){return config; },
  loadConfig: loadConfig,
  loadModules: loadModules,
  registerAction: Action,
  registerModule: Module,
  httpRequestHandler: httpRequestHandler,
  initReadLine: initReadLine,
  createAuthToken: createAuthToken,
  database: function(){return database;},
  mysqlConnect: mysqlConnect,
  sqlite3: sqlite3,
  common: function(){return common;}
};
