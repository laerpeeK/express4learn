'use strict'

const assert = require('assert')
const asyncHooks = require('async_hooks')
const Buffer = require('safe-buffer').Buffer
const express = require('..')
const request = require('supertest')

const describeAsyncHooks =
  typeof asyncHooks.AsyncLocalStorage === 'function' ? describe : describe.skip

describe('express.json()', function () {
  // it('should parse JSON', function (done) {
  //   request(createApp())
  //     .post('/')
  //     .set('Content-Type', 'application/json')
  //     .send('{"user":"tobi"}')
  //     .expect(200, '{"user":"tobi"}', done)
  // })
})

function createApp(options) {
  const app = express()

  app.use(express.json(options))

  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.send(
      String(
        req.headers['x-error-property']
          ? err[req.headers['x-error-property']]
          : '[' + err.type + '] ' + err.message
      )
    )
  })

  app.post('/', function (req, res) {
    res.json(req.body)
  })

  return app
}
