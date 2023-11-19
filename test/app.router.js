'use strict'

const after = require('after')
const express = require('../')
const request = require('supertest')
const assert = require('assert')
const methods = require('methods')

describe('app.router', function () {
  it('should restore req.params after leaving router', function (done) {
    const app = express()
    const router = new express.Router()

    function handler1(req, res, next) {
      res.setHeader('x-user-id', String(req.params.id))
      next()
    }

    function handler2(req, res) {
      res.send(req.params.id)
    }

    router.use(function (req, res, next) {
      res.setHeader('x-router', String(req.params.id))
      next()
    })

    app.get('/user/:id', handler1, router, handler2)

    request(app)
      .get('/user/1')
      .expect('x-router', 'undefined')
      .expect('x-user-id', '1')
      .expect(200, '1', done)
  })

  describe('methods', function () {
    methods.concat('del').forEach(function (method) {
      if (method === 'connect') return

      it('should include' + method.toUpperCase(), function (done) {
        const app = express()

        app[method]('/foo', function (req, res) {
          res.send(method)
        })

        request(app)[method]('/foo').expect(200, done)
      })
    })

    it('should re-route when method is altered', function (done) {
      const app = express()
      const cb = after(3, done)

      app.use(function (req, res, next) {
        if (req.method !== 'POST') return next()
        req.method = 'DELETE'
        res.setHeader('X-Method-Altered', '1')
        next()
      })

      app.delete('/', function (req, res) {
        res.end('deleted everything')
      })

      request(app).get('/').expect(404, cb)

      request(app).delete('/').expect(200, 'deleted everything', cb)

      request(app)
        .post('/')
        .expect('X-Method-Altered', '1')
        .expect(200, 'deleted everything', cb)
    })
  })

  describe('decode params', function () {
    it('should decode correct params', function (done) {
      const app = express()

      app.get('/:name', function (req, res, next) {
        res.send(req.params.name)
      })

      request(app).get('/foo%2Fbar').expect('foo/bar', done)
    })

    it('should not accept params in malformed paths', function (done) {
      const app = express()

      app.get('/:name', function (req, res, next) {
        res.send(req.params.name)
      })

      request(app).get('/%foobar').expect(400, done)
    })

    it('should not decode spaces', function (done) {
      const app = express()

      app.get('/:name', function (req, res, next) {
        res.send(req.params.name)
      })

      request(app).get('/foo+bar').expect('foo+bar', done)
    })

    it('should work with unicode', function (done) {
      const app = express()

      app.get('/:name', function (req, res, next) {
        res.send(req.params.name)
      })

      request(app).get('/%ce%b1').expect('\u03b1', done)
    })
  })

  it('should be .use()able', function (done) {
    const app = express()

    var calls = []

    app.use(function (req, res, next) {
      calls.push('before')
      next()
    })

    app.get('/', function (req, res, next) {
      calls.push('GET /')
      next()
    })

    app.use(function (req, res, next) {
      calls.push('after')
      res.json(calls)
    })

    request(app).get('/').expect(200, ['before', 'GET /', 'after'], done)
  })

  describe('when given a regexp', function () {
    it('should match the pathname only', function (done) {
      const app = express()

      app.get(/^\/user\/[0-9]+$/, function (req, res) {
        res.end('user')
      })

      request(app).get('/user/12?foo=bar').expect('user', done)
    })

    it('should populate req.params with the captures', function (done) {
      const app = express()

      app.get(/^\/user\/([0-9]+)\/(view|edit)?$/, function (req, res) {
        var id = req.params[0],
          op = req.params[1]
        res.end(op + 'ing user ' + id)
      })

      request(app).get('/user/10/edit').expect('editing user 10', done)
    })

    it('should ensure regexp matches path prefix', function (done) {
      const app = express()
      const p = []

      app.use(/\/api.*/, function (req, res, next) {
        p.push('a')
        next()
      })
      app.use(/api/, function (req, res, next) {
        p.push('b')
        next()
      })
      app.use(/\/test/, function (req, res, next) {
        p.push('c')
        next()
      })
      app.use(function (req, res) {
        res.end()
      })

      request(app)
        .get('/test/api/1234')
        .expect(200, function (err) {
          if (err) return done(err)
          assert.deepEqual(p, ['c'])
          done()
        })
    })
  })

  describe('case sensitivity', function () {
    it('should be disabled by default', function (done) {
      const app = express()

      app.get('/user', function (req, res) {
        res.end('tj')
      })

      request(app).get('/USER').expect('tj', done)
    })

    describe('when "case sensitive routing" is enabled', function () {
      it('should match identical casing', function (done) {
        const app = express()

        app.enable('case sensitive routing')

        app.get('/uSer', function (req, res) {
          res.end('tj')
        })

        request(app).get('/uSer').expect('tj', done)
      })

      it('should not match otherwise', function (done) {
        const app = express()

        app.enable('case sensitive routing')

        app.get('/uSer', function (req, res) {
          res.end('tj')
        })

        request(app).get('/user').expect(404, done)
      })
    })
  })
})
