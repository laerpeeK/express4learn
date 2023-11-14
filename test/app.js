'use strict'
const assert = require('assert')
const express = require('..')
const request = require('supertest')

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

  it('should 404 without routes', function (done) {
    request(express()).get('/').expect(404, done)
  })
})

describe('app.parent', function () {
  it('should return the parent when mounted', function () {
    const app = express()
    const blog = express()
    const blogAdmin = express()

    app.use('/blog', blog)
    blog.use('/admin', blogAdmin)

    assert(!app.parent, 'app.parent')
    assert.strictEqual(blog.parent, app)
    assert.strictEqual(blogAdmin.parent, blog)
  })
})

describe('app.mountpath', function () {
  it('should return the mounted path', function () {
    const admin = express()
    const app = express()
    const blog = express()
    const fallback = express()

    app.use('/blog', blog)
    app.use(fallback)
    blog.use('/admin', admin)

    assert.strictEqual(admin.mountpath, '/admin')
    assert.strictEqual(app.mountpath, '/')
    assert.strictEqual(blog.mountpath, '/blog')
    assert.strictEqual(fallback.mountpath, '/')
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

describe('app.path', function () {
  it('should return the canonical', function () {
    const app = express()
    const blog = express()
    const blogAdmin = express()

    app.use('/blog', blog)
    blog.use('/admin', blogAdmin)

    assert.strictEqual(app.path(), '')
    assert.strictEqual(blog.path(), '/blog')
    assert.strictEqual(blogAdmin.path(), '/blog/admin')
  })
})

describe('without NODE_ENV', function () {
  before(function () {
    this.env = process.env.NODE_ENV
    process.env.NODE_ENV = ''
  })

  after(function () {
    process.env.NODE_ENV = this.env
  })

  it('should default to development', function () {
    const app = express()
    assert.strictEqual(app.get('env'), 'development')
  })
})
