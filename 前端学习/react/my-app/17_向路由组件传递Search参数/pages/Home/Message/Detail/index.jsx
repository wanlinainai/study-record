import React, { Component } from 'react'
import { qs } from "url-parse"
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
    // const { id, title } = this.props.match.params

    // 接收Search参数
    const { search } = this.props.location
    const { id, title } = qs.parse(search.slice(1))
    const findResult = DetailData.find((detailObj) => {
      return detailObj.id === id
    })
    return (
      <ul>
        <li>ID:{id}</li>
        <li>TITLE:{title}</li>
        <li>CONTENT:{findResult.content}</li>
      </ul>
    )
  }
}
