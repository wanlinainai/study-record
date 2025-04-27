
@LogInfo(3)
class Person1 {
  name: string;
  age: number;
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }

  speak() {
    console.log('你好啊');
  }
}

interface Person1 {
  introduce: () => void;
}


// 装饰器工厂
function LogInfo(n: number) {
  // 装饰器
  return function (target: Function) {
    target.prototype.introduce = function () {
      for (let index = 0; index < n; index++) {
        console.log(`我叫:${this.name}, 年龄是:${this.age}`)
      }
    }
  }
}

const person1 = new Person1('张三', 18);
person1.introduce();
