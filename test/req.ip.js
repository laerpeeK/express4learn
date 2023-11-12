'use strict'

const express = require('..')
const request = require('supertest')

describe('req', function () {
  describe('.ip', function () {
    describe('when X-Forward-For is present', function () {
      describe('when "trust proxy" is enabled', function () {
        it('should return the client addr', function (done) {
          const app = express()
          app.enable('trust proxy')

          app.use(function (req, res) {
            res.send(req.ip)
          })

          request(app)
            .get('/')
            .set('X-Forwarded-For', 'client, p1, p2')
            .expect('client', done)
        })

        it('should return the addr after trusted proxy based on count', function (done) {
          const app = express()

          app.set('trust proxy', 2)

          app.use(function (req, res) {
            res.send(req.ip)
          })

          request(app)
            .get('/')
            .set('X-Forwarded-For', 'client, p1, p2')
            .expect('p1', done)
        })

        it('should return the addr after trusted proxy based on list', function (done) {
          const app = express()
          app.set('trust proxy', '10.0.0.1, 10.0.0.2, 127.0.0.1, ::1')

          app.use(function (req, res) {
            res.send(req.ip)
          })

          request(app)
            .get('/')
            .set('X-Forwarded-For', '10.0.0.2, 10.0.0.3, 10.0.0.1', '10.0.0.4')
            .expect('10.0.0.3', done)
        })

        it('should return the addr after trusted proxy, from sub app', function (done) {
          const app = express()
          const sub = express()

          app.set('trust proxy', 2)
          app.use(sub)

          sub.use(function (req, res) {
            res.send(req.ip)
          })

          request(app)
            .get('/')
            .set('X-Forwarded-For', 'client, p1, p2')
            .expect(200, 'p1', done)
        })
      })

      describe('when "trust proxy" is disabled', function () {
        it('should return the remote address', function (done) {
          const app = express()

          app.use(function (req, res) {
            res.send(req.ip)
          })

          const text = request(app).get('/')
          text.set('X-Forwarded-For', 'client, p1, p2')
          text.expect(200, getExpectedClientAddress(text._server), done)
        })
      })
    })

    describe('when X-Forwarded-For is not present', function () {
      it('should return the remote address', function (done) {
        const app = express()

        app.enable('trust proxy')

        app.use(function (req, res) {
          res.send(req.ip)
        })

        const test = request(app).get('/')
        test.expect(200, getExpectedClientAddress(test._server), done)
      })
    })
  })
})

/**
 * Get the local client address depending on AF_NET of server
 */

function getExpectedClientAddress(server) {
  return server.address().address === '::' ? '::ffff:127.0.0.1' : '127.0.0.1'
}
