'use strict'

const assert = require('assert')
const express = require('../')
const request = require('supertest')

describe('app', function () {
  describe('.param(fn)', function () {
    it('should map app.param(name, ...) logic', function (done) {
      const app = express()

      app.param(function (name, regexp) {
        if (Object.prototype.toString.call(regexp) === '[object RegExp]') {
          return function (req, res, next, val) {
            let captures
            if ((captures = regexp.exec(String(val)))) {
              req.params[name] = captures[1]
              next()
            } else {
              next('route')
            }
          }
        }
      })

      app.param(':name', /^([a-zA-Z]+)$/)

      app.get('/user/:name', function (req, res) {
        res.send(req.params.name)
      })

      request(app)
        .get('/user/tj')
        .expect(200, 'tj', function (err) {
          if (err) return done(err)
          request(app).get('/user/123').expect(404, done)
        })
    })

    it('should fail if not given fn', function () {
      const app = express()
      assert.throws(app.param.bind(app, ':name', 'bob'))
    })
  })

  describe('.param(name, fn)', function () {
    it('should map the array', function (done) {
      const app = express()

      app.param(['id', 'uid'], function (req, res, next, id) {
        id = Number(id)
        if (isNaN(id)) return next('route')
        req.params.id = id
        next()
      })

      app.get('/post/:id', function (req, res) {
        const id = req.params.id
        res.send(typeof id + ':' + id)
      })

      app.get('/user/:uid', function (req, res) {
        const id = req.params.id
        res.send(typeof id + ':' + id)
      })

      request(app)
        .get('/user/123')
        .expect(200, 'number:123', function (err) {
          if (err) return done(err)
          request(app).get('/post/123').expect('number:123', done)
        })
    })
  })

  describe('.param(name, fn)', function () {
    it('should map logic for a single param', function (done) {
      const app = express()

      app.param('id', function (req, res, next, id) {
        id = Number(id)
        if (isNaN(id)) return next('route')
        req.params.id = id
        next()
      })

      app.get('/user/:id', function (req, res) {
        const id = req.params.id
        res.send(typeof id + ':' + id)
      })

      request(app).get('/user/123').expect(200, 'number:123', done)
    })

    it('should only call once per request', function (done) {
      const app = express()
      let called = 0
      let count = 0

      app.param('user', function (req, res, next, user) {
        called++
        req.user = user
        next()
      })

      app.get('/foo/:user', function (req, res, next) {
        count++
        next()
      })
      app.get('/foo/:user', function (req, res, next) {
        count++
        next()
      })

      app.use(function (req, res) {
        res.end([count, called, req.user].join(' '))
      })

      request(app).get('/foo/bob').expect('2 1 bob', done)
    })

    it('should call when values differ', function (done) {
      const app = express()
      let called = 0
      let count = 0

      app.param('user', function (req, res, next, user) {
        called++
        req.users = (req.users || []).concat(user)
        next()
      })

      app.get('/:user/bob', function (req, res, next) {
        count++
        next()
      })

      app.get('/foo/:user', function (req, res, next) {
        count++
        next()
      })

      app.use(function (req, res) {
        res.end([count, called, req.users.join(',')].join(' '))
      })

      request(app).get('/foo/bob').expect('2 2 foo,bob', done)
    })

    it('should support altering req.params across routes', function (done) {
      const app = express()

      app.param('user', function (req, res, next, user) {
        req.params.user = 'loki'
        next()
      })

      app.get('/:user', function (req, res, next) {
        next('route')
      })
      app.get('/:user', function (req, res, next) {
        res.send(req.params.user)
      })

      request(app).get('/bob').expect('loki', done)
    })
  })
})
