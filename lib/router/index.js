'use strict'

/**
 * Module dependencies.
 * @private
 */

const setPrototypeOf = require('setprototypeof')
const flatten = require('array-flatten')
const Route = require('./route')
const Layer = require('./layer')
const parseurl = require('parseurl')
const debug = require('debug')('express:router')

/**
 * Module variables
 * @private
 */

const objectRegExp = /^\[object (\S+)\]$/
const slice = Array.prototype.slice
const toString = Object.prototype.toString

/**
 * Initialize a new `Router` with the given `options`.
 *
 * @param {Object} [options]
 * @return {Router} which is an callable function
 * @public
 */

const proto = (module.exports = function (options) {
  const opts = options || {}

  function router(req, res, next) {
    router.handle(req, res, next)
  }

  // mixin Router class functions
  setPrototypeOf(router, proto)

  router.params = {}
  router._params = {}
  router.caseSensitive = opts.caseSensitive
  router.mergeParams = opts.mergeParams
  router.strict = opts.strict
  router.stack = []

  return router
})

/**
 * Dispatch a req, res into the router.
 * @private
 */

proto.handle = function handle(req, res, out) {
  const self = this // router
  debug('dispatching %s %s', req.method, req.url)

  let idx = 0
  const protohost = getProtohost(req.url) || ''
  let removed = ''
  let slashAdded = false
  let sync = 0
  const paramcalled = {}

  // store options for OPTIONS request
  // only used if OPTIONS request
  const options = []

  // middleware and routes
  const stack = self.stack

  // manage inter-router variables
  const parentParams = req.params
  const parentUrl = req.baseUrl || ''
  let done = restore(out, req, 'baseUrl', 'next', 'params')

  // setup next layer
  req.next = next

  // for options requests, respond with a default if nothing else responds
  if (req.method === 'OPTIONS') {
    done = wrap(done, function (old, err) {
      if (err || options.length === 0) return old(err)
      sendOptionsResponse(res, options, old)
    })
  }

  // setup basic req values
  req.baseUrl = parentUrl
  req.originalUrl = req.originalUrl || req.url

  next()

  function next(err) {
    let layerError = err === 'route' ? null : err

    // remove added slash
    if (slashAdded) {
      req.url = req.url.slice(1)
      slashAdded = false
    }

    // restore altered req.url
    if (removed.length !== 0) {
      req.baseUrl = parentUrl
      req.url = protohost + removed + req.url.slice(protohost.length)
      removed = ''
    }

    // signal to exit router
    if (layerError === 'router') {
      setImmediate(done, null)
      return
    }

    // no more matching layers
    if (idx >= stack.length) {
      setImmediate(done, layerError)
      return
    }

    // max sync stack
    if (++sync > 100) {
      return setImmediate(next, err)
    }

    // get pathname of request
    const path = getPathname(req)

    if (path === null) {
      return done(layerError)
    }

    // find next matching layer
    let layer
    let match
    let route

    while (match !== true && idx < stack.length) {
      layer = stack[idx++]
      match = matchLayer(layer, path)
      route = layer.route

      if (typeof match !== 'boolean') {
        // hold on to layerError
        layerError = layerError || match
      }

      if (match !== true) {
        continue
      }

      if (!route) {
        // process non-route handlers normally
        continue
      }

      if (layerError) {
        // routes do not match which a pending error
        match = false
        continue
      }

      let method = req.method
      let has_method = route._handles_method(method)

      // build up automatic options response
      if (!has_method && method === 'OPTIONS') {
        appendMethods(options, route._options())
      }

      // don't even bother matching route
      if (!has_method && method !== 'HEAD') {
        match = false
      }
    }

    // no match
    if (match !== true) {
      return done(layerError)
    }

    // store route for dispatch on change
    if (route) {
      req.route = route
    }

    // Capture one-time layer values
    req.params = self.mergeParams
      ? mergeParams(layer.params, parentParams)
      : layer.params
    const layerPath = layer.path

    // this should be done for the layer
    self.process_params(layer, paramcalled, req, res, function (err) {
      if (err) {
        next(layerError || err)
      } else if (route) {
        layer._handle_request(req, res, next)
      } else {
        trim_prefix(layer, layerError, layerPath, path)
      }

      sync = 0
    })
  }

  function trim_prefix(layer, layerError, layerPath, path) {
    if (layerPath.length !== 0) {
      // validate path is a prefix match
      if (layerPath !== path.slice(0, layerPath.length)) {
        next(layerError)
        return
      }

      // Validate path breaks on a path separator
      const c = path[layerPath.length]
      if (c && c !== '/' && c !== '.') return next(layerError)

      // Trim off the part of the url that matches the route
      // middleware (.use stuff) needs to have the path stripped
      debug('trim prefix (%s) from url %s', layerPath, req.url)
      removed = layerPath
      req.url = protohost + req.url.slice(protohost.length + removed.length)

      // Ensure leading slash
      if (!protohost && req.url[0] !== '/') {
        req.url = '/' + req.url
        slashAdded = true
      }

      // Setup base URL (no trailing slash)
      req.baseUrl =
        parentUrl +
        (removed[removed.length - 1] === '/'
          ? removed.substring(0, removed.length - 1)
          : removed)
    }

    debug('%s %s : %s', layer.name, layerPath, req.originalUrl)

    if (layerError) {
      layer.handle_error(layerError, req, res, next)
    } else {
      layer.handle_request(req, res, next)
    }
  }
}

