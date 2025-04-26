// 定义一个包装类：包含weight体重信息
// 再定一个标准包装类，继承自包装类
abstract class Pakcage {
  constructor(public weight: number) { }
  // 抽象方法
  abstract calulate(): number;

  printPackage() {
    console.log(`包裹重量是:${this.weight}kg, 运费是: ${this.calulate()} 元`);
  }
}

class StandardPackage extends Pakcage {

  constructor(weight: number, public unitPrice: number) {
    super(weight);
  }
  calulate(): number {
    return this.unitPrice * this.weight;
  }
}

const s1 = new StandardPackage(10, 5)
s1.printPackage();
