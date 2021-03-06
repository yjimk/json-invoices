'use strict'

const path = require('path')
const invoices = require('./api/invoices')
const stock = require('./api/stock')
const suppliers = require('./api/suppliers')

module.exports = (app, router) => {
  invoices(app)
  stock(app)
  suppliers(app)

  app.use('/', router)
  // Set our main route - All traffic set to receive /public/index.html
  router.get('*', (req, res) => {
    res.sendFile(path.join(global.APP_ROOT, '/public/index.html'))
  })
}
