'use strict'

const after = require('after')
const express = require('..')
const Router = express.Router
const methods = require('methods')
const assert = require('assert')

describe('Router', function () {
  it('should return a function with router methods', function () {
    const router = new Router()

    assert(typeof router === 'function')
    assert(typeof router.get === 'function')
    assert(typeof router.handle === 'function')
    assert(typeof router.use === 'function')
  })

  it('should support .use of other routers', function (done) {
    const router = new Router()
    const another = new Router()

    another.get('/bar', function (req, res) {
      res.end()
    })
    router.use('/foo', another)
    router.handle({ url: '/foo/bar', method: 'GET' }, { end: done })
  })

  it('should support dynamic routes', function (done) {
    const router = new Router()
    const another = new Router()

    another.use('/:bar', function (req, res) {
      assert.strictEqual(req.params.bar, 'route')
      res.end()
    })

    router.use('/:foo', another)

    router.handle({ url: '/test/route', method: 'GET' }, { end: done })
  })

  it('should handle blank URL', function (done) {
    const router = new Router()
    router.use(function (req, res) {
      throw new Error(`should not be called`)
    })

    router.handle({ url: '', method: 'GET' }, {}, done)
  })

  it('should handle missing URL', function (done) {
    const router = new Router()
    router.use(function (req, res) {
      throw new Error(`should not be called`)
    })

    router.handle({ method: 'GET' }, {}, done)
  })

  it('should not stack overflow with many registered routes', function (done) {
    this.timeout(5000) // long-running test
    const handler = function (req, res) {
      res.end(new Error('wrong handler'))
    }
    const router = new Router()

    for (let i = 0; i < 6000; i++) {
      router.use('/thing' + i, handler)
    }

    router.use('/', function (req, res) {
      res.end()
    })

    router.handle({ url: '/', method: 'GET' }, { end: done })
  })

  it('should not stack overflow with a large sync route stack', function (done) {
    this.timeout(5000)

    const router = new Router()

    router.get('/foo', function (req, res, next) {
      req.counter = 0
      next()
    })

    for (let i = 0; i < 6000; i++) {
      router.get('/foo', function (req, res, next) {
        req.counter++
        next()
      })
    }

    router.get('/foo', function (req, res) {
      assert.strictEqual(req.counter, 6000)
      res.end()
    })

    router.handle({ url: '/foo', method: 'GET' }, { end: done })
  })

  it('should not stack overflow with a large sync middleware stack', function (done) {
    this.timeout(5000)

    const router = new Router()

    router.use(function (req, res, next) {
      req.counter = 0
      next()
    })

    for (let i = 0; i < 6000; i++) {
      router.use(function (req, res, next) {
        req.counter++
        next()
      })
    }

    router.use(function (req, res) {
      assert.strictEqual(req.counter, 6000)
      res.end()
    })

    router.handle({ url: '/', method: 'GET' }, { end: done })
  })

  describe('.handle', function () {
    it('should dispatch', function (done) {
      const router = new Router()

      router.route('/foo').get(function (req, res) {
        res.send('foo')
      })

      const res = {
        send: function (val) {
          assert.strictEqual(val, 'foo')
          done()
        },
      }

      router.handle({ url: '/foo', method: 'GET' }, res)
    })
  })

  describe('.multiple callbacks', function () {
    it('should throw if a callback is null', function () {
      assert.throws(function () {
        const router = new Router()
        router.route('/foo').all(null)
      })
    })

    it('should throw if a callback is undefined', function () {
      assert.throws(function () {
        const router = new Router()
        router.route('/foo').all(undefined)
      })
    })

    it('should throw if a callback is not a function', function () {
      assert.throws(function () {
        const router = new Router()
        router.route('/foo').all('not a function')
      })
    })

    it('should not throw if all callbacks are functions', function () {
      const router = new Router()
      router
        .route('/foo')
        .all(function () {})
        .all(function () {})
    })
  })

  describe('error', function () {
    it('should skip non error middleware', function (done) {
      const router = new Router()

      router.get('/foo', function (req, res, next) {
        next(new Error('foo'))
      })

      router.get('/bar', function (req, res, next) {
        next(new Error('bar'))
      })

      router.use(function (req, res, next) {
        assert(false)
      })

      router.use(function (err, req, res, next) {
        assert.equal(err.message, 'foo')
        done()
      })

      router.handle({ url: '/foo', method: 'GET' }, {}, done)
    })

    it('should handle throwing inside routes with params', function (done) {
      const router = new Router()

      router.get('/foo/:id', function (req, res, next) {
        throw new Error('foo')
      })

      router.use(function (req, res, next) {
        assert(false)
      })

      router.use(function (err, req, res, next) {
        assert.equal(err.message, 'foo')
        done()
      })

      router.handle({ url: '/foo/2', method: 'GET' }, {}, function () {})
    })

    it('should handle throwing in handler after async param', function (done) {
      const router = new Router()

      router.param('user', function (req, res, next, val) {
        process.nextTick(function () {
          req.user = val
          next()
        })
      })

      router.use('/:user', function (req, res, next) {
        throw new Error('oh no!')
      })

      router.use(function (err, req, res, next) {
        assert.strictEqual(req.user, 'bob')
        assert.equal(err.message, 'oh no!')
        done()
      })

      router.handle({ url: '/bob', method: 'GET' }, {}, function () {})
    })

    it('should handle throwing inside error handlers', function (done) {
      const router = new Router()

      router.use(function (req, res, next) {
        throw new Error('boom!')
      })

      router.use(function (err, req, res, next) {
        throw new Error('oops')
      })

      router.use(function (err, req, res, next) {
        assert.equal(err.message, 'oops')
        done()
      })

      router.handle({ url: '/', method: 'GET' }, {}, done)
    })
  })

  describe('FQDN', function () {
    it('should not obscure FQDNs', function (done) {
      const request = { hit: 0, url: 'http://example.com/foo', method: 'GET' }
      const router = new Router()

      router.use(function (req, res, next) {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, 'http://example.com/foo')
        next()
      })

      router.handle(request, {}, function (err) {
        if (err) return done(err)
        assert.equal(request.hit, 1)
        done()
      })
    })
  })
})
