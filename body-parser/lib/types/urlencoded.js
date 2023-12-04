const deprecate = require('depd')('body-parser')
const bytes = require('bytes')
const debug = require('debug')('body-parser:url-encoded')
const createError = require('http-errors')
const typeis = require('type-is')
const contentType = require('content-type')
const read = require('../read')

module.exports = urlencoded

function urlencoded(options) {
  const opts = options || {}

  // notice because option default will flip in next major
  if (opts.extended === undefined) {
    deprecate('undefined extended: provide extended option')
  }

  const extended = opts.extended !== false //  一个布尔值，指定是否使用querystring库解析URL编码的数据。如果设置为false，将使用Node.js内置的querystring库解析，默认为true。
  const inflate = opts.inflate !== false
  const limit =
    typeof opts.limit !== 'number'
      ? bytes.parse(opts.limit || '100kb')
      : opts.limit
  const type = opts.type || 'application/x-www-form-urlencoded'
  const verify = opts.verify || false

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  // create the appropriate query parser
  const queryparse = extended ? extendedparser(opts) : simpleparser(opts)

  // create the appropriate type checking function
  const shouldParse = typeof type !== 'function' ? typeChecker(type) : type

  function parse(body) {
    return body.length ? queryparse(body) : {}
  }

  return function urlencodedParser(req, res, next) {
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

    // assert charset
    const charset = getCharset(req) || 'utf-8'
    if (charset !== 'utf-8') {
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

    read(req, res, next, parse, debug, {
      debug,
      encoding: charset,
      inflate,
      limit,
      verify
    })
  }
}

/**
 * Get the extended query parser.
 * @param {object} options
 */
function extendedparser(options) {
  let parameterLimit =
    options.parameterLimit !== undefined ? options.parameterLimit : 1000
  const parse = parser('qs')

  if (isNaN(parameterLimit) || parameterLimit < 1) {
    throw new TypeError('option parameterLimit must be a positive number')
  }

  if (isFinite(parameterLimit)) {
    parameterLimit = parameterLimit | 0
  }

  return function queryparse(body) {
    const paramCount = parameterCount(body, parameterLimit)

    if (paramCount === undefined) {
      debug('too many parameters')
      throw createError(413, 'too many parameters', {
        type: 'parameters.too.many',
      })
    }

    const arrayLimit = Math.max(100, paramCount)
    debug('parse extended urlencoding')
    return parse(body, {
      allowPrototypes: true,
      arrayLimit: arrayLimit,
      depth: Infinity,
      parameterLimit,
    })
  }
}

/**
 * Count the number of parameters, stopping once limit reached
 *
 * @param {string} body
 * @param {number} limit
 * @api private
 */
function parameterCount(body, limit) {
  let count = 0
  let index = 0

  while ((index = body.indexOf('&', index)) !== -1) {
    count++
    index++

    if (count === limit) {
      return undefined
    }
  }

  return count
}

function simpleparser(options) {
  let parameterLimit =
    options.parameterLimit !== undefined ? options.parameterLimit : 1000
  const parse = parser('querystring')

  if (isNaN(parameterLimit) || parameterLimit < 1) {
    throw new TypeError('option parameterLimit must be a positive number')
  }

  if (isFinite(parameterLimit)) {
    parameterLimit = parameterLimit | 0
  }

  return function queryparse(body) {
    const paramCount = parameterCount(body, parameterLimit)

    if (paramCount === undefined) {
      debug('too many parameters')
      throw createError(413, 'too many parameters', {
        type: 'parameters.too.many',
      })
    }

    debug('parse urlencoding')
    return parse(body, undefined, undefined, { maxKeys: parameterLimit })
  }
}

/**
 * Cache of parser modules.
 */
const parsers = Object.create(null)

/**
 *
 * @param {string} name
 * @return {function}
 * @api private
 */
function parser(name) {
  let mod = parsers[name]

  if (mod !== undefined) {
    return mod.parse
  }

  // this uses a switch for static require analysis
  switch (name) {
    case 'qs':
      mod = require('qs')
      break
    case 'querystring':
      mod = require('querystring')
      break
  }

  // store to prevent invoking require()
  parsers[name] = mod
  return mod.parse
}

/**
 * Get the simple type checker.
 *
 * @param {string} type
 * @returns {function}
 */
function typeChecker(type) {
  return function checkType(req) {
    return Boolean(typeis(req, type))
  }
}

/**
 * Get the charset of a request.
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
