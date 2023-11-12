'use strict'

const express = require('..')
const request = require('supertest')
const shouldHaveHeaderValues = require('./support/utils').shouldHaveHeaderValues

describe('res', function () {
  describe('.append(field, val)', function () {
    it('should append multiple headers', function (done) {
      const app = express()

      app.use(function (req, res, next) {
        res.append('Set-Cookie', 'foo=bar')
        next()
      })

      app.use(function (req, res) {
        res.append('Set-Cookie', 'fizz=buzz')
        res.end()
      })

      request(app)
        .get('/')
        .expect(200)
        .expect(shouldHaveHeaderValues('Set-Cookie', ['foo=bar', 'fizz=buzz']))
        .end(done)
    })

    it('should accept array of values', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.append('Set-Cookie', ['foo=bar', 'fizz=buzz'])
        res.end()
      })

      request(app)
        .get('/')
        .expect(200)
        .expect(shouldHaveHeaderValues('Set-Cookie', ['foo=bar', 'fizz=buzz']))
        .end(done)
    })

    it('should get reset by res.set(field, val)', function (done) {
      const app = express()

      app.use(function (req, res, next) {
        res.append('Set-Cookie', 'foo=bar')
        res.append('Set-Cookie', 'fizz=buzz')
        next()
      })

      app.use(function (req, res) {
        res.set('Set-Cookie', 'pet=boti')
        res.end()
      })

      request(app)
        .get('/')
        .expect(200)
        .expect(shouldHaveHeaderValues('Set-Cookie', ['pet=boti']))
        .end(done)
    })

    it('should work with res.set(field, val) first', function (done) {
      const app = express()

      app.use(function (req, res, next) {
        res.set('Set-Cookie', 'foo=bar')
        next()
      })

      app.use(function (req, res) {
        res.append('Set-Cookie', 'fizz=buzz')
        res.end()
      })

      request(app)
        .get('/')
        .expect(200)
        .expect(shouldHaveHeaderValues('Set-Cookie', ['foo=bar', 'fizz=buzz']))
        .end(done)
    })

    it('should work together with res.cookie', function (done) {
      const app = express()

      app.use(function (req, res, next) {
        res.cookie('foo', 'bar')
        next()
      })

      app.use(function (req, res) {
        res.append('Set-Cookie', 'fizz=buzz')
        res.end()
      })

      request(app)
        .get('/')
        .expect(200)
        .expect(
          shouldHaveHeaderValues('Set-Cookie', ['foo=bar; Path=/', 'fizz=buzz'])
        )
        .end(done)
    })
  })
})
