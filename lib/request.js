'use strict'

/**
 * Module dependencies
 * @private
 */
const http = require('http')
const accepts = require('accepts')
const proxyAddr = require('proxy-addr')
const isIp = require('node:net').isIP
const parse = require('parseurl')
const fresh = require('fresh')
const parseRange = require('range-parser')
const deprecate = require('depd')('express')
const typeis = require('type-is')

/**
 * Request prototype.
 * @public
 */

const req = Object.create(http.IncomingMessage.prototype) // Object.getPrototypeOf(app) === http.IncomingMessage.prototype

/**
 * Module exports.
 * @public
 */

module.exports = req

/**
 * Return request header.
 * 返回请求头信息
 *
 * The `Referrer` header field is special-cased,
 * both `Referrer` and `Referer` are interchangeable.
 *
 * Examples:
 *
 *     req.get('Content-Type');
 *     // => "text/plain"
 *
 *     req.get('content-type');
 *     // => "text/plain"
 *
 *     req.get('Something');
 *     // => undefined
 *
 * Aliased as `req.header()`.
 *
 * @param {String} name
 * @return {String}
 * @public
 */

req.get = req.header = function header(name) {
  if (!name) {
    throw new TypeError('name argument is required to req.get')
  }

  if (typeof name !== 'string') {
    throw new TypeError('name must be a string to req.get')
  }

  const lc = name.toLowerCase()

  switch (lc) {
    case 'referer':
    case 'referrer':
      return this.headers.referrer || this.headers.referer
    default:
      return this.headers[lc]
  }
}

/**
 * To do: update docs.
 *
 * Check if the given `type(s)` is acceptable, returning
 * the best match when true, otherwise `undefined`, in which
 * case you should respond with 406 "Not Acceptable".
 *
 * The `type` value may be a single MIME type string
 * such as "application/json", an extension name
 * such as "json", a comma-delimited list such as "json, html, text/plain",
 * an argument list such as `"json", "html", "text/plain"`,
 * or an array `["json", "html", "text/plain"]`. When a list
 * or array is given, the _best_ match, if any is returned.
 *
 * Examples:
 *
 *     // Accept: text/html
 *     req.accepts('html');
 *     // => "html"
 *
 *     // Accept: text/*, application/json
 *     req.accepts('html');
 *     // => "html"
 *     req.accepts('text/html');
 *     // => "text/html"
 *     req.accepts('json, text');
 *     // => "json"
 *     req.accepts('application/json');
 *     // => "application/json"
 *
 *     // Accept: text/*, application/json
 *     req.accepts('image/png');
 *     req.accepts('png');
 *     // => undefined
 *
 *     // Accept: text/*;q=.5, application/json
 *     req.accepts(['html', 'json']);
 *     req.accepts('html', 'json');
 *     req.accepts('html, json');
 *     // => "json"
 *
 * @param {String|Array} type(s)
 * @returns {String|Array|Boolean}
 * @public
 */
req.accepts = function () {
  const accept = accepts(this)
  return accept.types.apply(accept, arguments)
}

/**
 * Check if the given `encoding`s are accepted.
 *
 * @param {Strin} ...encoding
 * @returns {String|Array}
 * @public
 */

req.acceptsEncodings = function () {
  const accept = accepts(this)
  return accept.encodings.apply(accept, arguments)
}

/**
 * Check if the given `charset`s are acceptable,
 * otherwise you should respond with 406 "Not Acceptable".
 * @param {String} ...charset
 * @returns {String|Array}
 * @public
 */

req.acceptsCharsets = function () {
  const accept = accepts(this)
  return accept.charsets.apply(accept, arguments)
}

/**
 * Check if the given `lang`s are acceptable.
 * otherwise you should respond with 406 "Not Acceptable"
 *
 * @param {String} ...lang
 * @return {String|Array}
 * @public
 */

req.acceptsLanguage = function () {
  const accept = accepts(this)
  return accept.languages.apply(accept, arguments)
}

