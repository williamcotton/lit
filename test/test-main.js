var tests = Object.keys(window.__karma__.files).filter(function (file) {
      return /Spec\.js$/.test(file);
});

// for the time being we need to prime localStorage with these module definitions... that will change when the service endpoint is running
var bootstrap = [[ 'test00', '{"callback":"function () {\\n\\n  var Test00 =  {\\n    test00: 0\\n  }\\n\\n  return Test00;\\n\\n}"}'],
[ 'test02', '{"deps":["{\\"test02a\\":2}"],"callback":"function (Test02a) {\\n\\n  var Test02 = {\\n    test02: 2,\\n    test02a: Test02a.test02a\\n  };\\n\\n  return Test02;\\n\\n}"}']]

bootstrap.forEach(function(ls) {
  localStorage.setItem(ls[0], ls[1]);
});

requirejs.config({
    // Karma serves files from '/base'
    baseUrl: '/base/src',
    urlArgs: "bust=" + (new Date()).getTime(),

    // ask Require.js to load these files (all our tests)
    deps: tests,

    // start test run, once Require.js is done
    callback: window.__karma__.start
});