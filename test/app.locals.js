'use strict'

const assert = require('assert')
const express = require('..')

describe('app', function () {
  describe('.locals', function () {
    it('should default object', function () {
      const app = express()
      assert.ok(app.locals)
      assert.strictEqual(typeof app.locals, 'object')
    })

    describe('.settings', function () {
      it('should contain app settings ', function () {
        const app = express()
        app.set('title', 'Express')
        assert.ok(app.locals.settings)
        assert.strictEqual(typeof app.locals.settings, 'object')
        assert.strictEqual(app.locals.settings, app.settings)
        assert.strictEqual(app.locals.settings.title, 'Express')
      })
    })
  })
})
