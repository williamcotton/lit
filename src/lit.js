(function(root) {
  
  var hostname = "www.corslit.com";
  var GITHUB_OAUTH_CLIENT_ID = "f497d63f8657e29d73cc";
  
  if (window.location.hostname == "localhost" || typeof(LIT_DEV) != "undefined") {
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

      var evaluator = function(request) {

        var lit_pack = JSON.parse(request.target.response);
        var callback_string = lit_pack.callback;
        
        var sourceMap = "//# sourceURL=" + name;
        var callback = eval("(\n\n\n" + callback_string + ")" + sourceMap); // EVAL IS EVIL!
        
        var deps = lit_pack.deps;
        var initiated_callback;
        
        require(deps, function() {
          initiated_callback = callback.apply(this, arguments);
          onload(initiated_callback);
        });
        
      };

      var dataRequest = new XMLHttpRequest();
      dataRequest.onload = evaluator;
      
      var url = host_url + "/v0/" + name;

      dataRequest.withCredentials = true;
      dataRequest.open("get", url, true);
      dataRequest.send();

    }
  });
  
  var initializeLitLogin = function() {
    
    var login_button = document.createElement("div");
    login_button.classList.add("login");
    document.body.appendChild(login_button);
    
    var secret_oauth_lookup = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});
    
    var loginWithCode = function(code) {
      var loginRequest = new XMLHttpRequest();
      loginRequest.open("get", host_url + '/oauth_token?code=' + code, true);
      loginRequest.onload = function(request) {
        var github_details = JSON.parse(request.target.response);
      };
      loginRequest.withCredentials = true;
      loginRequest.send();
    };
    
    var pollForOAuthCode = function() {
      pollUrl(host_url + '/oauth_poll/' + secret_oauth_lookup, function(request) {
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
      window.open('https://github.com' + 
        '/login/oauth/authorize' + 
        '?client_id=' + GITHUB_OAUTH_CLIENT_ID +
        '&redirect_uri=' + host_url + "/login/" + secret_oauth_lookup +
        '&scope=gist');
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
    
    login_button.addEventListener("click", function() {
      authorizeWithGithub();
    });
    
  };

  var lit = function(package_definition, name, deps, callback) {

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
      xhr.onload = function () {
        //console.log(this.responseText);
      };
      xhr.onerror = function(error) {
        //console.log(error, this);
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
  
  root.lit = lit;
  
  initializeLitLogin();
  
})(this);