/**
 * Parse Range header field, capping to the given `size`.
 *
 * Unspecified ranges such as "0-" require knowledge of your resource length. In
 * the case of a byte range this is of course the total number of bytes. If the
 * Range header field is not given `undefined` is returned, `-1` when unsatisfiable,
 * and `-2` when syntactically invalid.
 *
 * When ranges are returned, the array has a "type" property which is the type of
 * range that is required (most commonly, "bytes"). Each array element is an object
 * with a "start" and "end" property for the portion of the range.
 *
 * The "combine" option can be set to `true` and overlapping & adjacent ranges
 * will be combined into a single range.
 *
 * NOTE: remember that ranges are inclusive, so for example "Range: users=0-3"
 * should respond with 4 users when available, not 3.
 *
 * @param {number} size
 * @param {object} [options]
 * @param {boolean} [options.combine=false]
 * @returns {number|array}
 */
req.range = function range(size, options) {
  const range = this.get('Range')
  if (!range) return
  return parseRange(size, range, options)
}

/**
 * Return the value of param `name` when present or `defaultValue`.
 *
 *  - Checks route placeholders, ex: _/user/:id_
 *  - Checks body params, ex: id=12, {"id":12}
 *  - Checks query string params, ex: ?id=12
 *
 * To utilize request bodies, `req.body`
 * should be an object. This can be done by using
 * the `bodyParser()` middleware.
 *
 * @param {String} name
 * @param {Mixed} [defaultValue]
 * @returns {String}
 */

req.param = function param(name, defaultValue) {
  const params = this.params || {}
  const body = this.body || {}
  const query = this.query || {}

  const args = arguments.length === 1 ? 'name' : 'name, default'

  deprecate(
    'req.param(' + args + '): Use req.params, req.bddy, or req.query instead'
  )

  // 这里做了个修改 原先是params.hasOwnProperty(name) eslint报错
  if (null != params[name] && Object.hasOwnProperty.call(params, name))
    return params[name]
  if (null != body[name]) return body[name]
  if (null != query[name]) return query[name]

  return defaultValue
}

/**
 * Check if the incoming request contains the "Content-Type"
 * header field, and it contains the given mime `type`.
 *
 * Examples:
 *
 *      // With Content-Type: text/html; charset=utf-8
 *      req.is('html');
 *      req.is('text/html');
 *      req.is('text/*');
 *      // => true
 *
 *      // When Content-Type is application/json
 *      req.is('json');
 *      req.is('application/json');
 *      req.is('application/*');
 *      // => true
 *
 *      req.is('html');
 *      // => false
 *
 * @param {String|Array} types...
 * @return {String|false|null}
 * @public
 */

req.is = function is(types) {
  let arr = types

  // support flattened arguments
  if (!Array.isArray(types)) {
    arr = new Array(arguments.length)
    for (let i = 0; i < arr.length; i++) {
      arr[i] = arguments[i]
    }
  }

  return typeis(this, arr)
}

defineGetter(req, 'protocol', function protocol() {
  const proto = this.connection.encrypted ? 'https' : 'http'
  const trust = this.app.get('trust proxy fn')

  if (!trust(this.connection.remoteAddress, 0)) {
    return proto
  }

  // Note: X-Forwarded-Proto is normally only ever a
  // single value, but this is to be safe.
  const header = this.get('X-Forwarded-Proto') || proto
  const index = header.indexOf(',')

  return index !== -1 ? header.substring(0, index).trim() : header.trim()
})

/**
 * Short-hand for:
 *
 *    req.protocol === 'https'
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'secure', function secure() {
  return this.protocol === 'https'
})

/**
 * Return the remote address from the trusted proxy.
 *
 * This is the remote address on the socket unleass
 * "trust proxy" is set.
 *
 * @return {String}
 * @public
 */

defineGetter(req, 'ip', function ip() {
  const trust = this.app.get('trust proxy fn')
  return proxyAddr(this, trust)
})

