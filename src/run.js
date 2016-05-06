const MongoClient = require('mongodb').MongoClient;
const suspend = require('suspend');
const resume = suspend.resume;
const assert = require('assert');
const fs = require('mz/fs');
const _ = require('lodash');
const RiotApi = require('./riotapi.js');

/**
 * Format
 *
 * {
 *   keys: []
 * }
 */
let settings = require('../settings.json');

let api = new RiotApi({
  key: settings.keys[0]
});

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

// ===== FUNCTIONS TO LOAD DATA =====

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
  let cursor = Matches.find({ processed: { $ne: true } });
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
    var r = yield Matches.updateOne(doc, { $set: { processed: true } });
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

const API_CALL_INTERVAL = 1230;
function *loadMasteryData(db) {
  var Summoners = db.collection('summoners');
  var Masteries = db.collection('masteries');

  console.log("Loading mastery data");

  // mark all summoners as not being processed in case the program exited early
  var r = yield Summoners.updateMany({ processing: true }, { processing: false });

  // TODO log the count of summoners processed
  while (true) {
    // find a summoner whose masteries havent been loaded yet
    let summoner = yield Summoners.findOne({
      lastUpdatedMasteries: { $exists: false }, // TODO also add check for
      processing: { $ne: true }
    });
    if (!_.isNull(summoner)) {
      Summoners.update(summoner, { $set: { processing: true } });
      // TODO only have each mastery id be inserted once, then updated
      api.getChampionMastery(summoner.id, function(err, data) {
        Masteries.insertMany(data, function(err, r) {
          assert.equal(null, err);
          assert.equal(r.insertedCount, data.length);

          Summoners.update(summoner, {
            $set: { processing: false },
            $currentDate: { lastUpdatedMasteries: true }
          });
        });
      });
    } else {
      // TODO load more matches and store summoners from each match
      if (_.isNull(yield Summoners.findOne({ lastUpdatedMasteries: { $exists: true } }))) {
        break;
      }
    }

    yield setTimeout(resume(), API_CALL_INTERVAL); // wait interval until making next api call
  }

  console.log("Done loading mastery data");
};

// TODO move this to another file
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
