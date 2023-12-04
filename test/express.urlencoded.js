'use strict'

const assert = require('assert')
const express = require('..')
const request = require('supertest')

describe('express.urlencoded', function () {
  before(function () {
    this.app = createApp()
  })

  it('should parse x-www-form-urlencoded', function (done) {
    request(this.app)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('user=tobi')
      .expect(200, '{"user":"tobi"}', done)
  })
})

function createApp(options) {
  const app = express()

  app.use(express.urlencoded(options))

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
