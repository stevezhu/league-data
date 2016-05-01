const MongoClient = require('mongodb').MongoClient;
const suspend = require('suspend');
const resume = suspend.resume;
const assert = require('assert');
const fs = require('mz/fs');
const _ = require('lodash');

const API_CALL_INTERVAL = 1250;

const DB_URL = 'mongodb://localhost:27017/leaguedata';
suspend.run(function*() {
  var db = yield MongoClient.connect(DB_URL);
  console.log("Connected correctly to server");

  var Matches = db.collection('matches'),
      Summoners = db.collection('summoners');

  // Load seed data if the matches collection is empty
  if (_.isNull(yield Matches.findOne())) {
    yield* loadSeedData(db);
  }

  while (true) {
    // finds a summoner where the masteries havent been loaded yet
    let summoner = yield Summoners.findOne({ lastUpdatedMasteries: { $exists: false } });
    if (!_.isNull(summoner)) {
      // TODO load more masteries
    } else {
      // TODO load more matches
      // store summoners from each match
      break;
    }

    yield setTimeout(resume(), API_CALL_INTERVAL); // wait interval until making next api call
  }

  db.close();
}, function(err) {
  console.log(err.stack);
});

// does not connect to riot api
function* loadSeedData(db) {
  var Matches = db.collection('matches');

  console.log("Loading seed data");

  let count = 10;
  for (let i = 1; i <= count; i++) {
    let filename = `./seed_data/matches${i}.json`;
    console.log("Loading", filename);

    let matches = JSON.parse(yield fs.readFile(filename)).matches;

    var r = yield Matches.insertMany(matches);
    assert.equal(matches.length, r.insertedCount);
  }

  console.log("Done loading seed data");
};
