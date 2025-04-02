const { createProxyMiddleware } = require("http-proxy-middleware");
module.exports = function (app) {
  app.use(
    "/api1", //遇见 /api前缀的请求，就会触发该代理配置
    createProxyMiddleware({
      target: "http://localhost:5001", //请求转发给谁
      changeOrigin: true, // 控制服务器收到的请求头中Host字段的值
      pathRewrite: {
        "^/api1": " ", // 重写请求路径
      },
    }),
  );

  app.use(
    "/api2",// 遇到/api2前缀的请求，会触发这个代理配置
    createProxyMiddleware({
      target: "http://localhost:5002",
      changeOrigin: true,
      pathRewrite: {
        "^/api2": " "
      }
    })
  )
};