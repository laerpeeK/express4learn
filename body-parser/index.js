const deprecate = require('depd')('body-parser')
const parsers = Object.create(null)

function bodyParser(options) {
  // use default type for parsers
  const opts = Object.create(options || null, {
    type: {
      configurable: true,
      enumerable: true,
      value: undefined,
      writable: true,
    },
  })

  
}
