"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let Person1 = class Person1 {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }
    speak() {
        console.log('你好啊');
    }
};
Person1 = __decorate([
    LogInfo(3)
], Person1);
// 装饰器工厂
function LogInfo(n) {
    // 装饰器
    return function (target) {
        target.prototype.introduce = function () {
            for (let index = 0; index < n; index++) {
                console.log(`我叫:${this.name}, 年龄是:${this.age}`);
            }
        };
    };
}
const person1 = new Person1('张三', 18);
person1.introduce();
