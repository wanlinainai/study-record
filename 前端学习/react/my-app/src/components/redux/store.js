/*
  该文件专门用于暴露一个对象，整个应用只有一个Store对象
*/

// 创建redux中的Store对象
import { createStore } from 'redux'
import countReducer from './count_reducer'

const store = createStore(countReducer)

export default store