const express = require('express')
const app = express()
const cors = require('cors')
const fetch = require('node-fetch')
const parseXML = require('xml2js').parseString;
const path = require('path')
const key = process.env.API_KEY

app.use(cors())

app.use(express.static(path.join(__dirname, 'public')))

app.get('/books', (req, res) => {
  const goodReadsEndpoint = `https://www.goodreads.com/search/index.xml?key=${key}`
  const page = req.query.page ? `&page=${req.query.page}` : ''
  const query = req.query.q ? `&q=${req.query.q}` : ''
  const endpoint = goodReadsEndpoint + query + page

  fetch(endpoint).then(response => {
    return response.text()
  }).then(text => {

    return new Promise((resolve, reject) => {
      parseXML(text, (err, result) => {
        if(err) reject(err)
        resolve(result)
      })
    })

  }).then(result => {

    const goodreads = result.GoodreadsResponse
    const works = goodreads.search[0].results[0].work

    const books = works ? works.map(book => {
      return {
        title: book.best_book[0].title[0],
        author: book.best_book[0].author[0].name[0],
        image: book.best_book[0].image_url[0],
        rating: book.average_rating[0]
      }
    }) : []

    const results = {
      page: req.query.page == "undefined" ? 1 : req.query.page,
      query: req.query.q,
      start: parseInt(goodreads.search[0]['results-start'][0]),
      end: parseInt(goodreads.search[0]['results-end'][0]),
      total: parseInt(goodreads.search[0]['total-results'][0]),
      books: books
    }

    res.status(200).json(results)

  }).catch(err => {
    res.status(500).send({ message: 'There was a problem processing your request.' })
  })

});

app.get('/', (req,res) => {
  res.status(200).sendFile(path.join(__dirname, '/index.html'))
})

app.listen(3000, ()=> console.log('Server started on port 3000'))
