import React, { Component } from 'react'
import './index.css'

export default class Footer extends Component {

  handleCheckAll = (event) => {
    this.props.checkAllTodo(event.target.checked)
  }

  // 清除所有已完成的回调
  handleClearAllDone = () => {
    this.props.clearAllDone()
  }
  render() {
    const { todos } = this.props
    // 已完成的个数
    const doneCount = todos.reduce((pre, todo) => pre + (todo.done ? 1 : 0), 0);
    // 总数
    const totalCount = todos.length;
    return (
      <div className='todo-footer'>
        <label>
          <input type="checkbox" onChange={this.handleCheckAll} checked={doneCount === totalCount && totalCount !== 0 ? true : false} />
        </label>
        <span>
          <span>已完成{doneCount}</span>/ 全部{totalCount}
        </span>
        <button onClick={this.handleClearAllDone} className='btn btn-danger'>清除已完成的任务</button>
      </div>
    )
  }
}
