import React, { Component } from 'react'
import './index.css'

export default class List extends Component {
  render() {
    const { users, isFirst, isLoading, err } = this.props
    return (
      <div className="row">
        {
          isFirst ? <h2>欢迎使用，输入关键字，随后点击搜索</h2> :
            isLoading ? <h2>Loading....</h2> :
              err ? <h2 style={{ color: 'red' }}>{err}</h2> :
                users.map((userObj) => {
                  return (
                    <div className="card" key={userObj.id}>
                      <a href={userObj.html_url} rel="noreferrer" target="_blank">
                        <img alt="avatar" src={userObj.avatar_url} style={{ width: '100px' }} />
                      </a>
                      <p className="card-text">{userObj.login}</p>
                    </div>
                  )
                })
        }
      </div>
    )
  }
}
