'use strict'
const express = require('..')
const request = require('supertest')

describe('req', function () {
  describe('.acceptsCharsets(type)', function () {
    describe('when Accept-Charset is not present', function () {
      it('should return true', function (done) {
        const app = express()

        app.use(function (req, res) {
          res.end(req.acceptsCharsets('utf-8') ? 'yes' : 'no')
        })

        request(app).get('/').expect('yes', done)
      })
    })

    describe('when Accept-Charset is present', function () {
      it('should return true', function (done) {
        const app = express()

        app.use(function (req, res) {
          res.end(req.acceptsCharsets('utf-8') ? 'yes' : 'no')
        })

        request(app)
          .get('/')
          .set('Accept-Charset', 'foo, bar, utf-8')
          .expect('yes', done)
      })

      it('should return false otherwise', function (done) {
        const app = express()

        app.use(function (req, res) {
          res.end(req.acceptsCharsets('utf-8') ? 'yes' : 'no')
        })

        request(app)
          .get('/')
          .set('Accept-Charset', 'foo, bar')
          .expect('no', done)
      })
    })
  })
})
