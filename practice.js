const express = require('./index')

const app = express()

app.param('user', function (req, res, next, user) {
  if (user === 'foo') throw new Error('err!')
  req.user = user
  next()
})

app.get('/:user/bob', function (req, res, next) {
  next()
})
app.get('/foo/:user', function (req, res, next) {
  next()
})

app.use(function (err, req, res, next) {
  res.status(500)
  res.send(err.message)
})

app.listen(3000, () => {
  console.log('the server is running at port 3000')
})
