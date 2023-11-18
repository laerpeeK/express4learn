'use strict'

const assert = require('node:assert')
const express = require('../')
const request = require('supertest')
const after = require('after')

describe('app', function () {
  it('should emit "mount" when mounted', function (done) {
    const blog = express()
    const app = express()

    blog.on('mount', function (arg) {
      assert.strictEqual(arg, app)
      done()
    })

    app.use(blog)
  })

  describe('.use(app)', function () {
    it('should mount the app', function (done) {
      const app = express()
      const blog = express()

      blog.use('/blog', function (req, res) {
        res.end('blog')
      })

      app.use(blog)

      request(app).get('/blog').expect('blog', done)
    })
  })

  describe('.use(middleware)', function () {
    it('should accept multiple arguments', function (done) {
      const app = express()

      function fn1(req, res, next) {
        res.setHeader('x-fn-1', 'hit')
        next()
      }

      function fn2(req, res, next) {
        res.setHeader('x-fn-2', 'hit')
        next()
      }

      app.use(fn1, fn2, function fn3(req, res) {
        res.setHeader('x-fn-3', 'hit')
        res.end()
      })

      request(app)
        .get('/')
        .expect('x-fn-1', 'hit')
        .expect('x-fn-2', 'hit', 'x-fn-3', 'hit')
        .expect(200, done)
    })

    it('should invoke middleware for all requests', function (done) {
      const app = express()
      const cb = after(3, done)

      app.use(function (req, res) {
        res.send('saw ' + req.method + ' ' + req.url)
      })

      request(app).get('/').expect(200, 'saw GET /', done)

      request(app).options('/').expect(200, 'saw OPTIONS /', cb)

      request(app).post('/foo').expect(200, 'saw POST /foo', cb)
    })

    it('should accept array of middleware', function (done) {
      const app = express()

      function fn1(req, res, next) {
        res.setHeader('x-fn-1', 'hit')
        next()
      }

      function fn2(req, res, next) {
        res.setHeader('x-fn-2', 'hit')
        next()
      }

      function fn3(req, res, next) {
        res.setHeader('x-fn-3', 'hit')
        res.end()
      }

      app.use([fn1, fn2, fn3])
      request(app)
        .get('/')
        .expect('x-fn-1', 'hit')
        .expect('x-fn-2', 'hit')
        .expect('x-fn-3', 'hit')
        .expect(200, done)
    })

    it('should accept multiple arrays of middleware', function (done) {
      const app = express()

      function fn1(req, res, next) {
        res.setHeader('x-fn-1', 'hit')
        next()
      }

      function fn2(req, res, next) {
        res.setHeader('x-fn-2', 'hit')
        next()
      }

      function fn3(req, res, next) {
        res.setHeader('x-fn-3', 'hit')
        res.end()
      }

      app.use([fn1, fn2], [fn3])

      request(app)
        .get('/')
        .expect('x-fn-1', 'hit')
        .expect('x-fn-2', 'hit')
        .expect('x-fn-3', 'hit')
        .expect(200, done)
    })

    it('should accept nested arrays of middleware', function (done) {
      const app = express()

      function fn1(req, res, next) {
        res.setHeader('x-fn-1', 'hit')
        next()
      }

      function fn2(req, res, next) {
        res.setHeader('x-fn-2', 'hit')
        next()
      }

      function fn3(req, res, next) {
        res.setHeader('x-fn-3', 'hit')
        res.end()
      }

      app.use([[fn1], fn2], [fn3])

      request(app)
        .get('/')
        .expect('x-fn-1', 'hit')
        .expect('x-fn-2', 'hit')
        .expect('x-fn-3', 'hit')
        .expect(200, done)
    })
  })

  describe('.use(path, middleware)', function () {
    it('should require middleware', function () {
      const app = express()
      assert.throws(function () {
        app.use('/')
      }, /requires a middleware function/)
    })

    it('should reject string as middleware', function () {
      const app = express()
      assert.throws(function () {
        app.use('/', 'foo')
      }, /requires a middleware function but got a string/)
    })

    it('should reject number as middleware', function () {
      const app = express()
      assert.throws(function () {
        app.use('/', 42)
      }, /requires a middleware function but got a number/)
    })

    it('should reject null as middleware', function () {
      const app = express()
      assert.throws(function () {
        app.use('/', null)
      }, /requires a middleware function but got a Null/)
    })

    it('should reject Date as middleware', function () {
      const app = express()
      assert.throws(function () {
        app.use('/', new Date())
      }, /requires a middleware function but got a Date/)
    })

    it('should strip path from req.url', function (done) {
      const app = express()

      app.use('/foo', function (req, res) {
        res.send('saw ' + req.method + ' ' + req.url)
      })

      request(app).get('/foo/bar').expect(200, 'saw GET /bar', done)
    })

    it('should accept multiple arguments', function (done) {
      const app = express()

      function fn1(req, res, next) {
        res.setHeader('x-fn-1', 'hit')
        next()
      }

      function fn2(req, res, next) {
        res.setHeader('x-fn-2', 'hit')
        next()
      }

      app.use('/foo', fn1, fn2, function fn3(req, res) {
        res.setHeader('x-fn-3', 'hit')
        res.end()
      })

      request(app)
        .get('/foo')
        .expect('x-fn-1', 'hit')
        .expect('x-fn-2', 'hit')
        .expect('x-fn-3', 'hit')
        .expect(200, done)
    })

    it('should invoke middleware for all requests starting with path', function (done) {
      const app = express()
      const cb = after(3, done)

      app.use('/foo', function (req, res) {
        res.send('saw ' + req.method + ' ' + req.url)
      })

      request(app).get('/').expect(404, cb)

      request(app).post('/foo').expect(200, 'saw POST /', cb)

      request(app).post('/foo/bar').expect(200, 'saw POST /bar', cb)
    })

    it('should work if path has trailing slash', function (done) {
      const app = express()
      const cb = after(3, done)

      app.use('/foo/', function (req, res) {
        res.send('saw ' + req.method + ' ' + req.url)
      })

      request(app).get('/').expect(404, cb)

      request(app).post('/foo').expect(200, 'saw POST /', cb)

      request(app).post('/foo/bar').expect(200, 'saw POST /bar', cb)
    })

    it('should accept array of middleware', function (done) {
      const app = express()

      function fn1(req, res, next) {
        res.setHeader('x-fn-1', 'hit')
        next()
      }

      function fn2(req, res, next) {
        res.setHeader('x-fn-2', 'hit')
        next()
      }

      function fn3(req, res, next) {
        res.setHeader('x-fn-3', 'hit')
        res.end()
      }

      app.use('/foo', [fn1, fn2, fn3])

      request(app)
        .get('/foo')
        .expect('x-fn-1', 'hit')
        .expect('x-fn-2', 'hit')
        .expect('x-fn-3', 'hit')
        .expect(200, done)
    })

    it('should accept multiple arrays of middleware', function (done) {
      const app = express()

      function fn1(req, res, next) {
        res.setHeader('x-fn-1', 'hit')
        next()
      }

      function fn2(req, res, next) {
        res.setHeader('x-fn-2', 'hit')
        next()
      }

      function fn3(req, res, next) {
        res.setHeader('x-fn-3', 'hit')
        res.end()
      }

      app.use('/foo', [fn1, fn2], [fn3])

      request(app)
        .get('/foo')
        .expect('x-fn-1', 'hit')
        .expect('x-fn-2', 'hit')
        .expect('x-fn-3', 'hit')
        .expect(200, done)
    })

    it('should accept nested arrays of middleware', function (done) {
      const app = express()

      function fn1(req, res, next) {
        res.setHeader('x-fn-1', 'hit')
        next()
      }

      function fn2(req, res, next) {
        res.setHeader('x-fn-2', 'hit')
        next()
      }

      function fn3(req, res, next) {
        res.setHeader('x-fn-3', 'hit')
        res.end()
      }

      app.use('/foo', [fn1, [fn2]], [fn3])

      request(app)
        .get('/foo')
        .expect('x-fn-1', 'hit')
        .expect('x-fn-2', 'hit')
        .expect('x-fn-3', 'hit')
        .expect(200, done)
    })

    it('should support array of paths', function (done) {
      const app = express()
      const cb = after(3, done)

      app.use(['/foo/', '/bar'], function (req, res) {
        res.send(
          'saw ' + req.method + ' ' + req.url + ' through ' + req.originalUrl
        )
      })

      request(app).get('/').expect(404, cb)

      request(app).get('/foo').expect(200, 'saw GET / through /foo', cb)

      request(app).get('/bar').expect(200, 'saw GET / through /bar', cb)
    })

    it('should support array of paths with middleware array', function (done) {
      const app = express()
      const cb = after(2, done)

      function fn1(req, res, next) {
        res.setHeader('x-fn-1', 'hit')
        next()
      }

      function fn2(req, res, next) {
        res.setHeader('x-fn-2', 'hit')
        next()
      }

      function fn3(req, res, next) {
        res.setHeader('x-fn-3', 'hit')
        res.send(
          'saw ' + req.method + ' ' + req.url + ' through ' + req.originalUrl
        )
      }

      app.use(['/foo/', '/bar'], [[fn1], fn2], [fn3])

      request(app)
        .get('/foo')
        .expect('x-fn-1', 'hit')
        .expect('x-fn-2', 'hit')
        .expect('x-fn-3', 'hit')
        .expect(200, 'saw GET / through /foo', cb)

      request(app)
        .get('/bar')
        .expect('x-fn-1', 'hit')
        .expect('x-fn-2', 'hit')
        .expect('x-fn-3', 'hit')
        .expect(200, 'saw GET / through /bar', cb)
    })

    it('should support regexp path', function (done) {
      const app = express()
      const cb = after(4, done)

      app.use(/^\/[a-z]oo/, function (req, res) {
        res.send(
          'saw ' + req.method + ' ' + req.url + ' through ' + req.originalUrl
        )
      })

      request(app).get('/').expect(404, cb)

      request(app).get('/foo').expect(200, 'saw GET / through /foo', cb)

      request(app)
        .get('/zoo/bear')
        .expect(200, 'saw GET /bear through /zoo/bear', cb)

      request(app).get('/get/zoo').expect(404, cb)
    })

    it('should support empty string path', function (done) {
      const app = express()

      app.use('', function (req, res) {
        res.send(
          'saw ' + req.method + ' ' + req.url + ' through ' + req.originalUrl
        )
      })

      request(app).get('/').expect(200, 'saw GET / through /', done)
    })
  })
})