/**
 * Process any parameters for the layer.
 * @private
 */

proto.process_params = function process_params(layer, called, req, res, done) {
  const params = this.params

  // captured paramters from the layer, keys and values
  const keys = layer.keys

  // fast track
  if (!keys || keys.length === 0) {
    return done()
  }

  let i = 0
  let name
  let paramIndex = 0
  let key
  let paramVal
  let paramCallbacks
  let paramcalled

  // process params in order
  // param callbacks can be sync
  function param(err) {
    paramCallback()
  }

  // single param callbacks
  function paramCallback(err) {}

  param()
}

/**
 * Use the given middleware function, with optional path, defaulting to "/".
 *
 * Use (like `.all`) will run for any http METHOD, but it will not add
 * handlers for those methods so OPTIONS requests will not consider `.use`
 * functions even if they could respond.
 *
 * The other difference is that _route_ path is stripped and not visible
 * to the handler function. The main effect of this feature is that mounted
 * handlers can operate without any code changes regardless of the "prefix"
 * pathname.
 *
 * @public
 */

proto.use = function use(fn) {
  let offset = 0
  let path = '/'

  // default path to '/'
  // disambiguate router.use([fn])
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

  const callbacks = flatten(slice.call(arguments, offset))

  if (callbacks.length === 0) {
    throw new TypeError(`Router.use() requires a middleware function`)
  }

  for (let i = 0; i < callbacks.length; i++) {
    const fn = callbacks[i]

    if (typeof fn !== 'function') {
      throw new TypeError(
        `Router.use() requires a middleware function but got a ` + gettype(fn)
      )
    }

    // add the middleware
    debug('use %o %s', path, fn.name || '<anonymous>')

    const layer = new Layer(
      path,
      {
        sensitive: this.caseSensitive,
        strict: false,
        end: false,
      },
      fn
    )

    layer.route = undefined

    this.stack.push(layer)
  }

  return this
}

proto.route = function route(path) {
  const route = new Route(path)

  const layer = new Layer(
    path,
    {
      sensitive: this.sensitive,
      strict: this.strict,
      end: true,
    },
    route.dispatch.bind(route)
  )

  layer.route = route

  this.stack.push(layer)
  return route
}

/**
 * merge params with parent params
 */
function mergeParams(params, parent) {
  debugger
}

// append methods to a list of methods
function appendMethods(list, addition) {
  for (let i = 0; i < addition.length; i++) {
    const method = addition[i]
    if (list.indexOf(method) === -1) {
      list.push(method)
    }
  }
}

/**
 * Match path to a layer
 *
 * @param {Layer} layer
 * @param {string} path
 * @private
 */
function matchLayer(layer, path) {
  try {
    return layer.match(path)
  } catch (err) {
    return err
  }
}

// get type for error message
function gettype(obj) {
  const type = typeof obj

  if (type !== 'object') {
    return type
  }

  // inspect [[Class]] for objects
  return toString.call(obj).replace(objectRegExp, '$1')
}

/**
 * Get get protocol + host for a URL
 * @param {String} url
 * @private
 */
function getProtohost(url) {
  if (typeof url !== 'string' || url.length === 0 || url[0] === '/') {
    return undefined
  }

  const searchIndex = url.indexOf('?')
  const pathLength = searchIndex !== -1 ? searchIndex : url.length
  const fqdnIndex = url.slice(0, pathLength).indexOf('://')

  return fqdnIndex !== -1
    ? url.substring(0, url.indexOf('/'), 3 + fqdnIndex)
    : undefined
}

/**
 * restore obj props after function
 * @param {Funtion} fn
 * @param {Object} obj
 * @return {Function}
 * @private
 */
function restore(fn, obj) {
  const props = new Array(arguments.length - 2)
  const vals = new Array(arguments.length - 2)

  // baseUrl next params
  for (let i = 0; i < props.length; i++) {
    props[i] = arguments[i + 2]
    vals[i] = obj[props[i]]
  }

  return function () {
    // restore vals
    for (let i = 0; i < props.length; i++) {
      obj[props[i]] = vals[i]
    }

    return fn.apply(this, arguments)
  }
}

/**
 * get pathname of request
 * @param {http.IncomingMessage} req
 * @returns
 */
function getPathname(req) {
  try {
    return parseurl(req).pathname
  } catch (err) {
    return undefined
  }
}

/**
 * wrap a function
 */
function wrap(old, fn) {
  return function proxy() {
    const args = new Array(arguments.length + 1)
    args[0] = old
    for (let i = 0, len = arguments.length; i < len; i++) {
      args[i + 1] = arguments[0]
    }

    fn.apply(this, args)
  }
}

/**
 * send an OPTIONS response
 * @param {http.ServerResponse} res
 * @param {Array} options
 * @param {Function} next
 */

function sendOptionsResponse(res, options, next) {
  try {
    const body = options.join(',')
    res.set('Allow', body)
    res.send(body)
  } catch (err) {
    next(err)
  }
}