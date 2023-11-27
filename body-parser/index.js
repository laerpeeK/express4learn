const parsers = Object.create(null)

Object.defineProperty(exports, 'json', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('json'),
})

Object.defineProperty(exports, 'raw', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('raw'),
})

Object.defineProperty(exports, 'text', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('text'),
})

Object.defineProperty(exports, 'urlencoded', {
  configurable: true,
  enumerable: true,
  get: createParserGetter('urlencoded'),
})

/**
 * Create a getter for loading a parser.
 *
 * @param {String} name
 * @private
 */
function createParserGetter(name) {
  return function get() {
    return loadParser(name)
  }
}

/**
 * Load a parser module.
 * 
 * @param {String} parserName 
 * @private
 */

function loadParser(parserName) {
  let parser = parsers[parserName]

  if (parser !== undefined) {
    return parser
  }

  // this uses a switch for static require analysis
  switch (parserName) {
    case 'json':
      parser = require('./lib/types/json')
      break
    case 'raw':
      parser = require('./lib/types/raw')
      break
    case 'text':
      parser = require('./lib/types/text')
      break
    case 'urlencoded':
      parser = require('./lib/types/urlencoded')
      break
  }

  // store to prevent invoking require()
  return (parsers[parserName] = parser)
}
