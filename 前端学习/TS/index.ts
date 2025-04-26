let count: (a: number, b: number) => number

count = function (a, b) {
  return a * b;
}

let arr: string[]
let arr2: Array<number>

arr = ['1', '2', '3']
arr2 = [1, 2, 3]

let fuck1: [string, number]
let fuck2: [string, boolean?]
let fuck3: [string, ...number[]]

// 常量枚举
const enum Direction {
  Up,
  Down,
  Left,
  Right
}



console.log(Direction.Down);

function walk(str: Direction) {
  if (str === Direction.Up) {
    console.log('上');
  } else if (str === Direction.Down) {
    console.log('下');
  } else if (str === Direction.Left) {
    console.log('左');
  } else if (str === Direction.Right) {
    console.log('右');
  }
  console.log('MotherFucker');
}

type shuzi = number

type Status = number | string
type Gender = '男' | '女'

function printStatus(data: Status) {
  console.log(data);
}

function printGender(data: Gender) {
  console.log(data);
}

printStatus(404)
printStatus('404')

printGender('男')

