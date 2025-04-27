class Person4 {
  name: string;
  @State age: number;
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
}

function State(target: any, propertyKey: string) {
  let key = `__${propertyKey}`
  Object.defineProperty(target, propertyKey, {
    get() {
      return this[key]
    },
    set(newValue) {
      console.log(`${propertyKey}的最新值是: ${newValue}`);
      this[key] = newValue
    }
  })
}
const person2 = new Person4('站三', 199)
const person3 = new Person4('里三', 199)

person2.age = 20;
person3.age = 30;