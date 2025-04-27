type Constructor = new (...args: any[]) => {}
function LogTime<T extends Constructor>(target: T) {
  // @ts-ignore
  return class extends target {
    createdTime: Date
    constructor(...args: any[]) {
      super(...args);
      this.createdTime = new Date()
    }

    getTime() {
      return `该对象的创建时间是:${this.createdTime}`
    }
  }
}
@LogTime
class Person {

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

interface Person {
  getTime(): void
}


const p1 = new Person('小明', 18);
// console.log(p1);
console.log(p1.getTime());
