import http from '../utils/reuqest'

// 请求数据的接口
export const getData = () => {
  // 返回一个Promise对象
  return http.get("/home/getData")
}
