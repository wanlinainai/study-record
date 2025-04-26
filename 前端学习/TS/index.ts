class Person {
  name: string
  age: string
  constructor(name: string, age: string) {
    this.name = name
    this.age = age
  }

  speak() {
    console.log(`Hello, I'm ${this.name}, i'm ${this.age}岁`);
  }
}

const p1 = new Person('小明', '18')
console.log(p1)
p1.speak()

// 属性的简写形式
class Person2 {
  constructor(public name: string, public age: number) { }
}

