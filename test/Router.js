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
})
