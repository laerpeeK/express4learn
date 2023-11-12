'use strict'

const express = require('..')
const request = require('supertest')

describe('req', function () {
  describe('.acceptsLanguages', function () {
    it('should return language if accepted', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.send({
          'en-us': req.acceptsLanguage('en-us'),
          en: req.acceptsLanguage('en'),
        })
      })

      request(app)
        .get('/')
        .set('Accept-Language', 'en;q=.5, en-us')
        .expect(200, { 'en-us': 'en-us', en: 'en' }, done)
    })

    it('should be false if language not accepted', function (done) {
      const app = express()

      app.use(function (req, res) {
        res.send({
          es: req.acceptsLanguage('es'),
        })
      })

      request(app)
        .get('/')
        .set('Accept-Language', 'en;q=.5, en-us')
        .expect(200, { es: false }, done)
    })

    describe('when Accept-Language is not present', function () {
      it('should always return language', function (done) {
        const app = express()

        app.use(function (req, res) {
          res.send({
            en: req.acceptsLanguage('en'),
            es: req.acceptsLanguage('es'),
            jp: req.acceptsLanguage('jp'),
          })
        })

        request(app)
          .get('/')
          .expect(200, { en: 'en', es: 'es', jp: 'jp' }, done)
      })
    })
  })
})
