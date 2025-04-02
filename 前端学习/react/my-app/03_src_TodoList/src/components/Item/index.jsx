import React, { Component } from 'react'
import './index.css'

export default class Item extends Component {

  state = {
    mouse: false
  }

  handleMouse = (flag) => {
    return () => {
      this.setState({
        mouse: flag
      })
    }
  }

  // 勾选、取消勾选某一个ToDo的回调
  handleCheck = (id) => {
    return (event) => {
      this.props.updateTodo(id, event.target.checked)
    }
  }

  // 删除一个todo的回调
  handleDelete = (id) => {
    if (window.confirm('确定删除吗?')) {
      this.props.deleteTodo(id)
    }
  }

  render() {
    const { id, name, done } = this.props
    const { mouse } = this.state
    return (
      <div>
        <li onMouseLeave={this.handleMouse(false)} onMouseEnter={this.handleMouse(true)} style={{ backgroundColor: mouse ? '#ddd' : 'white' }}>
          <label>
            <input type="checkbox" checked={done} onChange={this.handleCheck(id)} />
            <span>{name}</span>
          </label>
          <button className='btn btn-danger' style={{ display: mouse ? 'block' : 'none' }} onClick={() => this.handleDelete(id)}>删除</button>
        </li>
      </div>
    )
  }
}
