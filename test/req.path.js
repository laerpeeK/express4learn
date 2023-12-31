'use strict'

const express = require('..')
const request = require('supertest')

describe('req', function () {
  describe('.path', function () {
    it('should reutrn the parsed pathname', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.end(req.path)
      })

      request(app)
        .get('/login?redirect=/post/1/comments')
        .expect('/login', done)
    })
  })
})
