const bytes = require('bytes')
const typeis = require('type-is')
const debug = require('debug')('body-parser:json')
const contentType = require('content-type')
const createError = require('http-errors')
const read = require('../read')

module.exports = json

/**
 * RegExp to match the first non-space in a string.
 *
 * Allowed whitespace is defined in RFC 7159:
 *
 *    ws = *(
 *            %x20 /              ; Space
 *            %x09 /              ; Horizontal tab
 *            %x0A /              ; Line feed or New line
 *            %x0D )              ; Carriage return
 */

const FIRST_CHAR_REGEXP = /^[\x20\x09\x0a\x0d]*([^\x20\x09\x0a\x0d])/ // eslint-disable-line no-control-regex

/**
 * Create a middleware to parse JSON bodies.
 *
 * @param {object} [options]
 * @return {function}
 * @public
 */

function json(options) {
  const opts = options || {}

  const limit = // 这是一个字符串或数字，用于指定请求体的大小限制。如果请求体的大小超过限制，将会返回一个413 Payload Too Large错误。默认为'100kb'。
    typeof opts.limit !== 'number'
      ? bytes.parse(opts.limit || '100kb')
      : opts.limit
  const inflate = opts.inflate !== false // 用于指定是否应该将gzip和deflate编码的请求体解压缩为原始的JSON字符串。默认为true。
  const reviver = opts.reviver // 这是一个函数，用于在解析JSON时转换解析出的值。它类似于JSON.parse()函数的第二个参数。默认为null。
  const strict = opts.strict !== false // 用于指定是否应该只接受数组和对象作为JSON。如果设置为false，则可以接受任何JSON类型。默认为true。
  const type = opts.type || 'application/json' // 这是一个字符串或字符串数组，用于指定要解析的请求体的媒体类型。如果请求的Content-Type与此选项不匹配，将不会执行解析。默认为'application/json'。
  const verify = opts.verify || false // 这是一个函数，用于在解析JSON之前对请求体进行自定义验证。如果验证失败，将会返回一个400 Bad Request错误。默认为undefined。

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  // create the appropriate type checking function
  const shouldParse = typeof type !== 'function' ? typeChecker(type) : type

  function parse(body) {
    if (body.length === 0) {
      // special-case empty json body, as it's a common client-side mistake
      // TODO: maybe make this configurable or part of "strict" option
      return {}
    }

    if (strict) {
      const first = firstchar(body)

      if (first !== '{' && first !== '[') {
        debug('strict violation')
        throw createStrictSyntaxError(body, first)
      }
    }

    try {
      debug('parse json')
      return JSON.parse(body, reviver)
    } catch (e) {
      throw normalizeJsonSyntaxError(e, {
        message: e.message,
        stack: e.stack,
      })
    }
  }

  return function jsonParser(req, res, next) {
    if (req._body) {
      debug('body already parsed')
      next()
      return
    }

    req.body = req.body || {}

    // skip requests without bodies
    if (!typeis.hasBody(req)) {
      debug('skip empty body')
      next()
      return
    }

    debug('content-type %j', req.headers['content-type'])

    // determine if request should be parsed
    if (!shouldParse(req)) {
      debug('skip parsing')
      next()
      return
    }

    // assert charset per RFC 7159 sec 8.1
    const charset = getCharset(req) || 'utf-8'
    if (charset.slice(0, 4) !== 'utf-') {
      debug('invalid charset')
      next(
        createError(
          415,
          'unsupported charset "' + charset.toUpperCase() + '"',
          {
            charset: charset,
            type: 'charset.unsupported',
          }
        )
      )
      return
    }

    // read
    read(req, res, next, parse, debug, {
      encoding: charset,
      inflate,
      limit,
      verify,
    })
  }
}

/**
 * Create strict violation syntax error matching native error.
 *
 * @param {string} str
 * @param {string} char
 * @return {Error}
 * @private
 */

function createStrictSyntaxError(str, char) {
  var index = str.indexOf(char)
  var partial = index !== -1 ? str.substring(0, index) + '#' : ''

  try {
    JSON.parse(partial)
    /* istanbul ignore next */ throw new SyntaxError('strict violation')
  } catch (e) {
    return normalizeJsonSyntaxError(e, {
      message: e.message.replace('#', char),
      stack: e.stack,
    })
  }
}

/**
 * Normalize a SyntaxError for JSON.parse.
 *
 * @param {SyntaxError} error
 * @param {object} obj
 * @return {SyntaxError}
 */

function normalizeJsonSyntaxError(error, obj) {
  var keys = Object.getOwnPropertyNames(error)

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    if (key !== 'stack' && key !== 'message') {
      delete error[key]
    }
  }

  // replace stack before message for Node.js 0.10 and below
  error.stack = obj.stack.replace(error.message, obj.message)
  error.message = obj.message

  return error
}

/**
 * Get the first non-whitespace character in a string.
 *
 * @param {string} str
 * @return {function}
 * @private
 */

function firstchar(str) {
  var match = FIRST_CHAR_REGEXP.exec(str)

  return match ? match[1] : undefined
}

/**
 * Get the charset of a request.
 *
 * @param {object} req
 * @api private
 */

function getCharset(req) {
  try {
    return (contentType.parse(req).parameters.charset || '').toLowerCase()
  } catch (e) {
    return undefined
  }
}

/**
 * Get the simple type checker.
 *
 * @param {string} type
 * @return {function}
 */

function typeChecker(type) {
  return function checkType(req) {
    return Boolean(typeis(req, type))
  }
}
