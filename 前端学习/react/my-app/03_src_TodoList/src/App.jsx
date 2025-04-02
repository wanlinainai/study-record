import React, { Component } from 'react'
import Header from './components/Header'
import List from './components/List'
import Footer from './components/Footer'

import './App.css'
export default class App extends Component {
  // 状态在哪里，操作状态的方法就在哪里。

  // 初始化状态
  state = {
    todos: [
      { id: '001', name: '吃饭', done: true },
      { id: '002', name: '睡觉', done: false },
      { id: '003', name: '打代码', done: true },
    ]
  }

  addTodo = (todoObj) => {
    // 获取到原来的state
    const { todos } = this.state

    // 追加一个ToDo
    const newTodos = [todoObj, ...todos]

    // 更新状态
    this.setState({
      todos: newTodos
    })
  }

  // 用于更新一个todo对象
  updateTodo = (id, done) => {
    // 获取状态的todos
    const { todos } = this.state
    // 匹配处理数据
    const newTodos = todos.map((todoObj) => {
      if (todoObj.id === id) {
        return { ...todoObj, done }
      }
      else {
        return todoObj
      }
    })
    this.setState({
      todos: newTodos
    })
  }

  // deleteTodo用于删除一个todo对象
  deleteTodo = (id) => {
    const { todos } = this.state
    // 删除指定id的ToDo对象
    const newTodos = todos.filter((todoObj) => {
      return todoObj.id !== id
    })
    // 更新状态
    this.setState({
      todos: newTodos
    })
  }

  // 用于全选
  checkAllTodo = (done) => {
    const { todos } = this.state
    const newTodos = todos.map((todoObj) => {
      return { ...todoObj, done }
    })
    this.setState({
      todos: newTodos
    })
  }

  // 清除所有已完成的
  clearAllDone = () => {
    const { todos } = this.state
    const newTodos = todos.filter((todoObj) => {
      return !todoObj.done
    })
    this.setState({
      todos: newTodos
    })
  }

  render() {
    const { todos } = this.state
    return (
      <div className='todo-container'>
        <div className='todo-wrap'>
          <Header addTodo={this.addTodo} />
          <List todos={todos} updateTodo={this.updateTodo} deleteTodo={this.deleteTodo}></List>
          <Footer todos={todos} checkAllTodo={this.checkAllTodo} clearAllDone={this.clearAllDone}></Footer>
        </div>
      </div>
    )
  }
}
