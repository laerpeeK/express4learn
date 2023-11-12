/**
 * Module dependencies.
 * @private
 */

const assert = require('node:assert')

/**
 * Module exports.
 * @public
 */

exports.shouldNotHaveHeader = shouldNotHaveHeader
exports.shouldHaveHeaderValues = shouldHaveHeaderValues
exports.shouldNotHaveBody = shouldNotHaveBody

/**
 * Assert that a supertest response does not have a header
 *
 * @param {String} header Header name to check
 * @returns {Function}
 */

function shouldNotHaveHeader(header) {
  return function (res) {
    assert.ok(
      !(header.toLowerCase() in res.headers),
      'should not have header ' + header
    )
  }
}

/**
 *
 * @param {String} key
 * @param {[String]} values
 * @returns
 */
function shouldHaveHeaderValues(key, values) {
  return function (res) {
    const headers = res.headers[key.toLowerCase()]
    assert.ok(headers, 'should have header "' + key + '"')
    assert.strictEqual(
      headers.length,
      values.length,
      'should have ' + values.length + ' occurances of "' + key + '"'
    )

    for (let i = 0; i < values.length; i++) {
      assert.strictEqual(headers[i], values[i])
    }
  }
}
/**
 * Asserts that a supertest response does not have a body.
 *
 * @returns {Function}
 */

function shouldNotHaveBody() {
  return function (res) {
    assert.ok(res.text === '' || res.text === undefined)
  }
}
