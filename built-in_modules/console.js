const http = require('node:http')

console.log(http.METHODS.map(item => item.toLowerCase()))
console.log(http.STATUS_CODES)