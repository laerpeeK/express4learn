
const express = require('./')
const path = require('path')
const fixtures = path.join(__dirname, './test/fixtures')
const app = express()
const root = fixtures

app.use(express.static(root))

app.use(function (req, res, next) {
  res.sendStatus(404)
})

app.listen(3000, function () {
  console.log('running at port 3000')
})