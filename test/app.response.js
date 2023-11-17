'use strict'

const after = require('after')
const express = require('../')
const request = require('supertest')

describe('app', function () {
  describe('.response', function () {
    it('should extend the response prototype', function (done) {
      const app = express()
      app.response.shout = function (str) {
        this.send(str.toUpperCase())
      }

      app.use(function (req, res) {
        res.shout('hey')
      })

      request(app).get('/').expect('HEY', done)
    })

    it('should only extend for the referenced app', function (done) {
      const app1 = express()
      const app2 = express()
      const cb = after(2, done)

      app1.response.shout = function (str) {
        this.send(str.toUpperCase())
      }

      app1.get('/', function (req, res) {
        res.shout('foo')
      })

      app2.get('/', function (req, res) {
        res.shout('foo')
      })

      request(app1).get('/').expect(200, 'FOO', cb)

      request(app2)
        .get('/')
        .expect(500, /(?:not a function|has no method)/, cb)
    })

    it('should inherit to sub apps', function (done) {
      const app1 = express()
      const app2 = express()
      const cb = after(2, done)

      app1.response.shout = function (str) {
        this.send(str.toUpperCase())
      }

      app1.use('/sub', app2)

      app1.get('/', function (req, res) {
        res.shout('foo')
      })

      app2.get('/', function (req, res) {
        res.shout('foo')
      })

      request(app1).get('/').expect(200, 'FOO', cb)

      request(app1).get('/sub').expect(200, 'FOO', cb)
    })

    it('should allow sub app to override', function (done) {
      const app1 = express()
      const app2 = express()
      const cb = after(2, done)

      app1.response.shout = function (str) {
        this.send(str.toUpperCase())
      }

      app2.response.shout = function (str) {
        this.send(str + '!')
      }

      app1.use('/sub', app2)

      app1.get('/', function (req, res) {
        res.shout('foo')
      })

      app2.get('/', function (req, res) {
        res.shout('foo')
      })

      request(app1).get('/').expect(200, 'FOO', cb)

      request(app1).get('/sub').expect(200, 'foo!', cb)
    })

    it('should not pollute parent app', function (done) {
      const app1 = express()
      const app2 = express()
      const cb = after(2, done)

      app1.response.shout = function (str) {
        this.send(str.toUpperCase())
      }

      app2.response.shout = function (str) {
        this.send(str + '!')
      }

      app1.use('/sub', app2)

      app1.get('/sub/foo', function (req, res) {
        res.shout('foo')
      })

      app2.get('/', function (req, res) {
        res.shout('foo')
      })

      request(app1).get('/sub').expect(200, 'foo!', cb)

      request(app1).get('/sub/foo').expect(200, 'FOO', cb)
    })
  })
})
