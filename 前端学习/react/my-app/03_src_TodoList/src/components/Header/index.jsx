import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { nanoid } from 'nanoid'
import './index.css'

export default class Header extends Component {

  // 对接收的props进行类型、必要性校验
  static propTypes = {
    addTodo: PropTypes.func.isRequired
  }

  handleKeyUp = (event) => {
    // 解构赋值
    const { keyCode, target } = event
    // 判断是否是回车按钮
    if (keyCode !== 13) return
    // 添加的todo不能是空
    if (target.value.trim() === '') {
      alert('输入不能为空')
      return
    }
    // 准备好一个todo对象
    // nanoid()生成唯一id
    const todoObj = { id: nanoid(), name: target.value, done: false }
    // 将todoObj传递给App
    this.props.addTodo(todoObj)
    // 清空输入
    target.value = ""
  }
  render() {
    return (
      <div className='todo-header'>
        <input onKeyUp={this.handleKeyUp} type="text" placeholder='请输入你的任务名称，按回车键确认' />
      </div>
    )
  }
}
