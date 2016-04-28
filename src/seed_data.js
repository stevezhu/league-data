const MongoClient = require('mongodb').MongoClient,
      fs = require('fs'),
      assert = require('assert');

const DB_URL = 'mongodb://localhost:27017/leaguedata';
MongoClient.connect(DB_URL, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server");

  var SeedData = db.collection('seeddata');

  let count = 10;
  for (let i = 1; i <= count; i++) {
    let filename = `./seed_data/matches${i}.json`;
    console.log('file', filename);
    fs.readFile(filename, function(err, data) {
      if (err) throw err;
      SeedData.insertMany(JSON.parse(data).matches, function(err, result) {
        assert.equal(err, null);
        count--;
        console.log(count);
        if (count === 0) {
          console.log("Done");
          db.close();
        }
      });
    });
  }
});
