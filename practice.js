const express = require('./index')

const app = express()

app.param('user', function (req, res, next, user) {
  req.params.user = 'loki'
  next()
})

app.get('/:user', function (req, res, next) {
  next('route')
})
app.get('/:user', function (req, res, next) {
  res.send(req.params.user)
})

app.listen(3000, () => {
  console.log('the server is running at port 3000')
})
