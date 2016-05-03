const _ = require('lodash');
const assert = require('assert');
const request = require('request');

const BASE_URL = 'https://na.api.pvp.net/';

/**
 * new RiotApi({
 *   key: required,
 *   region: optional
 * });
 *
 * callbacks are in the form `function(err, data) {}`
 */
class RiotApi {
  constructor(options) {
    _.defaults(options, {
      region: 'na'
    });

    this.key = options.key;
    this.region = options.region;
  }

  // (path, callback) or (path, query, callback)
  callEndpoint(path, query, callback) {
    assert(arguments.length === 2 || arguments.length === 3);
    if (arguments.length === 2) {
      query = {};
      callback = arguments[1];
    }
    query.api_key = this.key;

    request.get({
      url: BASE_URL + path,
      qs: query
    }, function(err, response, body) {
      callback.call(this, err, JSON.parse(body));
    });
  }

  // (playerId, championId, callback) or (playerId, callback)
  // Returns champion mastery info for requested champion of player OR all champion mastery info for player
  getChampionMastery(playerId, championId, callback) {
    assert(arguments.length===2 || arguments.length===3);
    if(arguments.length===2) {
      championId = undefined;
      callback = arguments[1];
    }

    let path = `/championmastery/location/NA1/player/${playerId}/champion` + (_.isUndefined(championId) ? 's' : championId);
    this.callEndpoint(path, callback);
  }

  // Returns an int of the total mastery score of a player (sum of all champion mastery levels)
  getTotalMasteryScore(playerId, callback) {
    let path = `/championmastery/location/NA1/player/${playerId}/score`;
    this.callEndpoint(path, callback);
  }

  // (playerId, query, callback) or (playerId, callback)
  // Returns info for top 3 champions by default; enter number for query to adjust number of champions
  getTopChampions(playerId, query, callback) {
    assert(arguments.length===2 || arguments.length===3);
    if(arguments.length===2) {
      query = {};
      callback = arguments[1];
    }

    let path = `championmastery/location/NA1/player/${playerId}/topchampions`;
    this.callEndpoint(path, query, callback);
  }
}

{ // ===== GENERATE METHODS FOR RETRIEVING STATIC DATA =====
  /**
   * Methods generated
   *
   * getStaticDataChampions(query, callback)
   * getStaticDataChampionById(id, query, callback)
   * getStaticDataItems(query, callback)
   * getStaticDataItemById(id, query, callback)
   * getStaticDataLanguageStrings(query, callback)
   * getStaticDataLanguages(query, callback)
   * getStaticDataMap(query, callback)
   * getStaticDataMasteries(query, callback)
   * getStaticDataMasteryById(id, query, callback)
   * getStaticDataRealm(query, callback)
   * getStaticDataRunes(query, callback)
   * getStaticDataRuneById(id, query, callback)
   * getStaticDataSummonerSpells(query, callback)
   * getStaticDataSummonerSpellById(id, query, callback)
   * getStaticDataVersions(query, callback)
   */

  // id: true means the data type has an endpoint with and without id as a path parameter
  // eg. champion includes both of the following:
  // /api/lol/static-data/{region}/v1.2/champion
  // /api/lol/static-data/{region}/v1.2/champion/{id}
  const STATIC_DATA_TYPES = {
    'champion': { id: true },
    'item': { id: true },
    'language-strings': {},
    'languages': {},
    'map': {},
    'mastery': { id: true, plural: 'Masteries' },
    'realm': {},
    'rune': { id: true },
    'summoner-spell': { id: true },
    'versions': {}
  };

  for (let key of Object.keys(STATIC_DATA_TYPES)) {
    let options = STATIC_DATA_TYPES[key];

    // the string to put into the method name
    // converts key to camel case
    // eg. summoner-spell -> SummonerSpell
    name = _.map(key.split('-'), (s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    options.singular = name;
    if (!_.has(options, 'plural')) {
      options.plural = name;
      if (options.id) {
        options.plural += 's';
      }
    }

    // GENERATE CLASS METHODS
    let generateGetStaticDataMethod = function(key, isIdMethod) {
      let maxArgLen = isIdMethod ? 3 : 2;
      return function() {
        let len = arguments.length;

        assert(len === maxArgLen - 1 || len === maxArgLen);

        // set id, query, and callback
        var id, query, callback;
        if (isIdMethod) {
          id = arguments[0];
          query = arguments[1];
          callback = arguments[2];
        } else {
          query = arguments[0];
          callback = arguments[1];
        }
        // if optional argument is not included
        if (len == maxArgLen - 1) {
          query = {};
          callback = arguments[maxArgLen - 2];
        }

        // set path
        var path = `/api/lol/static-data/${this.region}/v1.2/${key}`;
        if (isIdMethod) path += `/${id}`;

        this.callEndpoint(path, query, callback);
      }
    };

    RiotApi.prototype[`getStaticData${options.plural}`] = generateGetStaticDataMethod(key, false);
    if (options.id) {
      RiotApi.prototype[`getStaticData${options.singular}ById`] = generateGetStaticDataMethod(key, true);
    }
  }
}

module.exports = RiotApi;
