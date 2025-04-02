import React, { Component } from 'react'
import store from '../redux/store'
import { createIncrementAction, createDecrementAction } from '../redux/count_action'

export default class Count extends Component {

  state = {}

  // componentDidMount() {
  //   // 监听redux中state的变化
  //   store.subscribe(() => {
  //     // 只要redux中的状态发生任何的改变，都会执行
  //     // 我们自己调用this.render()是不会生效的
  //     // 当你setState的时候，就会自动触发this.render()
  //     this.setState({})
  //   })
  // }

  // 加法
  increment = () => {
    //函数体
    const { value } = this.selectNumber
    store.dispatch(createIncrementAction(value * 1))
  }
  decrement = () => {
    //函数体
    const { value } = this.selectNumber
    store.dispatch(createDecrementAction(value * 1))
  }

  // 奇数再加
  incrementIfOdd = () => {
    //函数体
    const { value } = this.selectNumber
    // const { count } = this.state
    const count = store.getState()
    if (count % 2 !== 0) {
      store.dispatch(createIncrementAction(value * 1))
    }
  }
  // 异步加
  incrementAsync = () => {
    //函数体
    const { value } = this.selectNumber
    const count = store.getState()
    setTimeout(() => {
      store.dispatch(createIncrementAction(value * 1))
    }, 500)
  }
  render() {
    return (
      <div>
        <h1>当前求和为:{store.getState()}</h1>
        <select ref={c => this.selectNumber = c}>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>&nbsp;&nbsp;&nbsp;

        <button onClick={this.increment}>+</button>&nbsp;
        <button onClick={this.decrement}>-</button>&nbsp;
        <button onClick={this.incrementIfOdd}>当前求和为奇数再加</button>&nbsp;
        <button onClick={this.incrementAsync}>异步加</button>&nbsp;
      </div>
    )
  }
}
