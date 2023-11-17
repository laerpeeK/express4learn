const express = require('./index')

const app = express()

app.get('/users', function (req, res) {})
app.all('/users', function (req, res, next) {
  res.setHeader('x-hit', 1)
  res.send('ss')
  next()
})

app.listen(3000, () => {
  console.log('the server is running at port 3000')
})
