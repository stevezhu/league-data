const MongoClient = require('mongodb').MongoClient,
      co = require('co'),
      assert = require('assert');

const DB_URL = 'mongodb://localhost:27017/leaguedata';
co(function*() {
  var db = yield MongoClient.connect(DB_URL);
  console.log("Connected correctly to server");

  var SeedData = db.collection('seeddata'),
      Summoners = db.collection('summoners')

  let cursor = SeedData.find({ done: { $not: { $eq: true } } });
  while (yield cursor.hasNext()) {
    let doc = yield cursor.next();
    let summoners = [];
    for (let participant of doc.participantIdentities) {
      let player = participant.player;
      summoners.push({
        id: player.summonerId,
        name: player.summonerName
      });
    }

    for (let i = 0; i < summoners.length; i++) {
      let summoner = summoners[i];
      var r = yield Summoners.updateOne(summoner, { $setOnInsert: summoner }, { upsert: true });
      assert.equal(1, r.matchedCount + r.modifiedCount); // either modified or matched so sum must be 0
    }

    var r = yield SeedData.updateOne(doc, {$set: { done: true }});
    assert.equal(1, r.matchedCount);
    assert.equal(1, r.modifiedCount);
  }
  db.close();
}).catch(function(err) {
  console.log(err.stack);
});
