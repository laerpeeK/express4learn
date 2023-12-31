'use strict'

const express = require('..')
const request = require('supertest')

describe('res', function () {
  describe('.get(field)', function () {
    it('should get the response header field', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.setHeader('Content-Type', 'text/x-foo')
        res.end(res.get('Content-Type'))
      })

      request(app).get('/').expect(200, 'text/x-foo', done)
    })
  })
})
