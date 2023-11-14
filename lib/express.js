'use strict'

/**
 * Module dependencies.
 */
const EventEmitter = require('events').EventEmitter
const mixin = require('merge-descriptors')
const proto = require('./application')
const req = require('./request')
const res = require('./response')
const Router = require('./router')

/**
 * Expose `crateApplication()`.
 */
exports = module.exports = createApplication

/**
 * Create an express application.
 *
 * @returns {Function}
 * @api public
 */

function createApplication() {
  const app = function (req, res, next) {
    // 触发事件request后, req, res 通过app.handle进行处理
    app.handle(req, res, next)
  }

  mixin(app, EventEmitter.prototype, false) // app增加自有属性为EventEmitter类的原型方法，且不取代app原有方法
  mixin(app, proto, false)  // app增加自有属性为proto上的方法，且不取代app原有方法

  // expose the prototype that will get set on requests
  app.request = Object.create(req, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  // expose the prototype that will get set on responses
  app.response = Object.create(res, {
    app: { configurable: true, enumerable: true, writable: true, value: app }
  })

  // 1) app.request的原型为req, app.response的原型为res
  // 2) app的自有属性包括EventEmitter.prototype上的、proto导出的

  app.init()  // app.init === proto.init
  return app
}

/**
 * Expose constructors.
 */
exports.Router = Router