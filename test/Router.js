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

    it('should ignore FQDN in search', function (done) {
      const request = {
        hit: 0,
        url: '/proxy?url=http://example.com/blog/post/1',
        method: 'GET',
      }
      const router = new Router()

      router.use('/proxy', function (req, res, next) {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, '/?url=http://example.com/blog/post/1')
        next()
      })

      router.handle(request, {}, function (err) {
        if (err) return done(err)
        assert.equal(request.hit, 1)
        done()
      })
    })

    it('should ignore FQDN in path', function (done) {
      const request = {
        hit: 0,
        url: '/proxy/http://example.com/blog/post/1',
        method: 'GET',
      }
      const router = new Router()

      router.use('/proxy', function (req, res, next) {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, '/http://example.com/blog/post/1')
        next()
      })

      router.handle(request, {}, function (err) {
        if (err) return done(err)
        assert.equal(request.hit, 1)
        done()
      })
    })

    it('should adjust FQDN req.url', function (done) {
      const request = {
        hit: 0,
        url: 'http://example.com/blog/post/1',
        method: 'GET',
      }
      const router = new Router()

      router.use('/blog', function (req, res, next) {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, 'http://example.com/post/1')
        next()
      })

      router.handle(request, {}, function (err) {
        if (err) return done(err)
        assert.equal(request.hit, 1)
        done()
      })
    })

    it('should adjust FQDN req.url with multiple handlers', function (done) {
      const request = {
        hit: 0,
        url: 'http://example.com/blog/post/1',
        method: 'GET',
      }
      const router = new Router()

      router.use(function (req, res, next) {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, 'http://example.com/blog/post/1')
        next()
      })

      router.use('/blog', function (req, res, next) {
        assert.equal(req.hit++, 1)
        assert.equal(req.url, 'http://example.com/post/1')
        next()
      })

      router.handle(request, {}, function (err) {
        if (err) return done(err)
        assert.equal(request.hit, 2)
        done()
      })
    })

    it('should adjust FQDN req.url with multiple routed handlers', function (done) {
      const request = {
        hit: 0,
        url: 'http://example.com/blog/post/1',
        method: 'GET',
      }
      const router = new Router()

      router.use('/blog', function (req, res, next) {
        assert.equal(req.hit++, 0)
        assert.equal(req.url, 'http://example.com/post/1')
        next()
      })

      router.use('/blog', function (req, res, next) {
        assert.equal(req.hit++, 1)
        assert.equal(req.url, 'http://example.com/post/1')
        next()
      })

      router.use(function (req, res, next) {
        assert.equal(req.hit++, 2)
        assert.equal(req.url, 'http://example.com/blog/post/1')
        next()
      })

      router.handle(request, {}, function (err) {
        if (err) return done(err)
        assert.equal(request.hit, 3)
        done()
      })
    })
  })

  describe('.all', function () {
    it('should support using .all to capture all http verbs', function (done) {
      const router = new Router()

      let count = 0
      router.all('/foo', function () {
        count++
      })

      var url = '/foo?bar=baz'

      methods.forEach(function testMethod(method) {
        router.handle({ url: url, method: method }, {}, function () {})
      })

      assert.equal(count, methods.length)
      done()
    })

    it('should be called for any URL when "*"', function (done) {
      const cb = after(4, done)
      const router = new Router()

      function no() {
        throw new Error('should not be called')
      }

      router.all('*', function (req, res) {
        res.end()
      })

      router.handle({ url: '/', method: 'GET' }, { end: cb }, no)
      router.handle({ url: '/foo', method: 'GET' }, { end: cb }, no)
      router.handle({ url: 'foo', method: 'GET' }, { end: cb }, no)
      router.handle({ url: '*', method: 'GET' }, { end: cb }, no)
    })
  })

  describe('.use', function () {
    it('should require middleware', function () {
      const router = new Router()
      assert.throws(function () {
        router.use('/')
      }, /requires a middleware function/)
    })

    it('should reject string as middleware', function () {
      const router = new Router()
      assert.throws(function () {
        router.use('/', 'foo')
      }, /requires a middleware function but got a string/)
    })

    it('should reject number as middleware', function () {
      const router = new Router()
      assert.throws(function () {
        router.use('/', 42)
      }, /requires a middleware function but got a number/)
    })

    it('should reject null as middleware', function () {
      const router = new Router()
      assert.throws(function () {
        router.use('/', null)
      }, /requires a middleware function but got a Null/)
    })

    it('should reject Date as middleware', function () {
      const router = new Router()
      assert.throws(function () {
        router.use('/', new Date())
      }, /requires a middleware function but got a Date/)
    })

    it('should be called for any URL', function (done) {
      const cb = after(4, done)
      const router = new Router()

      function no() {
        throw new Error('should not be called')
      }

      router.use(function (req, res) {
        res.end()
      })

      router.handle({ url: '/', method: 'GET' }, { end: cb }, no)
      router.handle({ url: '/foo', method: 'GET' }, { end: cb }, no)
      router.handle({ url: 'foo', method: 'GET' }, { end: cb }, no)
      router.handle({ url: '*', method: 'GET' }, { end: cb }, no)
    })

    it('should accept array of middleware', function (done) {
      let count = 0
      const router = new Router()

      function fn1(req, res, next) {
        assert.equal(++count, 1)
        next()
      }

      function fn2(req, res, next) {
        assert.equal(++count, 2)
        next()
      }

      router.use([fn1, fn2], function (req, res) {
        assert.equal(++count, 3)
        done()
      })

      router.handle({ url: '/foo', method: 'GET' }, {}, function () {})
    })
  })

  describe('.param', function () {
    it('should call param function when routing VERBS', function (done) {
      const router = new Router()
      router.param('id', function (req, res, next, id) {
        assert.equal(id, '123')
        next()
      })

      router.get('/foo/:id/bar', function (req, res, next) {
        assert.equal(req.params.id, '123')
        next()
      })

      router.handle({ url: '/foo/123/bar', method: 'get' }, {}, done)
    })

    it('should call param function when routing middleware', function (done) {
      const router = new Router()

      router.param('id', function (req, res, next, id) {
        assert.equal(id, '123')
        next()
      })

      router.use('/foo/:id/bar', function (req, res, next) {
        assert.equal(req.params.id, '123')
        assert.equal(req.url, '/baz')
        next()
      })

      router.handle({ url: '/foo/123/bar/baz', method: 'get' }, {}, done)
    })

    it('should only call once per request', function (done) {
      let count = 0
      const req = { url: '/foo/bob/bar', method: 'get' }
      const router = new Router()
      const sub = new Router()

      sub.get('/bar', function (req, res, next) {
        next()
      })

      router.param('user', function (req, res, next, user) {
        count++
        req.user = user
        next()
      })

      router.use('/foo/:user/', new Router())
      router.use('/foo/:user/', sub)

      router.handle(req, {}, function (err) {
        if (err) return done(err)
        assert.equal(count, 1)
        assert.equal(req.user, 'bob')
        done()
      })
    })

    it('should call when values differ', function (done) {
      let count = 0
      const req = { url: '/foo/bob/bar', method: 'get' }
      const router = new Router()
      const sub = new Router()

      sub.get('/bar', function (req, res, next) {
        next()
      })

      router.param('user', function (req, res, next, user) {
        count++
        req.user = user
        next()
      })

      router.use('/foo/:user/', new Router())
      router.use('/:user/bob/', sub)

      router.handle(req, {}, function (err) {
        if (err) return done(err)
        assert.equal(count, 2)
        assert.equal(req.user, 'foo')
        done()
      })
    })
  })

  describe('parallel requests', function () {
    it('should not mix requests', function (done) {
      const req1 = { url: '/foo/50/bar', method: 'get' }
      const req2 = { url: '/foo/10/bar', method: 'get' }
      const router = new Router()
      const sub = new Router()

      done = after(2, done)

      sub.get('/bar', function (req, res, next) {
        next()
      })

      router.param('ms', function (req, res, next, ms) {
        ms = parseInt(ms, 10)
        req.ms = ms
        setTimeout(next, ms)
      })

      router.use('/foo/:ms/', new Router())
      router.use('/foo/:ms/', sub)

      router.handle(req1, {}, function (err) {
        assert.ifError(err)
        assert.equal(req1.ms, 50)
        assert.equal(req1.originalUrl, '/foo/50/bar')
        done()
      })

      router.handle(req2, {}, function (err) {
        assert.ifError(err)
        assert.equal(req2.ms, 10)
        assert.equal(req2.originalUrl, '/foo/10/bar')
        done()
      })
    })
  })
})
