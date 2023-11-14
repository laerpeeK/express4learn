const express = require('./index')
// const app = express()
const Router = express.Router

const router = new Router()

router.use(function (req, res) {
  throw new Error('should not be called')
})

router.handle({ url: '', method: 'GET' }, {}, (err) => { console.log(err)})

// app.listen(3000, () => {
//   console.log('the server is running at port 3000')
// })
