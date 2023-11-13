const express = require('./index')
const app = express()

app.use(function (req, res, next) {
  console.log('first middleware fn')
  next()
})

// app.use(function (req, res, next) {
//   console.log('second middleware fn')
//   next(new Error('middleware fn error'))
// })

// app.use(function (err, req, res, next) {
//   console.log('error middleware fn', err)
//   res.end(err.message)
// })

app.listen(3000, () => {
  console.log('the server is running at port 3000')
})
