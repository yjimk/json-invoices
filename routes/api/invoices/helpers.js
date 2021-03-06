const fs = require('fs')
const JSONStream = require('JSONStream')
const through2 = require('through2')
const Promise = require('bluebird')
const path = require('path')

const Invoices = require(path.join(global.APP_ROOT, './routes/models')).Invoices
const Stock = require(path.join(global.APP_ROOT, './routes/models')).Stock
const Suppliers = require(path.join(global.APP_ROOT, './routes/models')).Suppliers

function processNewInvoice (path) {
  return new Promise((resolve, reject) => {
    let subtotal = 0
    fs.createReadStream(path)
      .pipe(JSONStream.parse('*.products.*'))
      .pipe(through2.obj((chunk, enc, cb) => {
        subtotal += chunk.units * chunk.unit_price
        Stock.get(chunk.product_id).run().then((stock) => {
          stock.units = stock.units + chunk.units
          stock.save().then(() => {
            cb(null, chunk)
          })
        }).catch((err) => {
          if (err.name === 'DocumentNotFoundError') {
            Stock.save({
              product_id: chunk.product_id,
              product_name: chunk.product_name,
              cost_price: chunk.unit_price,
              sale_price: Math.round(chunk.unit_price * 1.5),
              units: chunk.units
            }).then(() => {
              cb(null, chunk)
            })
          } else return reject(err)
        })
      }, () => {
        return resolve(subtotal)
      }
    ))
  })
}

function findOrCreateInvoice (path) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(path)
      .pipe(JSONStream.parse('*'))
      .pipe(through2.obj((chunk, enc, cb) => {
        if (!chunk.supplier_id) return reject('invalid')
        Suppliers.get(chunk.supplier_id).run().then().catch(() => {
          Suppliers.save({
            supplier_id: chunk.supplier_id,
            supplier_name: chunk.supplier_name
          })
        })
        Invoices.get(chunk.invoice_number).run().then((invoice) => {
          if (invoice.supplier_id === chunk.supplier_id) return reject('dupe')
          this.createInvoice(chunk)
        }).catch(() => {
          this.createInvoice(chunk)
          return resolve({ invoice_number: chunk.invoice_number })
        })
      }
    ))
  })
}

function updateSubtotal (subtotal, invoiceNumber) {
  Invoices.get(invoiceNumber).run().then((invoice) => {
    invoice.subtotal = subtotal
    invoice.save()
  })
}

function createInvoice (data) {
  Invoices.save({
    invoice_number: data.invoice_number,
    supplier_id: data.supplier_id,
    subtotal: 0,
    products: data.products
  })
}

function fetchAll () {
  return new Promise((resolve, reject) => {
    Invoices.getJoin({supplier: true}).run().then((invoices) => {
      resolve(invoices)
    }).catch((err) => {
      reject(err)
    })
  })
}

module.exports = {
  processNewInvoice: processNewInvoice,
  findOrCreateInvoice: findOrCreateInvoice,
  updateSubtotal: updateSubtotal,
  createInvoice: createInvoice,
  fetchAll: fetchAll
}
