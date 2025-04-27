"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
function test1(target) {
    console.log('test1');
}
function test2() {
    console.log('test2工厂');
    return function (target) {
        console.log('test2');
    };
}
function test3() {
    console.log('test3工厂');
    return function (target) {
        console.log('test3');
    };
}
function test4(target) {
    console.log('test4');
}
let Person2 = class Person2 {
};
Person2 = __decorate([
    test1,
    test2(),
    test3(),
    test4
], Person2);
// 执行顺序：装饰器工厂：从上到下，装饰器： 从下到上
