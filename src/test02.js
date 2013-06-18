lit({
  name: "test02"
}, ["test02a"], function(Test02a) {

  var Test02 = {
    test02: 2,
    test02a: Test02a.test02a
  };

  return Test02;

});