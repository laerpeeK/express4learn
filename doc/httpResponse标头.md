- Content-Type：用于指示资源的 MIME 类型。
  1. 在响应中，Content-Type 标头告诉客户端实际返回的内容的内容类型。
  2. 浏览器会在某些情况下进行 MIME 查找，并不一定遵循此标题的值; 为了防止这种行为，可以将header `X-Content-Type-Options` 设置为 nosniff。

- Content-Length
  1. Content-Length 是一个实体消息首部，用来指明发送给接收方的消息主体的大小，即用十进制数字表示的八位元组的数目。

- Last-Modified
  1. Last-Modified 是一个响应首部，其中包含源头服务器认定的资源做出修改的日期及时间。它通常被用作一个验证器来判断接收到的或者存储的资源是否彼此一致。

- ETag
  1. ETag HTTP 响应头是资源的特定版本的标识符。这可以让缓存更高效，并节省带宽，因为如果内容没有改变，Web 服务器不需要发送完整的响应。而如果内容发生了变化，使用 ETag 有助于防止资源的同时更新相互覆盖（“空中碰撞”）。
  2. 如果给定 URL 中的资源更改，则一定要生成新的 ETag 值。比较这些 ETag 能快速确定此资源是否变化。

- Set-Cookie
  1. 响应标头 Set-Cookie 被用来由服务器端向用户代理发送 cookie，所以用户代理可在后续的请求中将其发送回服务器。服务器要发送多个 cookie，则应该在同一响应中发送多个 Set-Cookie 标头。
  2. 选项说明
    1. Expires=<date>：cookie 的最长有效时间，形式为符合 HTTP-date 规范的时间戳。
    2. Max-Age=<number>：在 cookie 失效之前需要经过的秒数。秒数为 0 或 -1 将会使 cookie 直接过期。假如 Expires 和 Max-Age 属性均存在，那么 Max-Age 的优先级更高。
    3. Domain=<domain-value> ：指定 cookie 可以送达的主机名。假如没有指定，那么默认值为当前文档访问地址中的主机部分（但是不包含子域名）。与之前的规范不同的是，域名（.example.com）之前的点号会被忽略。多个主机/域名的值是不被允许的，但如果指定了一个域，则其子域也会被包含。
    4. Path=<path-value> ：指定一个 URL 路径，这个路径必须出现在要请求的资源的路径中才可以发送 Cookie 标头。
    5. Secure：一个带有安全属性的 cookie 只有在请求使用 https: 协议（localhost 不受此限制）的时候才会被发送到服务器。以阻止中间人攻击。
    6. HttpOnly：用于阻止 JavaScript 通过 Document.cookie 属性访问 cookie。注意，设置了 HttpOnly 的 cookie 在 JavaScript 初始化的请求中仍然会被发送。例如，调用 XMLHttpRequest.send() 或 fetch()。其用于防范跨站脚本攻击（XSS）。
    7. SameSite=<samesite-value strict|Lax|None> ：允许服务器设定一则 cookie 不随着跨站请求一起发送，这样可以在一定程度上防范跨站请求伪造攻击（CSRF）。

- Content-Disposition
  1. 在常规的 HTTP 应答中，Content-Disposition 响应标头指示回复的内容该以何种形式展示，是以内联的形式（即网页或者页面的一部分），还是以附件的形式下载并保存到本地。

- Link
  1. HTTP 实体报头 Link 提供了序列化 HTTP 头部链接的方法。它在语义上与 HTML 元素 <link> 相等。

- Vary
  1. Vary HTTP 响应标头描述了除方法和 URL 之外影响响应内容的请求消息。大多数情况下，这用于在使用内容协商时创建缓存键。

- Location
  1. Location 首部指定的是需要将页面重新定向至的地址。一般在响应码为 3xx 的响应中才会有意义。

- Allow
  1. Allow首部字段用于枚举资源所支持的 HTTP 方法的集合。

- Accept-Ranges
  1. 支持断点续传：当服务器发送Accept-Ranges头信息，客户端可以通过发送Range请求头指定要下载的资源的范围。这使得客户端可以在下载过程中暂停和恢复下载，而不必重新下载整个资源。
  2. 加速下载：客户端可以通过同时建立多个连接并请求资源的不同部分来加快下载速度。服务器可以使用Accept-Ranges来支持并发下载，从而提高下载速度。
  3. 节省带宽：通过允许客户端请求资源的部分内容，而不是整个资源，服务器可以节省带宽。这对于大型文件或高流量网站特别有用。