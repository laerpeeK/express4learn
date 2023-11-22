'use strict'

const assert = require('assert')
const Buffer = require('safe-buffer').Buffer
const express = require('..')
const path = require('path')
const request = require('supertest')
const utils = require('./support/utils')

const fixtures = path.join(__dirname, '/fixtures')
const relative = path.relative(process.cwd(), fixtures)

const skipRelative =
  ~relative.indexOf('..') || path.resolve(relative) === relative

describe('express.static()', function () {
  describe('basic operations', function () {
    before(function () {
      this.app = createApp()
    })

    it('should require root path', function () {
      assert.throws(express.static.bind(), /root path required/)
    })

    it('should require root path to be string', function () {
      assert.throws(express.static.bind(null, 42), /root path.*string/)
    })

    it('should serve static files', function (done) {
      request(this.app).get('/todo.txt').expect(200, '- groceries', done)
    })
  })
})

function createApp(dir, options, fn) {
  const app = express()
  const root = dir || fixtures

  app.use(express.static(root, options))

  app.use(function (req, res, next) {
    res.sendStatus(404)
  })
  return app
}
