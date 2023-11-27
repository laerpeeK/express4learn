'use strict'

const assert = require('assert')
const express = require('../')
const Buffer = require('safe-buffer').Buffer
const request = require('supertest')

describe('express.raw()', function () {
  before(function () {
    this.app = createApp()
  })

  it('should parse application/octet-stream', function (done) {
    request(this.app)
      .post('/')
      .set('Content-Type', 'application/octet-stream')
      .send('the user is tobi')
      .expect(200, { buf: '746865207573657220697320746f6269' }, done)
  })
})

function createApp(options) {
  const app = express()
  app.use(express.raw(options))

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
    if (Buffer.isBuffer(req.body)) {
      res.json({ buf: req.body.toString('hex') })
    } else {
      res.json(req.body)
    }
  })

  return app
}
