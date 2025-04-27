"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
class Person4 {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }
}
__decorate([
    State
], Person4.prototype, "age", void 0);
function State(target, propertyKey) {
    let key = `__${propertyKey}`;
    Object.defineProperty(target, propertyKey, {
        get() {
            return this[key];
        },
        set(newValue) {
            console.log(`${propertyKey}的最新值是: ${newValue}`);
            this[key] = newValue;
        }
    });
}
const person2 = new Person4('站三', 199);
const person3 = new Person4('里三', 199);
person2.age = 20;
person3.age = 30;
