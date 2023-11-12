'use strict'
const assert = require('assert')
const express = require('..')

describe('app', function () {
  it('should inherit from event emitter', function (done) {
    const app = express()
    app.on('foo', done)
    app.emit('foo')
  })

  it('should be callable', function () {
    const app = express()
    assert.equal(typeof app, 'function')
  })
})

describe('app.router', function () {
  it('should throw with notice', function (done) {
    const app = express()

    try {
      app.router
    } catch (err) {
      done()
    }
  })
})

describe('without NODE_ENV', function () {
  before(function() {
    this.env = process.env.NODE_ENV
    process.env.NODE_ENV = ''
  })

  after(function() {
    process.env.NODE_ENV = this.env
  })

  it('should default to development', function () {
    const app = express()
    assert.strictEqual(app.get('env'), 'development')
  })
})