/**
 * 最远到最近的代理地址数组
 * When "trust proxy" is set, trusted proxy addresses + client.
 *
 * For example if the value were "client, proxy1, proxy2"
 * you would receive the array `["client", "proxy1", "proxy2"]`
 * where "proxy2" is the furthest down-stream and "proxy1" and
 * "proxy2" were trusted.
 *
 * @return {Array}
 * @public
 */

defineGetter(req, 'ips', function ips() {
  const trust = this.app.get('trust proxy fn')
  const addrs = proxyAddr.all(this, trust)

  // reverse the order(to farthest -> closest)
  // and remove socket address
  addrs.reverse().pop()

  return addrs
})

/**
 * Return subdomains as an array.
 *
 * Subdomains are the dot-separated parts of the host before the main domain of
 * the app. By default, the domai of the app is assumed to be the last two
 * parts of the host. This can be changed by setting "subdomain offset".
 *
 * For example, if the domain is "tobi.ferrets.example.com":
 * If "subdomain offset" is not set, req.subdomains is `["ferrets", "tobi"]`.
 * If "subdomain offset" is 3, req.subdomains is `["tobi"]`.
 *
 * @return {Array}
 * @public
 */

defineGetter(req, 'subdomains', function subdomains() {
  const hostname = this.hostname
  if (!hostname) return []

  const offset = this.app.get('subdomain offset')
  const subdomains = !isIp(hostname)
    ? hostname.split('.').reverse()
    : [hostname]

  return subdomains.slice(offset)
})

/**
 * Short-hand for `url.parse(req.url).pathname`.
 *
 * @return {String}
 * @public
 */

defineGetter(req, 'path', function path() {
  return parse(this).pathname
})

/**
 * Parse the "Host" header field to a hostname.
 *
 * When the "trust proxy" setting trusts the socket
 * address, the "X-Forwarded-Host" header field will
 * be trusted.
 *
 * @return {String}
 * @public
 */

defineGetter(req, 'hostname', function hostname() {
  const trust = this.app.get('trust proxy fn')
  let host = this.get('X-Forwarded-Host')

  if (!host || !trust(this.connection.remoteAddress, 0)) {
    host = this.get('Host')
  } else if (host.indexOf(',') !== -1) {
    // Note: X-Forwarded-Host is normally only ever a
    // single value, but this is to be safe.
    host = host.substring(0, host.indexOf(',')).trimRight()
  }

  if (!host) return

  // IPv6 literal support
  const offset = host[0] === '[' ? host.indexOf(']') + 1 : 0
  const index = host.indexOf(':', offset)
  return index !== -1 ? host.substring(0, index) : host
})

/**
 * Check if the request is fresh, aka
 * Last-Modified and/or the ETag
 * still match.
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'fresh', function () {
  const method = this.method
  const res = this.res
  const status = res.statusCode

  // GET or HEAD for weak freshness validation only
  if ('GET' !== method && 'HEAD' !== method) return false

  //2xx or 304 as per rfc2616 14.26
  if ((status >= 200 && status < 300) || 304 === status) {
    return fresh(this.headers, {
      etag: res.get('ETag'),
      'last-modified': res.get('Last-Modified'),
    })
  }

  return false
})

/**
 * Check if the request is stale, aka
 * "Last-Modified" and / or the "ETag" for the
 * resource has changed.
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'stale', function stale() {
  return !this.fresh
})

/**
 * Check if the request was an _XMLHttpRequest_.
 *
 * @return {Boolean}
 * @public
 */

defineGetter(req, 'xhr', function xhr() {
  const val = this.get('X-Requested-With') || ''
  return val.toLowerCase() === 'xmlhttprequest'
})

/**
 * Helper function for creating a getter on an object.
 *
 * @param {Object} obj
 * @param {String} name
 * @param {Function} getter
 * @private
 */

function defineGetter(obj, name, getter) {
  Object.defineProperty(obj, name, {
    configurable: true,
    enumerable: true,
    get: getter,
  })
}
