define("cloudlib", {
  load: function (name, req, onload, config) {
    
    var evaluator = function(request) {
      
      var cl = JSON.parse(request.target.response);
      var callback_string = cl.callback;
      var callback = eval("(" + callback_string + ")");
      
      var deps_json = cl.deps;
      var deps = [];
      
      var initiated_callback;
      
      if (deps_json) {
        deps_json.forEach(function(dep_json) {
          deps.push(JSON.parse(dep_json));
        });
        initiated_callback = callback.apply(this, deps);
        onload(initiated_callback);
      }
      else {
        initiated_callback = callback();
      }
      
      onload(initiated_callback);
      
    };
    
    var dataRequest = new XMLHttpRequest();
    dataRequest.onload = evaluator;
    var url = "http://lit-caverns-8396.herokuapp.com/cl/test/" + name;
    //dataRequest.withCredentials = true;
    dataRequest.open("get", url, true);
    dataRequest.send();
    
  }
});

var cloudLib = function(package_definition, name, deps, callback) {
  
  if (typeof name !== 'string' && !!deps) {
    // we need a name, due to issues with anonymously defined modules in requireJS
    // which is fine, because cloudLib's need a name as well!
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
  
  if (deps && deps.length) {
    
    var dep_count = deps.length;
    var string_deps = [];
    
    var store = function() {
      var cl = {
        deps: string_deps,
        callback: callback.toString()
      };
      localStorage.setItem(package_definition.name, JSON.stringify(cl));
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
    var cl = {
      callback: callback.toString()
    };
    localStorage.setItem(package_definition.name, JSON.stringify(cl));
  }
  
};