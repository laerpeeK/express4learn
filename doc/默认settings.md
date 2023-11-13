{
  "x-powered-by": true,
  etag: "weak",
  "etag fn": function generateETag(body, encoding) {
    const buf = !Buffer.isBuffer(body) ? Buffer.from(body, encoding) : body
    
    return etag(buf, options)
  },
  env: "development",
  "query parser": "extended",
  "query parser fn": function parseExtendedQueryString(str) {
    return qs.parse(str, {
      allowPrototypes: true,
    })
  },
  "subdomain offset": 2,
  "trust proxy": false,
  "trust proxy fn": function trustNone () {
    return false
  },
  "jsonp callback name": "callback",
}