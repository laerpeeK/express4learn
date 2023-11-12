'use strict'

const express = require('../')

describe('app.listen()', function () {
  it('should wrap with an HTTP server', function (done) {
    const app = express()

    const server = app.listen(9999, function () {
      server.close()
      done()
    })
  })
})