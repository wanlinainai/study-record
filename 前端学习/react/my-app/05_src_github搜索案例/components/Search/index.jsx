import React, { Component } from 'react'
import axios from 'axios'

export default class Search extends Component {
  search = () => {
    // 获取用户输入
    const { keyWordElement: { value } } = this
    // 发送请求前通知App更新状态
    this.props.updateAppState({ isFirst: false, isLoading: true })
    // 发送网络请求
    axios.get(`https://api.github.com/search/users?q=${value}`)
      .then(
        res => {
          this.props.updateAppState({ isLoading: false, users: res.data.items })
        },
        error => {
          this.props.updateAppState({ isLoading: false, err: error.message })
        })
  }
  render() {
    return (
      <div>
        <section className="jumbotron">
          <h3 className="jumbotron-heading">Search Github Users</h3>
          <div>
            <input ref={c => this.keyWordElement = c} type="text" placeholder="enter the name you search" />&nbsp;
            <button onClick={this.search}>Search</button>
          </div>
        </section>
      </div>
    )
  }
}
