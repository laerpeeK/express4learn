const express = require('./index')

const app = express()
const blog = express()

app.use('/admin', blog)
blog.use(function (req, res, next) {
  console.log(req.baseUrl, req.url, req.originalUrl)
  res.send('helo')
})

app.listen(3000, () => {
  console.log('the server is running at port 3000')
})
