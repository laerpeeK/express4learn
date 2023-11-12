'use strict'

/**
 *
 * Module dependencies
 * @private
 */
const debug = require('debug')('express:router:layer')
const pathRegexp = require('path-to-regexp')

/**
 * Module exports.
 * @public
 */

module.exports = Layer

function Layer(path, options, fn) {
  if (!(this instanceof Layer)) {
    return new Layer(path, options, fn)
  }

  debug('new %o', path)
  const opts = options || {}

  this.handle = fn
  this.name = fn.name || '<anonymous>'
  this.params = undefined
  this.path = undefined
  this.regexp = pathRegexp(path, (this.keys = []), opts)

  // set fast path flags
  this.regexp.fast_star = path === '*'
  this.regexp.fast_slash = path === '/' && opts.end === false
}

/**
 * Check if this route matches `path`, if so
 * populate `.params`
 * @param {String} path
 * @returns {Boolean}
 * @api private
 */

Layer.prototype.match = function match(path) {
  let match

  if (path !== null) {
    // fast path non-ending match for / (any path matches)
    if (this.regexp.fast_slash) {
      this.params = {}
      this.path = ''
      return true
    }

    // fast path for * (everything matched in a param)
    if (this.regexp.fast_star) {
      this.params = { 0: decode_param(path) }
      this.path = path
      return true
    }

    // match the path
    match = this.regexp.exec(path)
  }

  if (!match) {
    this.params = undefined
    this.path = undefined
    return false
  }

  // store values
  this.params = {}
  this.path = match[0]

  const keys = this.keys
  const params = this.params

  for (let i = 0; i < match.length; i++) {
    const key = keys[i - 1]
    const prop = key.name
    const val = decode_param(match[i])

    if (val !== undefined || !hasOwnProperty.call(params, prop)) {
      params[prop] = val
    }
  }

  return true
}

/**
 * Handle the error for the layer.
 *
 * @param {Error} error
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {Function} next
 * @api private
 */

Layer.prototype.handle_error = function handle_error(error, req, res, next) {
  const fn = this.handle

  if (fn.length !== 4) {
    // not a standard error handler
    return next(error)
  }

  try {
    fn(error, req, res, next)
  } catch (err) {
    next(err)
  }
}

/**
 *
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {Function} next
 * @api private
 */

Layer.prototype.handle_request = function handle(req, res, next) {
  const fn = this.handle

  if (fn.length > 3) {
    // not a standard request handler
    return next()
  }

  try {
    fn(req, res, next)
  } catch (err) {
    next(err)
  }
}

/**
 * Decode param value.
 *
 * @param {String} val
 * @returns {String}
 * @private
 */

function decode_param(val) {
  if (typeof val !== 'string' || val.length === 0) {
    return val
  }

  try {
    return decodeURIComponent(val)
  } catch (err) {
    if (err instanceof URIError) {
      err.message = "Failed to decode param '" + val + "'"
      err.status = err.statusCode = 400
    }

    throw err
  }
}
