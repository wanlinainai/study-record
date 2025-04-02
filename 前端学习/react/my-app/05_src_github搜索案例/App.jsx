import React, { Component } from 'react'
import List from './components/List'
import Search from './components/Search'

export default class App extends Component {

  state = { // 初始化状态
    users: [], // users初始化成数组
    isFirst: true,// 标识是否是第一次打开页面
    isLoading: false, // 标识是否处于加载中
    err: ''
  }

  // 更新App的state
  updateAppState = (stateObj) => {
    this.setState(stateObj)
  }

  render() {

    return (
      <div className='container'>
        <Search updateAppState={this.updateAppState} />
        <List {...this.state} />
      </div>
    )
  }
}
