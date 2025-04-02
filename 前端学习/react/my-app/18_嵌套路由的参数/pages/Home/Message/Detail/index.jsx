import React, { Component } from 'react'
// import { qs } from "url-parse"
// qs可以将字符串转成urlencoded编码
// 1. 将String转成对象格式：qs.stringfy(obj)
// 2. 将对象转成String格式：qs.parse(obj)

const DetailData = [
  { id: '01', content: '你好，nigger' },
  { id: '02', content: '你好，bitch' },
  { id: '03', content: '你好，fuck' }
]

export default class Detail extends Component {
  render() {
    console.log(this.props);

    // const { id, title } = this.props.match.params

    // 接收Search参数
    // const { search } = this.props.location
    // const { id, title } = qs.parse(search.slice(1))

    // 接收state参数 -- 地址栏是没有内容的
    const { id, title } = this.props.location.state || {};

    const findResult = DetailData.find((detailObj) => {
      return detailObj.id === id
    }) || {}
    return (
      <ul>
        <li>ID:{id}</li>
        <li>TITLE:{title}</li>
        <li>CONTENT:{findResult.content}</li>
      </ul>
    )
  }
}
// 使用的BrowserRouter路由，刷新的时候还是会存在数据，为什么呢？原因是操作的是history，这个history中存在location属性，location属性中就有state，