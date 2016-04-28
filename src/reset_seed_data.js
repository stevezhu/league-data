/**
 * Marks all the seed data as not done.
 */

const MongoClient = require('mongodb').MongoClient,
      co = require('co'),
      assert = require('assert');

const DB_URL = 'mongodb://localhost:27017/leaguedata';
co(function*() {
  var db = yield MongoClient.connect(DB_URL);
  console.log("Connected correctly to server");

  var SeedData = db.collection('seeddata');

  let r = yield SeedData.updateMany({}, { $set: { done: false } });
  db.close();
}).catch(function(err) {
  console.log(err.stack);
});
