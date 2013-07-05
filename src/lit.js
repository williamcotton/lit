(function(root) {
  
  var hostname = "http://lit-caverns-8396.herokuapp.com";
  var GITHUB_OAUTH_CLIENT_ID = "f497d63f8657e29d73cc";
  
  if (window.location.hostname == "localhost") {
    hostname = "http://localhost:" + 5000;
    GITHUB_OAUTH_CLIENT_ID = "b1f2f347b61ebc0794d0";
  }
  
  root.LIT_HOSTNAME = hostname;
  
  define("lit", {
    load: function (name, req, onload, config) {

      var evaluator = function(request) {

        var lit_pack = JSON.parse(request.target.response);
        var callback_string = lit_pack.callback;
        
        /*
        
        For right now it just uses eval instead of say, the RequireJS script loading approach.
        This will probably change, I'm just trying to only solve problems when they need to be solved
        
        The three newlines ("\n\n\n") that you see below are to get the lines numbers to match
        the source code editor.
        
        */
        
        var sourceMap = "//# sourceURL=" + name;
        var callback = eval("(\n\n\n" + callback_string + ")" + sourceMap);
        // EVAL IS EVIL!
        

        var deps_json = lit_pack.deps;
        var deps = [];

        var initiated_callback;

        
        if (deps_json) {
          deps_json.forEach(function(dep_json) {
            deps.push(JSON.parse(dep_json));
          });
        }
        else {
          deps = [];
        }
        
        //try { 
          initiated_callback = callback.apply(this, deps);
          onload(initiated_callback);
        //}
        //catch(err) {
          // tie this in to the source code editor somehow...
        //  console.log(err.stack);
        //}

      };

      var dataRequest = new XMLHttpRequest();
      dataRequest.onload = evaluator;
      
      var url = hostname + "/v0/" + name;

      dataRequest.withCredentials = true;
      dataRequest.open("get", url, true);
      dataRequest.send();

    }
  });
  
  var litLogin = function() {
    
    var login_button = document.createElement("div");
    login_button.classList.add("login");

    document.body.appendChild(login_button);

    login_button.addEventListener("click", function() {
      window.open('https://github.com' + 
        '/login/oauth/authorize' + 
        '?client_id=' + GITHUB_OAUTH_CLIENT_ID +
        '&scope=gist');
    });

    window.addEventListener('message', function (event) {
      var code = event.data;
      var loginRequest = new XMLHttpRequest();
      loginRequest.open("get", '/oauth_token?code=' + code, true);
      loginRequest.onload = function(request) {
        var github_details = JSON.parse(request.target.response);
        console.log(github_details);
      };
      loginRequest.send();
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
      xhr.open('POST', hostname + "/v0", true);
      xhr.onload = function () {
          // do something to response
          console.log(this.responseText);
      };
      xhr.send(data);

    };

    if (deps && deps.length) {

      var dep_count = deps.length;
      var string_deps = [];

      var store = function() {
        var lit_pack = {
          package_definition: JSON.stringify(package_definition),
          deps: string_deps,
          callback: callback.toString()
        };
        storelit(package_definition.name, JSON.stringify(lit_pack));
      };

      // right now this only has one level of dependencies... it needs to search for deps recursively at some point
      deps.forEach(function(dep) {
        require([dep], function(m) {

          dep_count--;
          m_s = typeof(m) == "function" ? m.toString() : JSON.stringify(m);

          string_deps.push(m_s);

          if (dep_count === 0) {
            store();
          }
        });
      });

    }
    else {
      var lit_pack = {
        package_definition: JSON.stringify(package_definition),
        callback: callback.toString()
      };
      storelit(package_definition.name, JSON.stringify(lit_pack));
    }

  };
  
  root.lit = lit;
  
  var docCookies = {
    getItem: function (sKey) {
      return decodeURI(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURI(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
    },
    setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
      if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
      var sExpires = "";
      if (vEnd) {
        switch (vEnd.constructor) {
          case Number:
            sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
            break;
          case String:
            sExpires = "; expires=" + vEnd;
            break;
          case Date:
            sExpires = "; expires=" + vEnd.toGMTString();
            break;
        }
      }
      document.cookie = encodeURI(sKey) + "=" + encodeURI(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
      return true;
    },
    removeItem: function (sKey, sPath) {
      if (!sKey || !this.hasItem(sKey)) { return false; }
      document.cookie = encodeURI(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sPath ? "; path=" + sPath : "") + (sDomain ? "; domain=" + sDomain : "");
      return true;
    },
    hasItem: function (sKey) {
      return (new RegExp("(?:^|;\\s*)" + encodeURI(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
    },
    keys: /* optional method: you can safely remove it! */ function () {
      var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
      for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = decodeURI(aKeys[nIdx]); }
      return aKeys;
    }
  };
  
  litLogin();
  
})(this);