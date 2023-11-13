'use strict'

/**
 * Module dependencies.
 */
const merge = require('utils-merge')
const qs = require('qs')
const parseUrl = require('parseurl')


/**
 * 解析req, 生成对应的req.query
 * parseUrl：从请求中提取 URL，包括路径、查询参数等。
 * qs.parse：它可以将 URL 查询字符串解析为对象形式，方便获取和操作其中的键值对。
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
