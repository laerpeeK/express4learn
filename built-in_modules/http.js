const http = require('node:http')

const server = http.createServer()
server.listen(() => {
  console.log(server.address().port)
})