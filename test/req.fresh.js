'use strict'

const express = require('../')
const request = require('supertest')

describe('req', function () {
  describe('.fresh', function () {
    it('should return true when the resourse is not modified', function (done) {
      const app = express()
      const etag = '"12345"'

      app.use(function (req, res) {
        res.set('ETag', etag)
        res.send(req.fresh)
      })

      request(app).get('/').set('If-None-Match', etag).expect(304, done)
    })

    it('should return false when the resource is modified', function (done) {
      const app = express();

      app.use(function(req, res){
        res.set('ETag', '"123"');
        res.send(req.fresh);
      });

      request(app)
      .get('/')
      .set('If-None-Match', '"12345"')
      .expect(200, 'false', done);
    })

    it('should return false without response headers', function(done){
      const app = express();

      app.disable('x-powered-by')
      app.use(function(req, res){
        res.send(req.fresh);
      });

      request(app)
      .get('/')
      .expect(200, 'false', done);
    })
  })
})
