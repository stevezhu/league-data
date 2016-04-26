var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var fs = require('fs');

var mongodbUrl = 'mongodb://localhost:27017/leaguedata';
MongoClient.connect(mongodbUrl, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server");

  var collection = db.collection('seeddata');
  var jsonCount = 0; // for counting the number of matchesi.json files completed
  for (var i = 1; i <= 10; i++) {
    var filename = `./seed_data/matches${i}.json`; // string interpolation
    console.log('file', filename);
    fs.readFile(filename, function(err, data) { // read each file
      if (err) throw err;
      var matches = JSON.parse(data).matches; // parse json data
      collection.insertMany(matches, function(err, result) { // insert each set of data
        if (err) console.log('err', err);
        jsonCount++;
        console.log('Done', jsonCount);
        if (jsonCount == 10) { // if all files are done
          console.log('close db');
          db.close();
        }
      });
    });
  }
});
