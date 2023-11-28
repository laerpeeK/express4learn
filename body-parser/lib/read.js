const createError = require('http-errors')
const zlib = require('zlib')
const iconv = require('iconv-lite')
const getBody = require('raw-body')
const unpipe = require('unpipe')
const destroy = require('destroy')
const onFinished = require('on-finished')

module.exports = read

function read(req, res, next, parse, debug, options) {
  let length
  const opts = options
  let stream

  // flag as parsed
  req._body = true

  // read options
  const encoding = opts.encoding !== null ? opts.encoding : null
  const verify = opts.verify

  try {
    // get the content stream
    stream = contentstream(req, debug, opts.inflate)
    length = stream.length
    stream.length = undefined
  } catch (err) {
    next(err)
  }

  // set raw-body options
  opts.length = length
  opts.encoding = verify ? null : encoding

  // assert charset is supported
  if (
    opts.encoding === null &&
    encoding !== null &&
    !iconv.encodingExists(encoding)
  ) {
    return next(
      createError(415, 'unsupported charset "' + encoding.toUpperCase() + '"', {
        charset: encoding.toLowerCase(),
        type: 'charset.unsupported',
      })
    )
  }

  // read body
  debug('read body')
  getBody(stream, opts, function (error, body) {
    if (error) {
      var _error

      if (error.type === 'encoding.unsupported') {
        // echo back charset
        _error = createError(
          415,
          'unsupported charset "' + encoding.toUpperCase() + '"',
          {
            charset: encoding.toLowerCase(),
            type: 'charset.unsupported',
          }
        )
      } else {
        // set status code on error
        _error = createError(400, error)
      }

      // unpipe from stream and destroy
      if (stream !== req) {
        unpipe(req)
        destroy(stream, true)
      }

      // read off entire request
      dump(req, function onfinished() {
        next(createError(400, _error))
      })
      return
    }

    // verify
    if (verify) {
      try {
        debug('verify body')
        verify(req, res, body, encoding)
      } catch (err) {
        next(
          createError(403, err, {
            body: body,
            type: err.type || 'entity.verify.failed',
          })
        )
        return
      }
    }

    // parse
    var str = body
    try {
      debug('parse body')
      str =
        typeof body !== 'string' && encoding !== null
          ? iconv.decode(body, encoding)
          : body
      req.body = parse(str)
    } catch (err) {
      next(
        createError(400, err, {
          body: str,
          type: err.type || 'entity.parse.failed',
        })
      )
      return
    }

    next()
  })
}

/**
 * Get the content stream of the request.
 * @param {object} req
 * @param {function} debug
 * @param {boolean} inflate
 */
function contentstream(req, debug, inflate) {
  const encoding = (req.headers['content-encoding'] || 'identity').toLowerCase()
  const length = req.headers['content-length']
  let stream

  debug('content-encoding "%s"', encoding)

  if (inflate === false && encoding !== 'identity') {
    throw createError(415, 'content encoding unsupported', {
      encoding,
      type: 'encoding.unsupported',
    })
  }

  switch (encoding) {
    case 'deflate':
      stream = zlib.createInflate()
      debug('inflate body')
      req.pipe(stream)
      break
    case 'gzip':
      stream = zlib.createGunzip()
      debug('gunzip body')
      req.pipe(stream)
      break
    case 'identity':
      stream = req
      stream.length = length
      break
    default:
      throw createError(
        415,
        'unsupported content encoding "' + encoding + '"',
        {
          encoding: encoding,
          type: 'encoding.unsupported',
        }
      )
  }

  return stream
}

/**
 * Dump the contents of a request.
 *
 * @param {object} req
 * @param {function} callback
 * @api private
 */

function dump(req, callback) {
  if (onFinished.isFinished(req)) {
    callback(null)
  } else {
    onFinished(req, callback)
    req.resume()
  }
}
