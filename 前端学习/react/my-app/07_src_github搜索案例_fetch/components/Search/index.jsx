import React, { Component } from 'react'
import PubSub from 'pubsub-js'
// import axios from 'axios'

export default class Search extends Component {
  search = async () => {
    // 获取用户输入
    const { keyWordElement: { value } } = this
    // 发送请求前通知List更新状态
    // this.props.updateAppState({ isFirst: false, isLoading: true })
    PubSub.publish('atguigu', { isFirst: false, isLoading: true })
    // #region
    // 发送网络请求
    // axios.get(`https://api.github.com/search/users?q=${value}`)
    //   .then(
    //     res => {
    //       // this.props.updateAppState({ isLoading: false, users: res.data.items })
    //       PubSub.publish('atguigu', { isLoading: false, users: res.data.items })
    //     },
    //     error => {
    //       // this.props.updateAppState({ isLoading: false, err: error.message })
    //       PubSub.publish('atguigu', { isLoading: false, err: error.message })
    //     })
    // #endregion
    // 未优化Fetch：error没有通过catch统一处理错误。
    // fetch(`https://api.github.com/search/users?q=${value}`).then(
    //   response => {
    //     console.log('成功:', response)
    //     return response.json();
    //   },
    //   // error => {
    //   //   console.log('失败:', error);
    //   //   // 中断Promise链
    //   //   return new Promise(() => {

    //   //   })
    //   // }
    // ).then(
    //   resposne => { console.log('获取数据成功:', resposne) },
    //   // error => { console.log('获取数据失败:', error) }
    // ).catch(
    //   (error) => {
    //     console.log('error:', error);
    //   }
    // )

    // await
    try {
      const response = await fetch(`https://api.github.com/search/users?q=${value}`)
      const data = await response.json();
      console.log('data:', data);
    } catch (error) {
      console.log('error:', error);
    }

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
