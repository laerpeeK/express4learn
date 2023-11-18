const express = require('./index')

const app = express()

app.use('/foo', function (req, res) {
  res.send('saw ' + req.method + ' ' + req.url)
})

app.listen(3000, () => {
  console.log('the server is running at port 3000')
})
