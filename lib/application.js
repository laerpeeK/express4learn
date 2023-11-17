'use strict'

/**
 * Module dependencies
 * @private
 */
const debug = require('debug')('express:application')
const methods = require('methods')
const http = require('http')
const compileEtag = require('./utils').compileETag
const compileTrust = require('./utils').compileTrust
const compileQueryParser = require('./utils').compileQueryParser
const Router = require('./router')
const query = require('./middleware/query')
const middleware = require('./middleware/init')
const finalhandler = require('finalhandler')
const flatten = require('array-flatten')
const setPrototypeOf = require('setprototypeof')
const deprecate = require('depd')('express')

/**
 * Module variables.
 * @private
 */

const slice = Array.prototype.slice

/**
 * Application prototype.
 */

const app = (exports = module.exports = {})

/**
 * Variable for trust proxy inheritance back-compat
 * @private
 */

const trustProxyDefaultSymbol = '@@symbol:trust_proxy_default'

/**
 * Initialize the server.
 *
 *  - setup default configuration
 *  - setup default middleware
 *  - setup route reflection methods
 *
 * @private
 */

app.init = function () {
  this.cache = {}
  this.engines = {}
  this.settings = {}

  this.defaultConfiguration()
}

/**
 * Initialize application configuration
 * @private
 */

app.defaultConfiguration = function defaultConfiguration() {
  const env = process.env.NODE_ENV || 'development'

  // default settings
  this.enable('x-powered-by')
  this.set('etag', 'weak')
  this.set('env', env)
  this.set('query parser', 'extended')
  this.set('subdomain offset', 2)
  this.set('trust proxy', false)

  // trust proxy inherit back-compat
  Object.defineProperty(this.settings, trustProxyDefaultSymbol, {
    configurable: true,
    value: true,
  })

  debug('botting in %s mode', env)

  /**
   * 如果当前应用程序实例信任代理并且父应用程序提供了自定义的代理信任函数，就删除当前应用程序实例的默认代理信任设置，以便使用父应用程序提供的自定义设置。
   * 这样做可能是为了确保在嵌套应用程序中，子应用程序采用了父应用程序的代理信任设置，从而实现更加一致的配置。
   */
  this.on('mount', function onmount(parent) {
    if (
      this.settings[trustProxyDefaultSymbol] === true &&
      typeof parent.settings['trust proxy fn'] === 'function'
    ) {
      delete this.settings['trust proxy']
      delete this.settings['trust proxy fn']
    }

    // inherit protos
    setPrototypeOf(this.request, parent.request)
    setPrototypeOf(this.response, parent.response)
    setPrototypeOf(this.engines, parent.engines)
    setPrototypeOf(this.settings, parent.settings)
  })

  // setup locals
  this.locals = Object.create(null) // app的局部变量，其中一个用处是在渲染时使用

  // top-most app is mounted at /
  this.mountpath = '/'

  // default locals
  this.locals.settings = this.settings

  // default configuration
  // this.set('view', view)
  // this.set('views', resolve('views'))
  this.set('jsonp callback name', 'callback')

  // if (env === 'production') {
  //   this.enable('view cache');
  // }

  Object.defineProperty(this, 'router', {
    get: function () {
      throw new Error(
        "'app.router' is deprecated!\nPlease see the 3.x to 4.x migration guide for details on how to update your app."
      )
    },
  })
}

/**
 * lazily adds the base router if it has not yet been added.
 *
 * We cannot add the base router in the defaultConfiguration because
 * it reads app settings which might be set after that has run.
 *
 * @private
 *
 */

app.lazyrouter = function lazyrouter() {
  if (!this._router) {
    this._router = new Router({
      caseSensitive: this.enabled('case sensitive routing'),
      strict: this.enabled('strict routing'),
    })

    this._router.use(query(this.get('query parser fn')))
    this._router.use(middleware.init(this))
  }
}

/**
 * Dispatch a req, res pair into the application. Starts pipeline processing.
 *
 * If no callback is provided, then default error handlers will respond
 * in the event of an error bubbling through the stack.
 *
 * @private
 */

app.handle = function handle(req, res, callback) {
  const router = this._router

  // final handler
  const done =
    callback ||
    finalhandler(req, res, {
      env: this.get('env'),
      onerror: logerror.bind(this),
    })

  // no routes
  if (!router) {
    debug('no routes defined on app')
    done() // 直接返回404
    return
  }

  router.handle(req, res, done)
}

/**
 * Proxy `Router#use()` to add middleware to the app router.
 * See Router#use() documentation for details.
 *
 * If the _fn_ parameter is an express app, then it will be
 * mounted at the _route_ specified.
 *
 * @public
 */

app.use = function use(fn) {
  let offset = 0
  let path = '/'

  // default path to '/'
  // disambiguate app.use([fn])
  if (typeof fn !== 'function') {
    let arg = fn

    while (Array.isArray(arg) && arg.length !== 0) {
      arg = arg[0]
    }

    // first arg is the path
    if (typeof arg !== 'function') {
      offset = 1
      path = fn
    }
  }

  const fns = flatten(slice.call(arguments, offset))

  if (fns.length === 0) {
    throw new TypeError(`app.use() requires a middleware function`)
  }

  // setup router
  this.lazyrouter()
  const router = this._router

  fns.forEach(function (fn) {
    // non-express app
    if (!fn || !fn.handle || !fn.set) {
      return router.use(path, fn)
    }

    debug('.use app under %s', path)
    fn.mountpath = path
    fn.parent = this

    // restore .app property on req and res
    router.use(path, function mounted_app(req, res, next) {
      const orig = req.app
      fn.handle(req, res, function (err) {
        setPrototypeOf(req, orig.request)
        setPrototypeOf(res, orig.response)
        next(err)
      })
    })

    // mounted an app
    fn.emit('mount', this)
  }, this)

  return this
}

