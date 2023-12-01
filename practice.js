const express = require('./index.js')
const app = express()

app.use(express.json())

app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.send(
    String(
      req.headers['x-error-property']
        ? err[req.headers['x-error-property']]
        : '[' + err.type + '] ' + err.message
    )
  )
})

app.post('/', function (req, res) {
  res.json(req.body)
})

app.listen(3000, () => {
  console.log('server running...')
})
