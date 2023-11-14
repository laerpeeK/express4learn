[MDN- http标头详情](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers)
[HTTP事务剖析](https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/)
- Referrer(Referer)：请求当前资源的客户端来源。

  1. https://blog.csdn.net/u012206617/article/details/123477445
  2. 作用：a.图片防盗链 b.防止恶意请求

- x-powered-by：非标准头，用于表示它是什么类型的服务器。

  1. 比如 express 就会通过 expressinit 中间件设置为 x-powered-by: express

- etag：http 响应头资源特定版本的标识符。

  1. https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/ETag
  2. https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Conditional_requests#weak_validation(弱/强验证器定义)

- Content-Length: 报文实体长度，可以用于判断响应实体是否结束。

- Transfer-Encoding: 传输编码的类型。

  1. chunked 分块编码的好处：https://codeleading.com/article/69121195174/
  2. 支持的不同指令：https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Transfer-Encoding

- Content-Encoding: 实体消息编码的类型。
  1. https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Content-Encoding

- X-Forwarded-Proto
