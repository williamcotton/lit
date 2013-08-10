(function(root) {
  
  var hostname = "www.corslit.com";
  var GITHUB_OAUTH_CLIENT_ID = "f497d63f8657e29d73cc";
  
  var published = [];
  var status = [];
  var errors = [];
  
  var username = function() {
    var return_val;
    document.cookie.split(";").forEach(function(c) { 
      var cookie = c.replace(" ","").split("=");
      var key = cookie[0];
      var val = cookie[1];
      if (key == "lit!username") {
        return_val = val;
      }
    });
    return return_val;
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
        success(request);
        clearInterval(pollInterval);
      };
      pollRequest.withCredentials = true;
      pollRequest.send();
    }, 500);
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
  
  var login = function() {
    
    var secret_oauth_lookup = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});

    var loginWithCode = function(code) {
      var url = host_url + '/oauth_token?code=' + code;
      status.push({xhr:url});
      var loginRequest = new XMLHttpRequest();
      loginRequest.open("get", url, true);
      loginRequest.onload = function(request) {
        var github_details = JSON.parse(request.target.response);
        status.push({github_details:github_details});
        lighter_container.classList.add("logged-in");
      };
      loginRequest.withCredentials = true;
      loginRequest.send();
    };

    var pollForOAuthCode = function() {
      var url = host_url + '/oauth_poll/' + secret_oauth_lookup;
      status.push({poll_url:url});
      pollUrl(url, function(request) {
        var code = request.target.response;
        if (code) {
          loginWithCode(code);
        }
      });
    };

    var listenForWindowMessage = function() {
      window.addEventListener('message', function (event) {
        var code = event.data;
        loginWithCode(code);
      });
    };

    var openGithubOAuthWindow = function() {
      var url = 'https://github.com' + 
        '/login/oauth/authorize' + 
        '?client_id=' + GITHUB_OAUTH_CLIENT_ID +
        '&redirect_uri=' + host_url + "/login/" + secret_oauth_lookup +
        '&scope=gist';
      status.push({window_open:url});
      window.open(url);
    };

    var authorizeWithGithub = function() {
      openGithubOAuthWindow();
      if (window.location.host == hostname) {
        listenForWindowMessage();
      }
      else {
        pollForOAuthCode();
      }
    };
    
    authorizeWithGithub();
    
  }
  
  var lighter_container;
  var litLighter = function() {
    
    appendStyleSheet(host_url + "/styles/lighter.css");
    appendStyleSheet(host_url + "/styles/cleanslate.css");
    
    lighter_container = document.createElement("div");
    lighter_container.classList.add("lighter-container");
    lighter_container.classList.add("cleanslate");
    document.body.appendChild(lighter_container);
    
    var authorize_button = document.createElement("div");
    authorize_button.classList.add("login");
    lighter_container.appendChild(authorize_button);
    
    var status_display = document.createElement("div");
    status_display.classList.add("status");
    lighter_container.appendChild(status_display);
    
    authorize_button.addEventListener("click", function() {
      lit.login();
    });
    
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

    var storelit = function(name, lit_pack_json) {

      var data = new FormData();
      data.append('name', name);
      data.append('lit_pack_json', lit_pack_json);

      var xhr = new XMLHttpRequest();
      xhr.open('POST', host_url + "/v0", true);
      xhr.onload = function (res) {
        published.push(res.target.response);
      };
      xhr.onerror = function(error) {
        errors.push(error);
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
  
  lit.test = function(test_definition, callback) {
    
    var litName;
    if (test_definition["for"].indexOf("/") > -1) {
      litName = test_definition["for"].split("/")[1];
    }
    else {
      litName = test_definition["for"];
    }
    
    var testName = litName + "-test";
    
    lit({name: testName}, [], callback);
    
    var pathName = window.location.pathname.split("/")[1] + "/" + litName;
    
    require(["lit!" + pathName], callback);
    
  };
  
  lit.published = published;
  lit.status = status;
  lit.errors = errors;
  
  lit.login = login;
  
  lit.hide = function() {
    lighter_container.style.display = 'none';
  }
  
  root.lit = lit;
  
  litLighter();
  
})(this);