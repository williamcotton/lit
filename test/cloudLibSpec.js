define([
  "test00", 
  "test01", 
  "test02", 
  "test03"
], function(Test00, Test01, Test02, Test03) {
  
  describe("cloudLib", function() {
    
    it("should define a cloudLib", function() {
      expect(Test00.test00).toBe(0);
    });
    
    it("should load from a cloudlib", function() {
      expect(Test01.test00).toBe(0);
    });
    
  });
  
  describe("cloudLib with dependencies", function() {
    
    it("should define a cloudLib with dependencies", function() {
      expect(Test02.test02a).toBe(2);
    });
    
    it("should load from a cloudLib with dependencies", function() {
      expect(Test03.test02).toBe(2);
    });
    
  });
  
});