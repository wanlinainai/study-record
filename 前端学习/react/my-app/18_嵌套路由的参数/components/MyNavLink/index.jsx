import React, { Component } from 'react'
import { NavLink } from 'react-router-dom'
// 封装一个NavLink
export default class MyNavLink extends Component {
  render() {
    return (
      <NavLink activeClassName="atguigu" className="list-group-item" {...this.props} />
    )
  }
}
