import React, { Component } from 'react'
import { Route, Switch, Redirect } from 'react-router-dom'
import Home from './pages/Home' // 路由组件
import About from './pages/About' // 路由组件
import Header from './components/Header' // Header是一般组件
import MyNavLink from './components/MyNavLink'

export default class App extends Component {
  render() {
    return (
      <div>
        <div className="row">
          <div className="col-xs-offset-2 col-xs-8">
            <Header />
          </div>
        </div>
        <div className="row">
          <div className="col-xs-2 col-xs-offset-2">
            <div className="list-group">
              {/* <a className="list-group-item active" href="./about.html">About</a>
              <a className="list-group-item" href="./home.html">Home</a> */}

              {/* 在React中靠路由链接实现切换组件 -- 编写路由链接*/}
              {/* <NavLink activeClassName="atguigu" className="list-group-item" to="/about">About</NavLink>
              <NavLink activeClassName="atguigu" className="list-group-item" to="/home">Home</NavLink> */}
              <MyNavLink to="/about" title="About" children="About" />
              <MyNavLink to="/home" title="Home" children="Home" />
            </div>
          </div>
          <div className="col-xs-6">
            <div className="panel">
              <div className="panel-body">
                {/* 注册路由 */}
                {/* 整个路由需要一个路由链接 */}
                <Switch>
                  <Route path="/about" component={About}></Route>
                  {/* <Route path="/atguigu/home" component={Home}></Route> */}
                  <Route path="/home" component={Home}></Route>
                  <Redirect to="/home"></Redirect>
                </Switch>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
