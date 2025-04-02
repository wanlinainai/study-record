/**
 * 该文件是用于创建一个为Count组件服务的reducer，reducer本质上就是一个函数
 */
import { INCREMENT, DECREMENT } from "./constant"

const initState = 0
export default function countReducer(previousState = initState, action) {
  // 从action中获取type，data
  const { type, data } = action

  switch (type) {
    case INCREMENT:
      return previousState + data
    case DECREMENT:
      return previousState - data
    default:
      return previousState
  }
}

