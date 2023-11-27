const bytes = require('bytes')
const typeis = require('type-is')
const debug = require('debug')('body-parser:raw')
const read = require('../read')

module.exports = raw

function raw(options) {
  const opts = options || {}
  const inflate = opts.inflate !== false
  const limit =
    typeof opts.limit !== 'number'
      ? bytes.parse(opts.limit || '100kb')
      : opts.limit
  const type = opts.type || 'application/octet-stream'
  const verify = opts.verify || false

  if (verify !== false && typeof verify !== 'function') {
    throw new TypeError('option verify must be function')
  }

  // create the appropriate type checking function
  const shouldParse = typeof type !== 'function' ? typeChecker(type) : type

  function parse(buf) {
    return buf
  }

  return function rawParser(req, res, next) {
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

    read(req, res, next, parse, debug, {
      encoding: null,
      inflate,
      limit,
      verify
    })
  }
}

/**
 * Get the simple type checker.
 *
 * @param {String} type
 * @returns {Function}
 */
function typeChecker(type) {
  return function checkType(req) {
    return Boolean(typeis(req, type))
  }
}
