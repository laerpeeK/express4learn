'use strict'

const assert = require('assert')
const express = require('..')

describe('config', function () {
  describe('.set()', function () {
    it('should set a value', function () {
      const app = express()
      app.set('foo', 'bar')
      assert.equal(app.get('foo'), 'bar')
    })

    it('should set prototype values', function () {
      const app = express()
      app.set('hasOwnProperty', 42)
      assert.strictEqual(app.get('hasOwnProperty'), 42)
    })

    it('should return the app', function () {
      const app = express()
      assert.equal(app.set('foo', 'bar'), app)
    })

    it('should return the app when undefined', function () {
      const app = express()
      assert.equal(app.set('foo', undefined), app)
    })

    it('should return set value', function () {
      const app = express()
      app.set('foo', 'bar')
      assert.strictEqual(app.set('foo'), 'bar')
    })

    it('should return undefined for prototype values', function () {
      const app = express()
      assert.strictEqual(app.set('hasOwnProperty'), undefined)
    })

    describe('"etag"', function () {
      it('should throw on bad value', function () {
        const app = express()
        assert.throws(app.set.bind(app, 'etag', 42), /unknown value/)
      })

      it('should set "etag fn"', function () {
        const app = express()
        const fn = function () {}
        app.set('etag', fn)
        assert.equal(app.get('etag fn'), fn)
      })
    })

    describe('"trust proxy', function () {
      it('should set "trust proxy fn"', function () {
        const app = express()
        const fn = function () {}
        app.set('trust proxy', fn)
        assert.equal(app.get('trust proxy fn'), fn)
      })
    })
  })

  describe('.get()', function () {
    it('should return undefined when unset', function () {
      const app = express()
      assert.strictEqual(app.get('foo'), undefined)
    })

    it('should return undefined for prototype values', function () {
      const app = express()
      assert.strictEqual(app.get('hasOwnProperty'), undefined)
    })

    it('should otherwise return the value', function () {
      const app = express()
      app.set('foo', 'bar')
      assert.equal(app.get('foo'), 'bar')
    })
  })

  describe('.enable()', function () {
    it('should set the value to true', function () {
      const app = express()
      assert.equal(app.enable('tobi'), app)
      assert.strictEqual(app.get('tobi'), true)
    })

    it('should set prototype values', function () {
      const app = express()
      app.enable('hasOwnProperty')
      assert.strictEqual(app.get('hasOwnProperty'), true)
    })
  })

  describe('.disable()', function () {
    it('should set the value to false', function () {
      const app = express()
      assert.equal(app.disable('tobi'), app)
      assert.strictEqual(app.get('tobi'), false)
    })

    it('should set prototype values', function () {
      var app = express()
      app.disable('hasOwnProperty')
      assert.strictEqual(app.get('hasOwnProperty'), false)
    })
  })

  describe('.enabled()', function () {
    it('should default to false', function () {
      const app = express()
      assert.strictEqual(app.enabled('foo'), false)
    })

    it('should return true when set', function () {
      const app = express()
      app.set('foo', 'bar')
      assert.strictEqual(app.enabled('foo'), true)
    })

    it('should default to false for prototype values', function () {
      const app = express()
      assert.strictEqual(app.enabled('hasOwnProperty'), false)
    })
  })

  describe('.disabled()', function () {
    it('should default to true', function () {
      const app = express()
      assert.strictEqual(app.disabled('foo'), true)
    })

    it('should return false when set', function () {
      const app = express()
      app.set('foo', 'bar')
      assert.strictEqual(app.disabled('foo'), false)
    })

    it('should default to true for prototype values', function () {
      const app = express()
      assert.strictEqual(app.disabled('hasOwnProperty'), true)
    })
  })
})
