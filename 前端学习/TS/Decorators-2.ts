function test1(target: Function) {
  console.log('test1');
}

function test2() {
  console.log('test2工厂');
  return function (target: Function) {
    console.log('test2')
  }
}

function test3() {
  console.log('test3工厂');
  return function (target: Function) {
    console.log('test3')
  }
}

function test4(target: Function) {
  console.log('test4');
}

@test1
@test2()
@test3()
@test4
class Person2 {

}

// 执行顺序：装饰器工厂：从上到下，装饰器： 从下到上
