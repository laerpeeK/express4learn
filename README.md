# learn-express4
## 说明
该仓库仅作个人学习express源码使用，对其中的代码(包括主体代码跟单元测试代码进行了改动)。如果您要使用express开发，请访问原框架链接[express](https://github.com/expressjs/express)

## 我的Express源码调试流程
如果您不知道该如何开始调试Express源码。以下是我的调试过程。希望对您有参考作用。
1. const app = express()调用的逻辑(应用初始化)
2. app.listen方法(如何结合http模块的)
3. app.use方法(最基础的中间件调用实现)
4. app.set、app.enable、app.disable、app.enabled、app.disabled等初始化时涉及到的app method。逻辑比较简单。
5. app.request(理解Express是如何通过原型链修改req、相关HTTP头部功能、express新增的允许req.xx方法)
6. app.response(理解Express是如何通过原型链修改res、相关HTTP头部功能、express新增的允许res.xx方法)
7. 跑通单元测试(mocha、supertest、node中assert模块的基本使用)、不断的debugger...
8. 上述调试(req, res, app.use, app)基础流程中，相关第三方模块源码的了解。涉及到的第三方模块都是一些小模块，不复杂。
9. router/index.js、router/layer.js。通过app.use方法调用。以及request.get('xx')触发回调。理清app -> router -> layer的一个流程。 比较复杂的是router.handle方法。但只需要关注核心逻辑 - function next。
10. 粗浅了解下path-to-regexp这个库的功能。以及调用时options的作用。这个库在vue-router中也有用到。
11. router相关，不涉及HTTP.method的单元测试
12. app.get/post/... -> router.get/post/... -> route的调用流程。
13. const router = express.Router(); app.use(pathA, router); router.get(pathB, handler)... 相关的。结合实际项目对express的使用情况。通过源码debugger理清不同调用方式的区别。以及子express应用的实现方式。
14. app.param实现。这里会再一次的理清router.handle方法。之前重点关注的是next的实现及调用。这里才是完整的router.handle方法实现调用。
15. 单元测试集除了express.XXX之外。其他都能跑通。
16. express.static。就是serve-static这个库的实现。结合express的express.static.js测试。
17. express.raw/text/url-encoded/json。 就是body-parser这个库的实现。同样结合express的单测。
