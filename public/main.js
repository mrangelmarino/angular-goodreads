// instantiate application
const GoodReads = angular.module('GoodReads', [])

// Services
class GoodReadsAPI {

  constructor($http) {
    this.$http = $http
  }

  searchBooks(term, page) {
    return this.$http({
      method: 'GET',
      url: `https://goodreads-api-ob7wr6mtl31i.runkit.sh/books?q=${term}&page=${page}`
    })
  }

}

// Controllers
class SearchController {

  constructor($scope, Store, goodReadsAPI) {
    this.state = Store.get()
    this.api = goodReadsAPI
    this.store = Store
    this.$scope = $scope
  }

  clearSearch() {
    this.store.set({
      books: [],
      searching: false,
      message: ''
    })
  }

  searchError(err) {
    this.$scope.$apply(() => this.store.set({
      query: this.state.query,
      page: 1,
      total: 0,
      books: [],
      searching: false,
      message: err.data.message
    }))
  }

  applySearchResults(response) {
    // only apply if there aren't any pending searches and the search hasn't been previously cleared
    if(this.state.query && this.state.searches == 0) {
      // guard against remote possibility of server latency beating out search throttle
      if(this.state.query == response.data.query) {

        this.$scope.$apply(() => {
          this.store.set({
            query: this.state.query,
            page: response.data.page,
            total: Math.ceil(response.data.total/20),
            books: response.data.books,
            searching: false,
            message: response.data.books.length ? '' : 'No books found matching your search term.'
          })
        })

      } else {

        this.search(this.state.query, this.state.page)

      }

    }
  }

  async search() {
    if(this.state.query) {
      try {

        this.store.set({
          searches: this.state.searches + 1
        })

        const response = await this.api.searchBooks(this.state.query, this.state.page)

        this.store.set({
          searches: this.state.searches - 1
        })

        this.applySearchResults(response)

      } catch(err) {
        this.searchError(err)
      }
    }
  }

}

class SearchFormController {

  constructor($timeout, Store) {
    this.state = Store.get()
    this.store = Store
    this.$onInit = () => {
      this.search = this.parent.search.bind(this.parent)
      this.clearSearch = this.parent.clearSearch.bind(this.parent)
    }
    this.$timeout = $timeout
    this.timer = null
  }

  startSearch() {
    this.store.set({
      page: 1,
      query: this.query,
      searching: true
    })

    this.$timeout.cancel(this.timer)

    if(this.state.query === '') {
      this.clearSearch()
    } else {
      this.timer = this.$timeout(this.search, 500)
    }
  }

}

class PaginationController {
  constructor($window, Store) {
    this.state = Store.get()
    this.store = Store
    this.$onInit = () => {
      this.search = this.parent.search.bind(this.parent)
    }
    this.$window = $window
  }

  pageUp() {
    const nextPage = parseInt(this.state.page) + 1
    const shouldPaginate = nextPage < this.state.total

    if(shouldPaginate) {
      this.$window.scrollTo(0,0)
      this.store.set({
        page: nextPage,
        searching: true
      })
      this.search()
    }
  }

  pageDown() {
    const nextPage = parseInt(this.state.page) - 1
    const shouldPaginate = nextPage > 0

    if(shouldPaginate) {
      this.$window.scrollTo(0,0)
      this.store.set({
        page: nextPage,
        searching: true
      })
      this.search()
    }
  }

}

// Create redux-style Store
GoodReads.factory('Store', () => {
  const state = {
    data: {
      query: '',
      page: 1,
      books: [],
      total: 0,
      searching: false,
      searches: 0,
      message: ''
    }
  }

  return {
    get() {
      return state.data
    },

    set(data) {
      Object.assign(state.data, data)
    }
  }
})

GoodReads.service('goodReadsAPI', GoodReadsAPI)

GoodReads.component('search', {
  template:
  `<h1>GoodReads DB Search</h1>
  <search-form></search-form>
  <pagination ng-if="!vm.state.searching"></pagination>
  <p class="message" ng-if="vm.state.message">{{ vm.state.message }}<p>
  <div class="book-list-container">
    <book-list ng-if="!vm.state.searching"></book-list>
  </div>
  <pagination ng-if="!vm.state.searching"></pagination>
  <div class="spinner" ng-if="vm.state.searching"></div>`,
  controller: SearchController,
  controllerAs: 'vm'
})

GoodReads.component('searchForm', {
  template:
  `<input placeholder="Search GoodReads"
    type="text"
    ng-keyup="vm.startSearch()"
    ng-model="vm.query" />`,
  bindings: {
    query: '<'
  },
  require: {
    parent: '^search'
  },
  controller: SearchFormController,
  controllerAs: 'vm'
})

GoodReads.component('pagination', {
  template:
  `<p ng-if="vm.state.books.length">
    <span class="message">Currently viewing page {{ vm.state.page }} of {{ vm.state.total }}.</span>
    <span>
      <button ng-click="vm.pageDown()">Previous Page</button>
      <button ng-click="vm.pageUp()">Next Page</button>
    </span>
  </p>`,
  require: {
    parent: '^search'
  },
  controller: PaginationController,
  controllerAs: 'vm'
})

GoodReads.component('bookList', {
  template:
  `<article class="book" ng-repeat="book in vm.state.books">
    <header>
      <h2>{{ book.title }}</h2>
      <p class="book-author">Written by {{ book.author }}</p>
      <p class="book-rating">Rating: {{ book.rating }}</p>
    </header>
    <div class="book-cover" style="background-image: url('{{ book.image }}')"></div>
  </article>
  `,
  controller(Store) {
    this.state = Store.get()
  },
  controllerAs: 'vm'
})
