'use strict'

/**
 * Module dependencies.
 */
const merge = require('utils-merge')
const qs = require('qs')
const parseUrl = require('parseurl')

/**
 * 解析req, 生成对应的req.query
 * 
 * @param {Object} options 
 * @returns {Function}
 * @api public
 */
module.exports = function query(options) {
  let opts = merge({}, options)
  let queryparse = qs.parse

  if (typeof options === 'function') {
    queryparse = options
    opts = undefined
  }

  if (opts !== undefined && opts.allowPrototypes === undefined) {
    // back-compat for qs module
    opts.allowPrototypes = true
  }

  return function query(req, res, next) {
    if (!req.query) {
      const val = parseUrl(req).query
      req.query = queryparse(val, opts)
    }

    next()
  }
}
