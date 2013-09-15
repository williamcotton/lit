(function(root) {
  
  var host = "www.corslit.com";
  var hostname = host;
  var GITHUB_OAUTH_CLIENT_ID = "f497d63f8657e29d73cc";
  
  var urlPathName = window.location.pathname;
  var urlHost = window.location.host;
  var urlHostName = window.location.hostname;
  var pathUsername = urlPathName.split("/")[1];
  
  var sameOrigin = host == urlHost;
  var crossOrigin = !sameOrigin;
  
  var published = [];
  var status = [];
  var errors = [];
  
  var getCookie = function(key) {
    var v;
    document.cookie.split(";").forEach(function(c) { 
      var kv = c.replace(" ","").split("=");
      if (kv[0] == key) {
        v = kv[1];
      }
    });
    return decodeURIComponent(v);
  };
  
  var username = function() {
    return getCookie("lit!username");
  };
  
  var avatar_url = function() {
    return getCookie("lit!avatar_url");
  };
  
  var last_login_timestamp = function() {
    return getCookie("lit!last_login_timestamp");
  };
  
  var sameAuthor = username() == pathUsername;
  var crossAuthor = !sameAuthor;
  
  var crossAuthorPost = function(callback) {
    // stub
    
    /*
    
      Spec: display an iframe that requires user input to verify a cross-author or cross-domain publish
    
    */
    var allowedToPost = false;
    callback(allowedToPost);
  };
  
  if (typeof(LIT_DEV) != "undefined") {
    host = "localhost:" + 5000;
    hostname = "localhost";
    GITHUB_OAUTH_CLIENT_ID = "b1f2f347b61ebc0794d0";
  }
  
  var host_url = "http://" + host;
  
  root.LIT_HOSTNAME = host_url;
  
  var pollUrl = function(url, success, failure) {
    var pollInterval = setInterval(function() {
      var pollRequest = new XMLHttpRequest();
      pollRequest.open("get", url, true);
      pollRequest.onload = function(request) {
        if (request.target.response) {
          success(request);
          clearInterval(pollInterval);
        }
      };
      pollRequest.withCredentials = true;
      pollRequest.send();
    }, 1200);
    return pollInterval;
  };
  
  var loadEvalLitPack = function(name, lit_pack, onload) {
    var callback_string = lit_pack.callback;
    var sourceMap = "//# sourceURL=" + name;
    var callback = eval("(\n\n\n" + callback_string + ")" + sourceMap); // EVAL IS EVIL!
    var deps = lit_pack.deps;
    require(deps, function() {
      var initiated_callback = callback.apply(this, arguments);
      onload(initiated_callback);
    });
  };
  
  define("lit", {
    load: function (name, req, onload, config) {
      var dataRequest = new XMLHttpRequest();
      dataRequest.onload = function(request) {
        var lit_pack = JSON.parse(request.target.response);
        loadEvalLitPack(name, lit_pack, onload);
      };
      var url = host_url + "/v0/" + name;
      dataRequest.withCredentials = true;
      dataRequest.open("get", url, true);
      dataRequest.send();
    }
  });
  
  var appendStyleSheet = function(url) {
    var styles = document.createElement("link");
    styles.href = url;
    styles.type = "text/css";
    styles.rel = "stylesheet";
    document.head.appendChild(styles);
  };
  
  var emitState = function (state) {
    status.push(state);
    emit("status", state);
  };
  
  var emitError = function(error) {
    errors.push(error);
    emit("error", error);
  };
  
  emitStoreReceipt = function (storeReceipt) {
    published.push(storeReceipt);
  };
  
  var login = function() {
    
    var secret_oauth_lookup = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});

    var loginWithCode = function(code) {
      var url = host_url + '/oauth_token?code=' + code;
      emitState({loginWithCode:url});
      var loginRequest = new XMLHttpRequest();
      loginRequest.open("get", url, true);
      loginRequest.onload = function(request) {
        var loginReceipt = JSON.parse(request.target.response);
        emitState({loginReceipt:loginReceipt});
      };
      loginRequest.withCredentials = true;
      loginRequest.send();
    };

    var pollForOAuthCode = function() {
      var url = host_url + '/oauth_poll/' + secret_oauth_lookup;
      emitState({pollForOAuthCode:url});
      var pollInterval = pollUrl(url, function(request) {
        var code = request.target.response;
        if (code) {
          loginWithCode(code);
        }
      });
      return pollInterval;
    };

    var listenForWindowMessage = function(callback) {
      emitState({listenForWindowMessage:host});
      window.addEventListener('message', function (event) {
        var code = event.data;
        loginWithCode(code);
        callback();
      });
    };

    var openGithubOAuthWindow = function() {
      var url = 'https://github.com' + 
        '/login/oauth/authorize' + 
        '?client_id=' + GITHUB_OAUTH_CLIENT_ID +
        '&redirect_uri=' + host_url + "/login/" + secret_oauth_lookup;
      emitState({openGithubOAuthWindow:url});
      window.open(url);
    };

    var authorizeWithGithub = function() {
      openGithubOAuthWindow();
      var pollInterval = pollForOAuthCode();
      if (sameOrigin) {
        listenForWindowMessage(function() {
          clearInterval(pollInterval);
        });
      }
    };
    
    authorizeWithGithub();
    
  };
  
  var events = {};
  var on = function(event, fct) {
    events[event] = events[event] || [];
    events[event].push(fct);
  };
  var emit = function(event) {
    if (event in events === false) return;
    for (var i = 0; i < events[event].length; i++) {
      events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
    }
  };
  
  var test = function(test_definition, callback) {
    
    var moduleName;
    if (test_definition["for"].indexOf("/") > -1) {
      moduleName = test_definition["for"].split("/")[1];
    }
    else {
      moduleName = test_definition["for"];
    }
    
    var testModuleName = moduleName + "-test";
    
    var pathName = pathUsername + "/" + moduleName;
    
    lit({name: testModuleName}, ["lit!" + pathName], callback);
    
  };
  
  var newModule = function () {
    var m = prompt("newModule:");
    if (m) {
      window.location.href = "/" + urlPathname.split("/")[1] + "/" + m; 
    }
  };
  
  var load = function(litPath, callback) {
    
    var litModule = litPath.split("/")[1];
    
    var url = host_url + "/v0/" + litPath;
    
    var loader = function(request) {
    
      var code, demo_src, new_module, package_definition, lit_pack;
      
      var response = request.target.response;
      
      if (!response) {
        code = '\nlit({"name":"' + litModule + '"}, [], function() {\n\n\n\n});\n';
        new_module = true;
      }
      else {
        lit_pack = JSON.parse(response);
        var package_definition_json = lit_pack.package_definition;
        package_definition = JSON.parse(package_definition_json);
        demo_src = package_definition.demo;
        var deps = lit_pack.deps || [];
        deps.forEach(function(dep, i) {
          deps[i] = dep.split("lit!")[1];
        });
        code = '\nlit(' + package_definition_json + ', ' + JSON.stringify(deps) + ', ' + lit_pack.callback + ');';
        new_module = false;
      }
      
      var codeLoad = {
        code: code,
        demo_src: demo_src,
        lit_pack: lit_pack,
        package_definition: package_definition,
        new_module: new_module
      };
      
      callback(codeLoad);

    };

    var dataRequest = new XMLHttpRequest();
    dataRequest.open("get", url, true);
    dataRequest.onload = loader;
    dataRequest.send();
    
  };

  var lit = function(package_definition, name, deps, callback) {
    
    // this is a god damned mess
    
    var cleanDep = function(dep) {
      var cleanedDep;
      if (dep.indexOf("lit!") === 0) {
        if (dep.indexOf("/") == -1) {
          cleanedDep = "lit!" + username() + "/" + dep.split("lit!")[1];
        }
        else {
          cleanedDep = dep;
        }
      }
      else {
        if (dep.indexOf("/") == -1) {
          cleanedDep = "lit!" + username() + "/" + dep;
        }
        else {
          cleanedDep = "lit!" + dep;
        }
      }
      return cleanedDep;
    };
    
    if (typeof(package_definition) == "string") {
      if (name && typeof(name) == "function") {
        callback = name;
        deps = [];
        name = package_definition;
      }
      else if (!deps) {
        var dep = package_definition;
        dep = cleanDep(dep);
        return require(dep);
      }
      else {
        callback = deps;
        deps = name;
        name = package_definition;
      }
    }
    
    if (package_definition.length > 0 && package_definition.splice) {
      deps = package_definition;
      callback = name;
      deps.forEach(function(dep, i) {
        deps[i] = cleanDep(dep);
      });
      return require(deps, callback);
    }

    if (typeof name !== 'string') {
        callback = deps;
        deps = name;
        name = package_definition.name;
    }

    if (typeof(deps.sort) != "function") {
        callback = deps;
        deps = null;
    }
    
    if (deps) {
      deps.forEach(function(dep, i) {
        deps[i] = cleanDep(dep);
      });
    }
    
    if (typeof(package_definition) != "object") {
      package_definition = {};
    }
    
    package_definition.name = name;
    
    // All of this above stuff should be refactored based around "arguments"
    
    define(name, deps, callback);

    var storelit = function(moduleName, litPack) {

      var data = new FormData();
      data.append('moduleName', moduleName);
      data.append('litPack', litPack);
      data.append('urlPathName', urlPathName);

      var xhr = new XMLHttpRequest();
      xhr.open('POST', host_url + "/v0", true);
      xhr.onload = function (res) {
        emitStoreReceipt(res.target.response);
      };
      xhr.onerror = function(error) {
        emitError(error);
      };
      xhr.withCredentials = true;
      xhr.send(data);

    };

    var lit_pack = {
      package_definition: JSON.stringify(package_definition),
      deps: deps,
      callback: callback.toString()
    };
    
    if (crossAuthor) {
      crossAuthorPost(function(allowedToPost) {
        if (allowedToPost) {
          storelit(package_definition.name, JSON.stringify(lit_pack));
        }
      });
    }
    else {
      storelit(package_definition.name, JSON.stringify(lit_pack));
    }
    
    var initiated_callback;
    
    require(deps, function() {
      initiated_callback = callback.apply(this, arguments);
    });
    
    return function() {
      return initiated_callback;
    };

  };
  
  var connectWebSocket = function() {
    var wsServerUrl;
    if (hostname == "localhost") {
      wsServerUrl = "ws://localhost:8080";
    }
    else {
      wsServerUrl = "ws://" + hostname + ":8080";
    }
    var wss = new WebSocket(wsServerUrl);
    wss.addEventListener("open");
    lit.subscribe = function(pathName, callback) {
      lit([pathName], callback);
      wss.send("subscribe:" + pathName);
      wss.addEventListener("message", function messageListener(evt) {
        var data = evt.data;
        var evtDataSplit = data.split(":");
        if (evtDataSplit[0] == pathName) {
          var json_data = evtDataSplit.splice(1,evtDataSplit.length).join(":");
          var data = JSON.parse(json_data);
          emitStoreReceipt(data.storeReceipt);
          loadEvalLitPack(pathName, JSON.parse(data.litPack), callback);
        }
      });
      return true;
    };
  };
  
  var connectFirebase = function() {
    require(["https://cdn.firebase.com/v0/firebase.js"], function() { 
      lit.subscribe = function(pathName, callback) {
        var myDataRef = new Firebase('https://lit-store.firebaseio.com/' + pathName);
        myDataRef.on("value", function(snapshot) {
          var data = JSON.parse(snapshot.val());
          emitStoreReceipt(data.storeReceipt);
          loadEvalLitPack(pathName, JSON.parse(data.litPack), callback);
        });
        return true;
      };
    });
  }; 
  
  if (typeof(LIT_DEV) != "undefined") {
    connectWebSocket();
  }
  else {
    connectFirebase();
  }
  
  lit.connectWebSocket = connectWebSocket;
  lit.connectFirebase = connectFirebase;
  lit.published = published;
  lit.status = status;
  lit.errors = errors;
  lit.host_url = host_url;
  lit.login = login;
  lit.test = test;
  lit.username = username;
  lit.avatar_url = avatar_url;
  lit.last_login_timestamp = last_login_timestamp;
  lit.load = load;
  lit.newModule = newModule;
  lit.on = on;
  
  root.lit = lit;
  
})(this);