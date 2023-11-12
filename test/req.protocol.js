'use strict'

const express = require('..')
const request = require('supertest')

describe('req', function () {
  describe('.protocol', function () {
    it('should return the protocol string', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.end(req.protocol)
      })

      request(app).get('/').expect('http', done)
    })
  })

  describe('when "trust proxy" is enabled', function () {
    it('should respect X-Forwarded-Proto', function (done) {
      const app = express()

      app.enable('trust proxy')

      app.use(function (req, res) {
        res.end(req.protocol)
      })

      request(app)
        .get('/')
        .set('X-Forwarded-Proto', 'https')
        .expect('https', done)
    })
  })
})
