'use strict'

const assert = require('assert')
const express = require('../')
const request = require('supertest')

describe('middleware', function () {
  describe('.next()', function () {
    it('should behave like connect', function (done) {
      const app = express()
      const calls = []

      app.use(function (req, res, next) {
        calls.push('one')
        next()
      })

      app.use(function (req, res, next) {
        calls.push('two')
        next()
      })

      app.use(function (req, res) {
        let buf = ''
        res.setHeader('Content-Type', 'application/json')
        req.setEncoding('utf8')
        req.on('data', function (chunk) {
          buf += chunk
        })
        req.on('end', function () {
          res.end(buf)
        })
      })

      request(app)
        .get('/')
        .set('Content-Type', 'application/json')
        .send('{"foo":"bar"}')
        .expect('Content-Type', 'application/json')
        .expect(function () {
          assert.deepEqual(calls, ['one', 'two'])
        })
        .expect(200, '{"foo":"bar"}', done)
    })
  })
})
