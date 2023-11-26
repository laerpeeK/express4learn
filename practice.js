const express = require('./index.js')
const app = express()
const path = require('path')

app.use(
  express.static(path.join(__dirname, './test/fixtures'), { reirect: true })
)

app.listen(3000, () => {
  console.log('server running...')
})