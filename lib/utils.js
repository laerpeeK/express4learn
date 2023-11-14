'use strict'

const proxyaddr = require('proxy-addr')
const querystring = require('querystring')
const qs = require('qs')
const Buffer = require('safe-buffer').Buffer
const etag = require('etag')
const contentType = require('content-type')
const mime = require('send').mime
const flatten = require('array-flatten')
const deprecate = require('depd')('express')

/**
 * Return strong ETag for `body`
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */

exports.etag = createETagGenerator({ weak: false })

/**
 * Return weak ETag for `body`
 *
 * @param {String|Buffer} body
 * @param {String} [encoding]
 * @return {String}
 * @api private
 */

exports.wetag = createETagGenerator({ weak: true })

/**
 * Compile "etag" value to function
 *
 * @param {Boolean|String|Function} val
 * @returns {Function}
 * @api private
 */

exports.compileETag = function (val) {
  let fn

  if (typeof val === 'function') {
    return val
  }

  switch (val) {
    case true:
    case 'weak':
      fn = exports.wetag
      break
    case false:
      break
    case 'strong':
      fn = exports.etag
      break
    default:
      throw new TypeError('unknown value for etag function: ' + val)
  }

  return fn
}

exports.compileQueryParser = function compileQueryParser(val) {
  let fn

  if (typeof val === 'function') {
    return val
  }

  switch (val) {
    case true:
    case 'simple':
      fn = querystring.parse
      break
    case false:
      fn = newObject
      break
    case 'extended':
      fn = parseExtendedQueryString
      break
    default:
      throw new TypeError('unknown value for query parser function: ' + val)
  }

  return fn
}

/**
 * Normalize the given `type`, for example "html" becomes "text/html".
 *
 * @param {String} type
 * @returns {Object}
 * @api private
 */
exports.normalizeType = function (type) {
  return ~type.indexOf('/')
    ? acceptParams(type)
    : { value: mime.lookup(type), params: {} }
}

/**
 * Normalize `types`, for example "html" becomes "text/html".
 * @param {Array} types
 * @return {Array}
 * @api private
 */

exports.normalizeTypes = function (types) {
  const ret = []
  for (let i = 0; i < types.length; ++i) {
    ret.push(exports.normalizeType(types[i]))
  }
  return ret
}

/**
 * Compile "proxy trust" value to function.
 * @param {Boolean|String|Number|Array|Function} val
 * @returns {Function}
 * @api private
 */

exports.compileTrust = function (val) {
  if (typeof val === 'function') return val

  if (val === true) {
    // Support plain true/false
    return function () {
      return true
    }
  }

  if (typeof val === 'number') {
    // Support trusting hop count
    return function (a, i) {
      return i < val
    }
  }

  if (typeof val === 'string') {
    // Support comma-separated values
    val = val.split(',').map(function (v) {
      return v.trim()
    })
  }

  return proxyaddr.compile(val || [])
}

/**
 * Create an ETag generator function, generating ETags with
 * the given options.
 *
 * @param {Object} options
 * @returns {Function}
 * @private
 */

function createETagGenerator(options) {
  return function generateETag(body, encoding) {
    const buf = !Buffer.isBuffer(body) ? Buffer.from(body, encoding) : body

    return etag(buf, options)
  }
}

/**
 * Parse an extended query string with qs.
 * 允许使用对象原型链上的属性
 *
 * @param {String} str
 * @returns {Object}
 * @private
 */
function parseExtendedQueryString(str) {
  return qs.parse(str, {
    allowPrototypes: true,
  })
}

/**
 * Return new empty object.
 *
 * @returns {Object}
 * @api private
 */
function newObject() {
  return {}
}

/**
 * Set the charset in a given Content-Type string.
 *
 * @param {String} type
 * @param {String} charset
 * @return {String}
 * @api private
 */
exports.setCharset = function setCharset(type, charset) {
  if (!type || !charset) {
    return type
  }

  // parse type
  const parsed = contentType.parse(type)

  // set charset
  parsed.parameters.charset = charset

  // format type
  return contentType.format(parsed)
}

/**
 * Parse accept params `str` returning an
 * object with `.value`, `.quality` and `.params`.
 * also includes `.originalIndex` for stable sorting
 *
 * @param {String} str
 * @param {Number} index
 * @return {Object}
 * @api private
 */
function acceptParams(str, index) {
  const parts = str.split(/ *; */)
  const ret = { value: parts[0], quality: 1, params: {}, originalIndex: index }

  for (let i = 1; i < parts.length; ++i) {
    let pms = parts[i].split(/ *= */)
    if ('q' === pms[0]) {
      ret.quality = parseFloat(pms[1])
    } else {
      ret.params[pms[0]] = pms[1]
    }
  }

  return ret
}

/**
 * Check if `path` looks absolute.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 */

exports.isAbsolute = function (path) {
  if ('/' === path[0]) return true
  if (':' === path[1] && ('\\' === path[2] || '/' === path[2])) return true // Windows device path
  if ('\\\\' === path.substring(0, 2)) return true // Microsoft Azure absolute path
}

/**
 * Flatten the given `arr`.
 *
 * @param {Array} arr
 * @return {Array}
 * @api private
 */

exports.flatten = deprecate.function(
  flatten,
  'utils.flatten: use array-flatten npm module instead'
)
