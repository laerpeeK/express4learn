'use strict'

/**
 * Module dependencies.
 * @private
 */

const debug = require('debug')('express:router:route')

/**
 * Module exports.
 * @public
 */

module.exports = Route

function Route(path) {
  this.path = path
  this.stack = []

  debug('new %o', path)

  // route handlers for various http methods
  this.methods = {}
}

Route.prototype.dispatch = function dispatch(req, res, done) {
  let idx = 0
  const stack = this.stack
  let sync = 0

  if (stack.length === 0) {
    return done()
  }

  let method = req.method.toLowerCase()
  if (method === 'head' && !this.methods['head']) {
    method = 'get'
  }

  req.route = this
  next()

  function next(err) {
    // signal to exit route
    if (err && err === 'route') {
      return done()
    }

    // signal to exit router
    if (err && err === 'router') {
      return done(err)
    }

    // max sync stack
    if (++sync > 100) {
      return setImmediate(next, err)
    }

    // end of layer
    const layer = stack[idx++]
    if (!layer) {
      return done(err)
    }

    if (layer.method && layer.method !== method) {
      next(err)
    } else if (err) {
      layer.handle_error(err, req, res, next)
    } else {
      layer.handle_request(req, res, next)
    }

    sync = 0
  }
}
