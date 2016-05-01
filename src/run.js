const MongoClient = require('mongodb').MongoClient;
const co = require('co');
const assert = require('assert');
const fs = require('mz/fs');
const _ = require('lodash');

const DB_URL = 'mongodb://localhost:27017/leaguedata';
co(function*() {
  var db = yield MongoClient.connect(DB_URL);
  console.log("Connected correctly to server");

  var Matches = db.collection('matches'),
      Summoners = db.collection('summoners');

  // Load seed data if the matches collection is empty
  if (_.isNull(yield Matches.findOne())) {
    console.log("Loading seed data");
    yield loadSeedData(db);
  }

  db.close();
}).catch(function(err) {
  console.log(err.stack);
});

// does not connect to riot api
function* loadSeedData(db) {
  var Matches = db.collection('matches');

  let count = 10;
  for (let i = 1; i <= count; i++) {
    let filename = `./seed_data/matches${i}.json`;
    console.log("Loading", filename);

    let matches = JSON.parse(yield fs.readFile(filename)).matches;

    let r = yield Matches.insertMany(matches);
    assert.equal(matches.length, r.insertedCount);
  }
  console.log("Done loading seed data");
};
