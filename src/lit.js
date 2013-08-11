(function(root) {
  
  var hostname = "www.corslit.com";
  var GITHUB_OAUTH_CLIENT_ID = "f497d63f8657e29d73cc";
  
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
  }
  
  var username = function() {
    return getCookie("lit!username");
  };
  
  var avatar_url = function() {
    return getCookie("lit!avatar_url");
  };
  
  var last_login_timestamp = function() {
    return getCookie("lit!last_login_timestamp");
  };
  
  if (typeof(LIT_DEV) != "undefined") {
    hostname = "localhost:" + 5000;
    GITHUB_OAUTH_CLIENT_ID = "b1f2f347b61ebc0794d0";
  }
  
  var host_url = "http://" + hostname;
  
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
    return pollInterval;l
  };
  
  define("lit", {
    load: function (name, req, onload, config) {
      var dataRequest = new XMLHttpRequest();
      dataRequest.onload = function(request) {
        var lit_pack = JSON.parse(request.target.response);
        var callback_string = lit_pack.callback;
        var sourceMap = "//# sourceURL=" + name;
        var callback = eval("(\n\n\n" + callback_string + ")" + sourceMap); // EVAL IS EVIL!
        var deps = lit_pack.deps;
        require(deps, function() {
          var initiated_callback = callback.apply(this, arguments);
          onload(initiated_callback);
        });
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
  }
  
  var emitError = function(error) {
    errors.push(error);
    emit("error", error);
  }
  
  emitStoreReceipt = function (storeReceipt) {
    published.push(storeReceipt);
  }
  
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
      emitState({listenForWindowMessage:hostname});
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
        '&redirect_uri=' + host_url + "/login/" + secret_oauth_lookup +
        '&scope=gist';
      emitState({openGithubOAuthWindow:url});
      window.open(url);
    };

    var authorizeWithGithub = function() {
      openGithubOAuthWindow();
      var pollInterval = pollForOAuthCode();
      if (window.location.host == hostname) {
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
  }
  var emit = function(event) {
    if (event in events === false) return;
    for (var i = 0; i < events[event].length; i++) {
      events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
    }
  }
  
  var test = function(test_definition, callback) {
    
    var moduleName;
    if (test_definition["for"].indexOf("/") > -1) {
      moduleName = test_definition["for"].split("/")[1];
    }
    else {
      moduleName = test_definition["for"];
    }
    
    var testModuleName = moduleName + "-test";
    
    var username = window.location.pathname.split("/")[1];
    
    var pathName = username + "/" + moduleName;
    
    lit({name: testModuleName}, ["lit!" + pathName], callback);
    
  };
  
  var load = function(litPath, callback) {
    
    var litModule = litPath.split("/")[1];
    
    var url = host_url + "/v0/" + litPath;
    
    var loader = function(request) {
    
      var code, demo_src, new_module;
      if (!request.target.response) {
        code = '\nlit({"name":"' + litModule + '"}, [], function() {\n\n\n\n});\n';
        new_module = true;
      }
      else {
        var lit_pack = JSON.parse(request.target.response);
        var package_definition_json = lit_pack.package_definition;
        var package_definition = JSON.parse(package_definition_json);
        demo_src = package_definition.demo;
        code = '\nlit(' + package_definition_json + ',' + JSON.stringify(lit_pack.deps) + ' , ' + lit_pack.callback + ');';
        new_module = false;
      }
      
      var codeLoad = {
        code: code,
        demo_src: demo_src,
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
    
    if (typeof(package_definition) == "string") {
      return require("lit!" + package_definition);
    }
    
    if (package_definition.length > 0) {
      deps = package_definition;
      callback = name;
      var new_deps = [];
      deps.forEach(function(d) {
        if (d.indexOf("/") == -1) {
          d = username() + "/" + d;
        }
        new_deps.push("lit!" + d);
      });
      return require(new_deps, callback);
    }

    if (typeof name !== 'string' && !!deps) {
      // we need a name, due to issues with anonymously defined modules in requireJS
      // which is fine, because lit's need a name as well!
      define(package_definition.name, name, deps);
    }
    else {
      define(name, deps, callback);
    }

    if (typeof name !== 'string') {
        //Adjust args appropriately
        callback = deps;
        deps = name;
        name = null;
    }

    //This module may not have dependencies
    if (typeof(deps.sort) != "function") {
        callback = deps;
        deps = null;
    }

    var storelit = function(moduleName, litPack) {

      var data = new FormData();
      data.append('moduleName', moduleName);
      data.append('litPack', litPack);

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
    storelit(package_definition.name, JSON.stringify(lit_pack));
    
    var initiated_callback;
    
    require(deps, function() {
      initiated_callback = callback.apply(this, arguments);
    });
    
    return function() {
      return initiated_callback;
    };

  };
  

  
  
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
  lit.on = on;
  
  root.lit = lit;
  
  
  
  
  /*
  
    Get this junk out of here!!!
  
  */
  
  // var lighter_container;
  // var hide = function() {
  //   lighter_container.style.display = 'none';
  // };
  // var litLighter = function() {
  //   
  //   appendStyleSheet(host_url + "/styles/lighter.css");
  //   appendStyleSheet(host_url + "/styles/cleanslate.css");
  //   
  //   lighter_container = document.createElement("div");
  //   lighter_container.classList.add("lighter-container");
  //   lighter_container.classList.add("cleanslate");
  //   document.body.appendChild(lighter_container);
  //   
  //   var authorize_button = document.createElement("div");
  //   authorize_button.classList.add("login");
  //   lighter_container.appendChild(authorize_button);
  //   
  //   var status_display = document.createElement("div");
  //   status_display.classList.add("status");
  //   lighter_container.appendChild(status_display);
  //   
  //   authorize_button.addEventListener("click", function() {
  //     lit.login();
  //   });
  //   
  // };
  // litLighter();
  
})(this);