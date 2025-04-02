import { createRouter, createWebHashHistory } from "vue-router";

// 配置路由规则
const routes = [
  {path: '/home', component: () => import('@/views/Home')},
  {path: '/category', component: () => import('@/views/Category')}
]

// 创建路由对象
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router