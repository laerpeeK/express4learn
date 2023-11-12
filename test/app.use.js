'use strict'

const assert = require('node:assert')
const express = require('../')
const request = require('supertest')
// const after = require('after')

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

    // it('should invoke middleware for all arguments', function (done) {
    //   const app = express()
    //   const cb = after(3, done)

    //   app.use(function (req, res) {
    //     res.send('saw ' + req.method + ' ' + req.url)
    //   })

    //   // request(app).get('/').expect(200, 'saw GET /', cb)

    //   // request(app).options('/').expect(200, 'saw OPTIONS /', cb)

    //   // request(app).post('/foo').expect(200, 'saw POST /foo', cb)
    // })
  })
})
