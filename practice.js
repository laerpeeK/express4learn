const express = require('./index')

const app = express()

const router = express.Router()

function fn(req, res, next) {
  res.set('X-Hit', '1')
  next('router')
}

router.get('/foo', fn, function (req, res, next) {
  res.end('failure')
})

router.get('/foo', function (req, res, next) {
  res.end('failure')
})

app.use(router)

app.get('/foo', function (req, res) {
  res.end('success')
})

app.listen(3000, () => {
  console.log('the server is running at port 3000')
})
