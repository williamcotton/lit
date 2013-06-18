define([
  "test00", 
  "test01", 
  "test02", 
  "test03",
  "test04",
  "test05"
], function(Test00, Test01, Test02, Test03, Test04, Test05) {
  
  describe("lit", function() {
    
    it("should define a lit", function() {
      expect(Test00.test00).toBe(0);
    });
    
    it("should load from a lit", function() {
      expect(Test01.test00).toBe(0);
    });
    
  });
  
  describe("lit with dependencies", function() {
    
    it("should define a lit with dependencies", function() {
      expect(Test02.test02a).toBe(2);
    });
    
    it("should load from a lit with dependencies", function() {
      expect(Test03.test02).toBe(2);
    });
    
  });
  
  describe("lit with functions", function() {
    
    it("should define a lit with functions", function() {
      expect(Test04()).toBe(4);
    });
    
    it("should load from a lit with functions", function() {
      expect(Test05.test04).toBe(4);
    });
    
  });
  
});