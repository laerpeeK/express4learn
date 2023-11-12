const http = require('node:http')

const server = http.createServer((req, res) => {
  console.log(req)
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\n');

  console.log('sss')
})

server.listen(3000, () => {
  console.log('server is running at port 3000')
})
