const MongoClient = require('mongodb').MongoClient;
const suspend = require('suspend');
const resume = suspend.resume;
const assert = require('assert');
const fs = require('mz/fs');
const _ = require('lodash');

const DB_URL = 'mongodb://localhost:27017/leaguedata';
suspend.run(function*() {
  var db = yield MongoClient.connect(DB_URL);
  console.log("Connected correctly to server");

  var Matches = db.collection('matches');
  var Summoners = db.collection('summoners');

  // load seed data if the matches collection is empty
  if (_.isNull(yield Matches.findOne())) {
    yield* loadSeedData(db);
  }

  // load summoners if there is at least one match that hasn't been processed yet
  if (!_.isNull(yield Matches.findOne({ processed: { $not: { $eq: true } } }))) {
    yield* loadSummoners(db);
  }

  yield* loadMasteryData(db);

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

    console.overwrite(`Loading ${filename}`);

    let matches = JSON.parse(yield fs.readFile(filename)).matches;

    var r = yield Matches.insertMany(matches);
    assert.equal(matches.length, r.insertedCount);
  }
  console.overwriteDone();

  console.log("Done loading seed data");
};

// does not connect to riot api
// loads summoners from matches that haven't been marked as processed
function* loadSummoners(db) {
  var Matches = db.collection('matches');
  var Summoners = db.collection('summoners');

  console.log("Getting summoners from seed data");

  // https://docs.mongodb.org/manual/reference/operator/query/not/
  // will find documents where either done doesn't exist as a key or done != true
  let cursor = Matches.find({ processed: { $not: { $eq: true } } });
  let count = 0; // to print progress
  while (yield cursor.hasNext()) {
    // https://developer.riotgames.com/api/methods
    // reference match endpoint
    // each document is a MatchDetail object
    let doc = yield cursor.next();

    let summoners = [];
    for (let participant of doc.participantIdentities) {
      let player = participant.player;
      summoners.push({
        id: player.summonerId,
        name: player.summonerName
      });
    }

    for (let summoner of summoners) {
      // use $setOnInsert and upsert: true,
      // so that the summoner will only be inserted if it doesn't already exist in the db
      var r = yield Summoners.updateOne(summoner, { $setOnInsert: summoner }, { upsert: true });
      assert.equal(1, r.matchedCount + r.modifiedCount); // either modified or matched so sum must be 0
    }

    // mark that all the summoners ids have been retrieved from this match
    var r = yield Matches.updateOne(doc, {$set: { processed: true }});
    assert.equal(1, r.matchedCount);
    assert.equal(1, r.modifiedCount);

    if (++count % 50 == 0) {
      console.overwrite(`${count} matches processed`);
    }
  }
  console.overwrite(`${count} matches processed`); // print total count at the end in case it is not a multiple of 50
  console.overwriteDone();

  console.log("Done gettings summoners from seed data");
};

const API_CALL_INTERVAL = 1250;
function *loadMasteryData(db) {
  console.log("Loading mastery data");

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

  console.log("Done loading mastery data");
};

{
  let newlinePrinted = false;

  console.overwrite = function(data) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(data);
  };

  console.overwriteDone = function() {
    if (!newlinePrinted) {
      process.stdout.write('\n');
      newlinePrinted = false;
    }
  };
}
