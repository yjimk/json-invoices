'use strict'

const insert = require('./controllers/insert')
const fetchAll = require('./controllers/fetch-all')

module.exports = (app) => {
  insert(app)
  fetchAll(app)
}
