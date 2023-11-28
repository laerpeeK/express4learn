const express = require('./index.js')
const app = express()


app.use(function (req, res, next) {
  req.on('end', next)
  req.resume()
})

app.use(express.raw())

app.use(function (err, req, res, next) {
  res.status(err.status || 500)
  res.send('[' + err.type + '] ' + err.message)
})

app.post('/', function (req, res) {
  if (Buffer.isBuffer(req.body)) {
    res.json({ buf: req.body.toString('hex') })
  } else {
    res.json(req.body)
  }
})

app.listen(3000, () => {
  console.log('server running...')
})