/**
 * Proxy to the app `Router#route()`
 * Returns a new `Route` instance for the _path_.
 *
 * Routes are isolated middleware stacks for specific paths.
 * See the Route api docs for details.
 *
 * @public
 */

app.route = function route(path) {
  this.lazyrouter()
  return this._router.route(path)
}

/**
 * Proxy to `Router#param()` with one added api feature. The _name_ parameter
 * can be an array of names.
 * 
 * See the Router#param() docs for more details.
 * 
 * @param {String|Array} name 
 * @param {Function} fn 
 * @returns {app} for chaining
 * @public
 */

app.param = function param(name, fn) {
  this.lazyrouter()

  if (Array.isArray(name)) {
    for (let i = 0; i < name.length; i++) {
      this.param(name[i], fn)
    }

    return this
  }

  this._router.param(name, fn)
  return this
}

/**
 * Assign `setting` to `val`, or return `setting`'s value.
 *
 *  app.set('foo', 'bar')
 *  app.set('foo')
 *  // => "bar"
 *
 * Mounted servers inherit their parent server's settings.
 *
 * @param {String} setting
 * @param {*} [val]
 * @return {Server} for chaining
 * @public
 */

app.set = function set(setting, val) {
  if (arguments.length === 1) {
    // app.get(setting)
    let settings = this.settings

    while (settings && settings !== Object.prototype) {
      if (hasOwnProperty.call(settings, setting)) {
        return settings[setting]
      }

      settings = Object.getPrototypeOf(settings)
    }

    return undefined
  }

  debug('set "%s" to %o', setting, val)

  // set value
  this.settings[setting] = val

  // trigger matched settings
  switch (setting) {
    case 'etag':
      this.set('etag fn', compileEtag(val))
      break
    case 'query parser':
      this.set('query parser fn', compileQueryParser(val))
      break
    case 'trust proxy':
      this.set('trust proxy fn', compileTrust(val))

      // trust proxy inerit back-compat
      Object.defineProperty(this.settings, trustProxyDefaultSymbol, {
        configurable: true,
        value: false,
      })

      break
  }

  return this
}

/**
 * Return the app's absolute pathname
 * based on the parent(s) that have
 * mounted it.
 *
 * For example if the application was
 * mounted as "/admin", which itself
 * was mounted as "/blog" then the
 * return value would be "/blog/admin".
 *
 * @returns {String}
 * @private
 */

app.path = function path() {
  return this.parent ? this.parent.path() + this.mountpath : ''
}

/**
 * Check if `setting` is enabled (truthy).
 *
 *  app.enabled('foo')
 *  // => false
 *
 *  app.enable('foo')
 *  app.enabled('foo')
 *  // => true
 *
 * @param {String} setting
 * @returns {Boolean}
 * @public
 */

app.enabled = function enabled(setting) {
  return Boolean(this.set(setting))
}

/**
 * Check if `setting` is disabled.
 *
 *    app.disabled('foo')
 *    // => true
 *
 *    app.enable('foo')
 *    app.disabled('foo')
 *    // => false
 *
 * @param {String} setting
 * @return {Boolean}
 * @public
 */

app.disabled = function disabled(setting) {
  return !this.set(setting)
}

/**
 * Enable `setting`.
 *
 * @param {String} setting
 * @returns {app} for chaining
 * @public
 */

app.enable = function enable(setting) {
  return this.set(setting, true)
}

/**
 * Disable `setting`
 *
 * @param {String} setting
 * @returns {app} for chaining
 * @public
 */

app.disable = function disable(setting) {
  return this.set(setting, false)
}

/**
 * Delegate `.VERB(...)` calls to `router.VERB(...)`.
 */

methods.forEach(function (method) {
  app[method] = function (path) {
    if (method === 'get' && arguments.length === 1) {
      return this.set(path)
    }

    this.lazyrouter()

    const route = this._router.route(path)
    route[method].apply(route, slice.call(arguments, 1))
    return this
  }
})


/**
 * Special-cased "all" method, applying the given route `path`,
 * middleware, and callback to _every_ HTTP method.
 * 
 * @param {String} path
 * @param {Function} ...
 * @returns {app} for chaining
 * @public
 */

app.all = function all(path) {
  this.lazyrouter()

  const route = this._router.route(path)
  const args = slice.call(arguments, 1)

  for (let i = 0; i < methods.length; i++) {
    route[methods[i]].apply(route, args)
  }

  return this
}

// del -> delete alias 
app.del = deprecate.function(app.delete, 'app.del：Use app.delete instead')

/**
 * Listen for connections.
 *
 * A node `http.Server` is returned, with this
 * application (which is a `Function`) as its
 * callback. If you wish to create both an HTTP
 * and HTTPS server you may do so with the "http"
 * and "https" modules as shown there:
 *
 *  var http = require('http')
 *    , https = require('https')
 *    , express = require('express')
 *    , app = express()
 *
 *  http.createServer(app).listen(80)
 *  https.createServer({ ... }, app).listen(443)
 *
 * @returns {http.Server}
 * @public
 */

app.listen = function listen() {
  const server = http.createServer(this)
  return server.listen.apply(server, arguments)
}

/**
 * Log error using console.error
 *
 * @param {Error} err
 */

function logerror(err) {
  if (this.get('env') !== 'test') console.error(err.stack || err.toString())
}
