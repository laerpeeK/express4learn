'use strict'

const assert = require('assert')
const express = require('../')
const Buffer = require('safe-buffer').Buffer
const request = require('supertest')
const asyncHooks = tryRequire('async_hooks')

const describeAsyncHooks =
  typeof asyncHooks.AsyncLocalStorage === 'function' ? describe : describe.skip

describe('express.raw()', function () {
  before(function () {
    this.app = createApp()
  })

  it('should parse application/octet-stream', function (done) {
    request(this.app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .send('the user is tobi')
      .expect(200, { buf: '746865207573657220697320746f6269' }, done)
  })

  it('should 400 when invalid content-length', function (done) {
    const app = express()

    app.use(function (req, res, next) {
      req.headers['content-length'] = '20'
      next()
    })

    app.use(express.raw())
    app.post('/', function (req, res) {
      if (Buffer.isBuffer(req.body)) {
        res.json({ buf: req.body.toString('hex') })
      } else {
        res.json(req.body)
      }
    })

    request(app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .send('stuff')
      .expect(400, /content length/, done)
  })

  it('should handle Content-Length: 0', function (done) {
    request(this.app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .set('Content-Length', '0')
      .expect(200, { buf: '' }, done)
  })

  it('should handle empty message-body', function (done) {
    request(this.app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .set('Transfer-Encoding', 'chunked')
      .send('')
      .expect(200, { buf: '' }, done)
  })

  it('should 500 if stream not readable', function (done) {
    const app = express()

    app.use(function (req, res, next) {
      req.on('end', next)
      req.resume()
    })

    app.use(express.raw())

    app.use(function (err, req, res, next) {
      res.status(err.status || 500)
      res.send('[' + err.type + '] ' + err.message)
    })

    app.post('/', function (req, res) {
      if (Buffer.isBuffer(req.body)) {
        res.json({ buf: req.body.toString('hex') })
      } else {
        res.json(req.body)
      }
    })

    request(app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .send('the user is tobi')
      .expect(500, '[stream.not.readable] stream is not readable', done)
  })

  it('should handle duplicated middleware', function (done) {
    const app = express()

    app.use(express.raw())
    app.use(express.raw())

    app.post('/', function (req, res) {
      if (Buffer.isBuffer(req.body)) {
        res.json({ buf: req.body.toString('hex') })
      } else {
        res.json(req.body)
      }
    })

    request(app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .send('the user is tobi')
      .expect(200, { buf: '746865207573657220697320746f6269' }, done)
  })

  describe('with limit option', function () {
    it('should 413 when over limit with Content-Length', function (done) {
      const buf = Buffer.alloc(1028, '.')
      const app = createApp({ limit: '1kb' })
      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.set('Content-Length', '1028')
      test.write(buf)
      test.expect(413, done)
    })

    it('should 413 when over limit with chunked encoding', function (done) {
      const buf = Buffer.alloc(1028, '.')
      const app = createApp({ limit: '1kb' })
      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.set('Transfer-Encoding', 'chunked')
      test.write(buf)
      test.expect(413, done)
    })

    it('should 413 when inflated body over limit', function (done) {
      const app = createApp({ limit: '1kb' })
      const test = request(app).post('/')
      test.set('Content-Encoding', 'gzip')
      test.set('Content-Type', 'application/octet-stream')
      test.write(
        Buffer.from(
          '1f8b080000000000000ad3d31b05a360148c64000087e5a14704040000',
          'hex'
        )
      )
      test.expect(413, done)
    })

    it('should accept number of bytes', function (done) {
      const buf = Buffer.alloc(1028, '.')
      const app = createApp({ limit: 1024 })
      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(buf)
      test.expect(413, done)
    })

    it('should not change when options altered', function (done) {
      const buf = Buffer.alloc(1028, '.')
      const options = { limit: '1kb' }
      const app = createApp(options)

      options.limit = '100kb'

      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(buf)
      test.expect(413, done)
    })

    it('should not hang response', function (done) {
      const buf = Buffer.alloc(10240, '.')
      const app = createApp({ limit: '8kb' })
      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(buf)
      test.write(buf)
      test.write(buf)
      test.expect(413, done)
    })

    it('should not error when inflating', function (done) {
      const app = createApp({ limit: '1kb' })
      const test = request(app).post('/')
      test.set('Content-Encoding', 'gzip')
      test.set('Content-Type', 'application/octet-stream')
      test.write(
        Buffer.from(
          '1f8b080000000000000ad3d31b05a360148c64000087e5a147040400',
          'hex'
        )
      )
      test.expect(413, done)
    })
  })

  describe('with inflate option', function () {
    describe('when false', function () {
      before(function () {
        this.app = createApp({ inflate: false })
      })

      it('should not accept content-encoding', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Encoding', 'gzip')
        test.set('Content-Type', 'application/octet-stream')
        test.write(
          Buffer.from(
            '1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000',
            'hex'
          )
        )
        test.expect(
          415,
          '[encoding.unsupported] content encoding unsupported',
          done
        )
      })
    })

    describe('when true', function () {
      before(function () {
        this.app = createApp({ inflate: true })
      })

      it('should accept content-encoding', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Encoding', 'gzip')
        test.set('Content-Type', 'application/octet-stream')
        test.write(
          Buffer.from(
            '1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000',
            'hex'
          )
        )
        test.expect(200, { buf: '6e616d653de8aeba' }, done)
      })
    })
  })

  describe('with type option', function () {
    describe('when "application/vnd+octets"', function () {
      before(function () {
        this.app = createApp({ type: 'application/vnd+octets' })
      })

      it('should parse for custom type', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Type', 'application/vnd+octets')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, { buf: '000102' }, done)
      })

      it('should ignore standard type', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Type', 'application/octet-stream')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, '{}', done)
      })
    })

    describe('when ["application/octet-stream", "application/vnd+octets"]', function () {
      before(function () {
        this.app = createApp({
          type: ['application/octet-stream', 'application/vnd+octets'],
        })
      })

      it('should parse "application/octet-stream"', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Type', 'application/octet-stream')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, { buf: '000102' }, done)
      })

      it('should parse "application/vnd+octets"', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Type', 'application/vnd+octets')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, { buf: '000102' }, done)
      })

      it('should ignore "application/x-foo"', function (done) {
        const test = request(this.app).post('/')
        test.set('Content-Type', 'application/x-foo')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, '{}', done)
      })
    })

    describe('when a function', function () {
      it('should parse when truthy value returned', function (done) {
        const app = createApp({ type: accept })

        function accept(req) {
          return req.headers['content-type'] === 'application/vnd.octet'
        }

        const test = request(app).post('/')
        test.set('Content-Type', 'application/vnd.octet')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, { buf: '000102' }, done)
      })

      it('should work without content-type', function (done) {
        const app = createApp({ type: accept })

        function accept(req) {
          return true
        }

        const test = request(app).post('/')
        test.write(Buffer.from('000102', 'hex'))
        test.expect(200, { buf: '000102' }, done)
      })

      it('should not invoke without a body', function (done) {
        const app = createApp({ type: accept })

        function accept(req) {
          throw new Error('oops!')
        }

        request(app).get('/').expect(404, done)
      })
    })
  })

  describe('with verify option', function () {
    it('should assert value is function', function () {
      assert.throws(
        createApp.bind(null, { verify: 'lol' }),
        /TypeError: option verify must be function/
      )
    })

    it('should error from verify', function (done) {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x00) throw new Error('no leading null')
        },
      })

      var test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('000102', 'hex'))
      test.expect(403, '[entity.verify.failed] no leading null', done)
    })

    it('should allow custom codes', function (done) {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] !== 0x00) return
          const err = new Error('no leading null')
          err.status = 400
          throw err
        },
      })

      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('000102', 'hex'))
      test.expect(400, '[entity.verify.failed] no leading null', done)
    })

    it('should allow pass-through', function (done) {
      const app = createApp({
        verify: function (req, res, buf) {
          if (buf[0] === 0x00) throw new Error('no leading null')
        },
      })

      const test = request(app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('0102', 'hex'))
      test.expect(200, { buf: '0102' }, done)
    })
  })

  describeAsyncHooks('async local storage', function () {
    before(function () {
      const app = express()
      const store = { foo: 'bar' }

      app.use(function (req, res, next) {
        req.asyncLocalStorage = new asyncHooks.AsyncLocalStorage()
        req.asyncLocalStorage.run(store, next)
      })

      app.use(express.raw())

      app.use(function (req, res, next) {
        const local = req.asyncLocalStorage.getStore()

        if (local) {
          res.setHeader('x-store-foo', String(local.foo))
        }

        next()
      })

      app.use(function (err, req, res, next) {
        const local = req.asyncLocalStorage.getStore()

        if (local) {
          res.setHeader('x-store-foo', String(local.foo))
        }

        res.status(err.status || 500)
        res.send('[' + err.type + '] ' + err.message)
      })

      app.post('/', function (req, res) {
        if (Buffer.isBuffer(req.body)) {
          res.json({ buf: req.body.toString('hex') })
        } else {
          res.json(req.body)
        }
      })

      this.app = app
    })

    it('should presist store', function (done) {
      request(this.app)
        .post('/')
        .set('Content-Type', 'application/octet-stream')
        .send('the user is tobi')
        .expect(200)
        .expect('x-store-foo', 'bar')
        .expect({ buf: '746865207573657220697320746f6269' })
        .end(done)
    })

    it('should presist store when unmatched content-type', function (done) {
      request(this.app)
        .post('/')
        .set('Content-Type', 'application/fizzbuzz')
        .send('buzz')
        .expect(200)
        .expect('x-store-foo', 'bar')
        .expect('{}')
        .end(done)
    })

    it('should presist store when inflated', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'gzip')
      test.set('Content-Type', 'application/octet-stream')
      test.write(
        Buffer.from(
          '1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000',
          'hex'
        )
      )
      test.expect(200)
      test.expect('x-store-foo', 'bar')
      test.expect({ buf: '6e616d653de8aeba' })
      test.end(done)
    })

    it('should presist store when inflate error', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'gzip')
      test.set('Content-Type', 'application/octet-stream')
      test.write(
        Buffer.from(
          '1f8b080000000000000bcb4bcc4db57db16e170099a4bad6080000',
          'hex'
        )
      )
      test.expect(400)
      test.expect('x-store-foo', 'bar')
      test.end(done)
    })

    it('should presist store when limit exceeded', function (done) {
      request(this.app)
        .post('/')
        .set('Content-Type', 'application/octet-stream')
        .send('the user is ' + Buffer.alloc(1024 * 100, '.').toString())
        .expect(413)
        .expect('x-store-foo', 'bar')
        .end(done)
    })
  })

  describe('charset', function () {
    before(function () {
      this.app = createApp()
    })

    it('should ignore charset', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Type', 'application/octet-stream; charset=utf-8')
      test.write(Buffer.from('6e616d6520697320e8aeba', 'hex'))
      test.expect(200, { buf: '6e616d6520697320e8aeba' }, done)
    })
  })

  describe('encoding', function () {
    before(function () {
      this.app = createApp({ limit: '10kb' })
    })

    it('should parse without encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('6e616d653de8aeba', 'hex'))
      test.expect(200, { buf: '6e616d653de8aeba' }, done)
    })

    it('should support identity encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'identity')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('6e616d653de8aeba', 'hex'))
      test.expect(200, { buf: '6e616d653de8aeba' }, done)
    })

    it('should support gzip encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'gzip')
      test.set('Content-Type', 'application/octet-stream')
      test.write(
        Buffer.from(
          '1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000',
          'hex'
        )
      )
      test.expect(200, { buf: '6e616d653de8aeba' }, done)
    })

    it('should support deflate encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'deflate')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('789ccb4bcc4db57db16e17001068042f', 'hex'))
      test.expect(200, { buf: '6e616d653de8aeba' }, done)
    })

    it('should be case-insensitive', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'GZIP')
      test.set('Content-Type', 'application/octet-stream')
      test.write(
        Buffer.from(
          '1f8b080000000000000bcb4bcc4db57db16e170099a4bad608000000',
          'hex'
        )
      )
      test.expect(200, { buf: '6e616d653de8aeba' }, done)
    })

    it('should 415 on unknown encoding', function (done) {
      const test = request(this.app).post('/')
      test.set('Content-Encoding', 'nulls')
      test.set('Content-Type', 'application/octet-stream')
      test.write(Buffer.from('000000000000', 'hex'))
      test.expect(
        415,
        '[encoding.unsupported] unsupported content encoding "nulls"',
        done
      )
    })
  })
})

function createApp(options) {
  const app = express()
  app.use(express.raw(options))

  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.send(
      String(
        req.headers['x-error-property']
          ? err[req.headers['x-error-property']]
          : '[' + err.type + '] ' + err.message
      )
    )
  })

  app.post('/', function (req, res) {
    if (Buffer.isBuffer(req.body)) {
      res.json({ buf: req.body.toString('hex') })
    } else {
      res.json(req.body)
    }
  })

  return app
}

function tryRequire(name) {
  try {
    return require(name)
  } catch (e) {
    return {}
  }
}
