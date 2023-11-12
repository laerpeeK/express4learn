'use strict'

const express = require('..')
const request = require('supertest')
const utils = require('./support/utils')
const assert = require('node:assert')

describe('res', function () {
  describe('.jsonp(object)', function () {
    it('should respond with jsonp', function (done) {
      const app = express()
      app.use(function (req, res) {
        res.jsonp({ count: 1 })
      })

      request(app)
        .get('/?callback=something')
        .expect('Content-Type', 'text/javascript; charset=utf-8')
        .expect(200, /something\(\{"count":1\}\);/, done)
    })

    it('should use first callback parameter with jsonp', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.jsonp({ count: 1 })
      })

      request(app)
        .get('/?callback=something&callback=somethingelse')
        .expect('Content-Type', 'text/javascript; charset=utf-8')
        .expect(200, /something\(\{"count":1\}\);/, done)
    })

    it('should ignore object callback parameter with jsonp', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.jsonp({ count: 1 })
      })

      request(app)
        .get('/?callback[a]=something')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, '{"count":1}', done)
    })

    it('should allow renaming callback', function (done) {
      const app = express()

      app.set('jsonp callback name', 'clb')
      app.use(function (req, res) {
        res.jsonp({ count: 1 })
      })

      request(app)
        .get('/?clb=something')
        .expect('Content-Type', 'text/javascript; charset=utf-8')
        .expect(200, /something\(\{"count":1\}\);/, done)
    })

    it('should allow []', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.jsonp({ count: 1 })
      })

      request(app)
        .get('/?callback=callbacks[123]')
        .expect('Content-Type', 'text/javascript; charset=utf-8')
        .expect(200, /callbacks\[123\]\(\{"count":1\}\);/, done)
    })

    it('should disallow arbitrary js', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.jsonp({})
      })

      request(app)
        .get('/?callback=foo;bar()')
        .expect('Content-Type', 'text/javascript; charset=utf-8')
        .expect(200, /foobar\(\{\}\);/, done)
    })

    it('should escape utf whitespace', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.jsonp({ str: '\u2028 \u2029 woot' })
      })

      request(app)
        .get('/?callback=foo')
        .expect('Content-Type', 'text/javascript; charset=utf-8')
        .expect(200, /foo\(\{"str":"\\u2028 \\u2029 woot"\}\);/, done)
    })

    it('should not escape utf whitespace for json fallback', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.jsonp({ str: '\u2028 \u2029 woot' })
      })

      request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(200, '{"str":"\u2028 \u2029 woot"}', done)
    })

    it('should include security header and prologue', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.jsonp({ count: 1 })
      })

      request(app)
        .get('/?callback=something')
        .expect('Content-Type', 'text/javascript; charset=utf-8')
        .expect('X-Content-Type-Options', 'nosniff')
        .expect(200, /^\/\*\*\//, done)
    })

    it('should not override previous Content-Types with no callback', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.type('application/vnd.example+json')
        res.jsonp({ hello: 'world' })
      })

      request(app)
        .get('/')
        .expect('Content-Type', 'application/vnd.example+json; charset=utf-8')
        .expect(utils.shouldNotHaveHeader('X-Content-Type-Options'))
        .expect(200, '{"hello":"world"}', done)
    })

    it('should override previous Content-Types with callback', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.type('application/vnd.example+json')
        res.jsonp({ hello: 'world' })
      })

      request(app)
        .get('/?callback=cb')
        .expect('Content-Type', 'text/javascript; charset=utf-8')
        .expect('X-Content-Type-Options', 'nosniff')
        .expect(200, /cb\(\{"hello":"world"\}\);$/, done)
    })

    describe('when given undefined', function () {
      it('should invoke callback with no arguments', function (done) {
        const app = express()

        app.use(function (req, res) {
          res.jsonp(undefined)
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(\)/, done)
      })
    })

    describe('when given null', function () {
      it('should invoke callback with null', function (done) {
        const app = express()

        app.use(function (req, res) {
          res.jsonp(null)
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(null\)/, done)
      })
    })

    describe('when given a string', function () {
      it('should invoke callback with a string', function (done) {
        const app = express()

        app.use(function (req, res) {
          res.jsonp('tobi')
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\("tobi"\)/, done)
      })
    })

    describe('when given a number', function () {
      it('should invoke callback with a number', function (done) {
        const app = express()

        app.use(function (req, res) {
          res.jsonp(42)
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(42\)/, done)
      })
    })

    describe('when given an array', function () {
      it('should invoke callback with an array', function (done) {
        const app = express()

        app.use(function (req, res) {
          res.jsonp(['foo', 'bar', 'baz'])
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(\["foo","bar","baz"\]\)/, done)
      })
    })

    describe('when given an object', function () {
      it('should invoke callback with an object', function (done) {
        const app = express()

        app.use(function (req, res) {
          res.jsonp({ name: 'tobi' })
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(\{"name":"tobi"\}\)/, done)
      })
    })

    describe('"json escape" setting', function () {
      it('should be undefined by default', function () {
        const app = express()
        assert.strictEqual(app.get('json escape'), undefined)
      })

      it('should unicode escape HTML-sniffing characters', function (done) {
        const app = express()

        app.enable('json escape')

        app.use(function (req, res) {
          res.jsonp({ '&': '\u2028<script>\u2029' })
        })

        request(app)
          .get('/?callback=foo')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(
            200,
            /foo\({"\\u0026":"\\u2028\\u003cscript\\u003e\\u2029"}\)/,
            done
          )
      })

      it('should not break undefined escape', function (done) {
        const app = express()

        app.enable('json escape')

        app.use(function (req, res) {
          res.jsonp(undefined)
        })

        request(app)
          .get('/?callback=cb')
          .expect('Content-Type', 'text/javascript; charset=utf-8')
          .expect(200, /cb\(\)/, done)
      })
    })

    describe('"json replacer" setting', function () {
      it('should be passed to JSON.stringify()', function (done) {
        const app = express()

        app.set('json replacer', function (key, val) {
          return key[0] === '_' ? undefined : val
        })

        app.use(function (req, res) {
          res.jsonp({ name: 'tobi', _id: 12345 })
        })

        request(app)
          .get('/')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200, '{"name":"tobi"}', done)
      })
    })

    describe('"json spaces" setting', function () {
      it('should be undefined by default', function () {
        const app = express()
        assert(undefined === app.get('json spaces'))
      })

      it('should be passed to JSON.stringify()', function (done) {
        const app = express()

        app.set('json spaces', 2)

        app.use(function (req, res) {
          res.jsonp({ name: 'tobi', age: 2 })
        })

        request(app)
          .get('/')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200, '{\n  "name": "tobi",\n  "age": 2\n}', done)
      })
    })
  })

  describe('.jsonp(status, object)', function () {
    it('should respond with json and set the .statusCode', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.jsonp(201, { id: 1 })
      })

      request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(201, '{"id":1}', done)
    })
  })

  describe('.jsonp(object, status)', function () {
    it('should respond with json and set the .statusCode for backwards compat', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.jsonp({ id: 1 }, 201)
      })

      request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(201, '{"id":1}', done)
    })

    it('should use status as second number for backwards compat', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.jsonp(200, 201)
      })

      request(app)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(201, '200', done)
    })
  })

  it('should not override previous Content-Types', function (done) {
    const app = express()

    app.use(function (req, res) {
      res.type('application/vnd.example+json')
      res.jsonp({ hello: 'world' })
    })

    request(app)
      .get('/')
      .expect('content-type', 'application/vnd.example+json; charset=utf-8')
      .expect(200, '{"hello":"world"}', done)
  })
})
