"use strict";
// 定义一个包装类：包含weight体重信息
// 再定一个标准包装类，继承自包装类
class Pakcage {
    constructor(weight) {
        this.weight = weight;
    }
    printPackage() {
        console.log(`包裹重量是:${this.weight}kg, 运费是: ${this.calulate()} 元`);
    }
}
class StandardPackage extends Pakcage {
    constructor(weight, unitPrice) {
        super(weight);
        this.unitPrice = unitPrice;
    }
    calulate() {
        return this.unitPrice * this.weight;
    }
}
const s1 = new StandardPackage(10, 5);
s1.printPackage();
