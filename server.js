// original gist from http://gist.github.com/392869
// got a request from a friend to help make this code work
// the previous bug was closing the db handle incorrectly in the callbacks
// run it like this
// // node foo.js
// //  curl -vv "http://localhost:3000/37signals%20-%20Mark%20Imbriaco.mov"
// //  curl -vv "http://localhost:3000/37signals%20-%20Mark%20Imbriaco.mov"
var kiwi = require('kiwi'),
    sys  = require('sys')

kiwi.require('express');
     require('express/plugins');
kiwi.seed('mongodb-native');

var mongo = require('mongodb')


configure(function(){
  use(MethodOverride);
  use(ContentLength);
  use(Logger);
  set('root', __dirname);
})

get('/:id', function(){
  var info = new IpInfo(this.param('id'), this)
  info.log()
  this.redirect('http://download.webpulp.tv/' + this.param('id'));
})

run();

// class with all the info we're sending into mongo
function FileDownload(filePath, xmlBody, remoteIp, remoteBrowser) {
  var country = /<CountryCode>(\w\w)<\/CountryCode>/.exec(xmlBody)
  var city = /<City>(.*)<\/City>/.exec(xmlBody)

  this.file = {
    file_path: filePath,
    created_at: new Date()
  }
  this.download = {
    date: new Date(),
    ip: remoteIp,
    country: country ? country[1] : "XX",
    city: city ? city[1] : "Unknown", 
    browser: remoteBrowser 
  }
}

FileDownload.prototype.track_file = function() {
  var fileDownload = this
  var db = new mongo.Db('node-tracker', new mongo.Server("127.0.0.1", 27017, {}));

  db.open(function(db_client) {
    db.createCollection('files', function(err, collection) {
      db.collection('files', function(err, collection) {
        collection.update({'file_path': fileDownload.file["file_path"]}, fileDownload.file, {upsert: true}, function(err, doc) {
          sys.puts("Successfully logged the filepath")
          return doc
          db.close()
        })
      })
    })
  })
}

// class that fetches stuff from the remote repo and instantiates a FileDownload
function IpInfo(path, expressRequest) {
  this.host       = 'ipinfodb.com'
  this.path       = path
  this.ip         = expressRequest.connection.remoteAddress
  this.user_agent = expressRequest.headers['user-agent']
  this.server     = require('http').createClient(80, this.host)
}

IpInfo.prototype.log = function() {
  var ipInfo = this
  var query_string = "/ip_query.php?ip=" + this.ip + "&timezone=false"
  var request      = this.server.request("GET", query_string, {host: this.host})
  request.addListener('response', function (response) {
    response.addListener("data", function (chunk) {
      var result = new FileDownload(ipInfo.path, chunk, ipInfo.ip, ipInfo.user_agent)
      var file_id = result.track_file(result.file, result.download)
      sys.puts(sys.p(file_id))
    })
  })
  request.end();
}