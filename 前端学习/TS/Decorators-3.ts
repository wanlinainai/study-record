function Demo(target:object, propertyKey:string) {
  console.log(target, propertyKey)
}

class Person3 {
  @Demo name: string;
  age: number;
  static school: string
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
  introduce() {
    console.log('你不好');
  }
}

