'use strict'

/**
 * Module dependencies.
 * @private
 */

const setPrototypeOf = require('setprototypeof')

/**
 * Initialization middleware, exposing the
 * request and response to each other, as well
 * as defaulting the X-Powered-By header field.
 *
 * @param {Function} app
 * @return {Function}
 * @api private
 */

exports.init = function (app) {
  return function expressInit(req, res, next) {
    if (app.enabled('x-powered-by')) res.setHeader('X-Powered-By', 'Express')
    req.res = res // 这里的req跟app.req有很多差别。
    res.req = req // res也一样
    req.next = next

    setPrototypeOf(req, app.request)
    setPrototypeOf(res, app.response)

    res.locals = res.locals || Object.create(null)

    next()
  }
}
