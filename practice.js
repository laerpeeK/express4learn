const express = require('./index')

const app = express()

let n = 0

app.all('/*', function (req, res, next) {
  if (n++) return console.error(new Error('DELETE called several times'))
  next()
})
app.listen(3000, () => {
  console.log('the server is running at port 3000')
})
