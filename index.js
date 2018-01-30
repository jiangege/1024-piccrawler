var _ = require('lodash')
var utils = require('utils')
var betterDownload = require('casperjs-better-download')
var casper = require('casper').create({
  clientScripts: ['libs/jquery-3.2.1.min.js', 'libs/lodash-4.17.4.min.js'],
  viewportSize: {
    width: 1024,
    height: 768
  },
  verbose: true,
  loglevel: 'debug',
  pageSettings: {
    webSecurityEnabled: false
  }
});

function openMainPage(cb) {
  casper.thenOpen('http://t66y.com/thread0806.php?fid=16&search=&page=1', function () {
    var lists = this.evaluate(function () {
      return $('.tr3.t_one.tac').filter(function () {
        return !/↑\d|(■■■)/.test($('.tal', this).text());
      }).map(function () {
        var title = $('.tal h3 a', this).text();
        var link = $('.tal h3 a', this).attr('href');
        return {
          title: title, 
          link: location.origin + '/' + link
        }
      }).get();
    });
    articles = _.assign(lists)
    cb && cb.call(this, articles)
  })
}

function eachArticles(articles, cb, index) {
  index = index || 0
  openArticle(articles[index].link, function(imagelists) {
    downloadImages(imagelists, function() {
      if (index + 1 >= articles.length) {
        return cb.call(casper)
      }
      index++
      this.back()
      eachArticles(articles, cb, index)
    })
  })
}

function openArticle(link, cb) {
  casper.thenOpen(link, function() {
    var imagelists = this.evaluate(function () {
      return $('.tpc_content:first input[type="image"]').map(function() {
        return $(this).attr('src')
      })
    });
    cb.call(casper, imagelists)
  })
}

function downloadImages(imagelists, cb, index) {
  var title = casper.getTitle()
  index = index || 0
  casper.echo('Downloading (' + (index + 1) + ')' + title)
  image = imagelists[index]

  function handleFinally() {
    if (index + 1 >= imagelists.length) {
      return cb.call(casper)
    }
    index++
    casper.echo('Downloaded (' + index + ')'  + title, 'INFO')
    downloadImages(imagelists, cb, index)
  }
  betterDownload({
    casper: casper,
    url: image,
    targetFilepath: './lol/' + title + '/' + (index + 1) +'.png',
    onComplete: function() {
      handleFinally()
    },
    onError: function(err) {
      casper.echo(err.message, 'ERROR');
      casper.echo('Error data:' + JSON.stringify(err.data), 'ERROR');
      handleFinally()
    }
  });
}

function nextPage(cb) {
  casper.then(function() {
    var nextPageLink = this.evaluate(function() {
      return location.origin + '/' + $('.w70: + a').attr('href')
    })
    if (nextPageLink != null) {
      this.thenOpen(nextPageLink, function() {
        cb({ done: false })
      })
    } else {
      cb({
        done: true
      })
    }
  })
}

function doEachArticles() {
  eachArticles(articles, function() {
    nextPage(function(r) {
      if (r.done === false) {
        doEachArticles()
      } else {
        casper.echo('Finished!!')
        casper.exit()
      }
    })
  })
}

casper.start()
openMainPage(function() {
  doEachArticles()
})
casper.run();