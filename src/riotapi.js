const _ = require('lodash');
const assert = require('assert');
const request = require('request');

const BASE_URL = 'https://na.api.pvp.net/';
class RiotApi {
  constructor(options) {
    _.defaults(options, {
      region: 'na'
    });

    this.key = options.key;
    this.region = options.region;
  }

  // (path, callback) or (path, params, callback)
  // callback in the form `function(err, data) {}`
  callEndpoint(path, params, callback) {
    assert(arguments.length === 2 || arguments.length === 3);
    if (arguments.length === 2) {
      params = {};
      callback = arguments[1];
    }
    params.api_key = this.key;

    request.get({
      url: BASE_URL + path,
      qs: params
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

    let path = `/championmastery/location/na1/player/${playerId}/champion`;
    if(!_.isUndefined(championId)){
      path+=championId;
    }
    else path+='s';
    this.callEndpoint(path, callback);
  }

  // Returns an int of the total mastery score of a player (sum of all champion mastery levels)
  getTotalMasteryScore(playerId, callback) {
    let path = `/championmastery/location/na1/player/${playerId}/score`;
    this.callEndpoint(path, callback);
  }
}

{
  /**
   * Methods
   *
   * getStaticDataChampions(params, callback)
   * getStaticDataChampionById(id, params, callback)
   * getStaticDataItems(params, callback)
   * getStaticDataItemById(id, params, callback)
   * getStaticDataLanguageStrings(params, callback)
   * getStaticDataLanguages(params, callback)
   * getStaticDataMap(params, callback)
   * getStaticDataMasteries(params, callback)
   * getStaticDataMasteryById(id, params, callback)
   * getStaticDataRealm(params, callback)
   * getStaticDataRunes(params, callback)
   * getStaticDataRuneById(id, params, callback)
   * getStaticDataSummonerSpells(params, callback)
   * getStaticDataSummonerSpellById(id, params, callback)
   * getStaticDataVersions(params, callback)
   *
   */

  // id: true means the data type has an endpoint with and without id as a path param
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

    // the string to put into the function name
    // eg. summoner-spell -> SummonerSpell
    name = _.map(key.split('-'), (s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    if (!_.has(options, 'plural')) {
      options.plural = name + (options.id ? 's' : '');
    }
    options.singular = name;

    RiotApi.prototype[`getStaticData${options.plural}`] = function(params, callback) {
      assert(arguments.length === 1 || arguments.length === 2);
      if (arguments.length === 1) {
        callback = arguments[0];
        params = {};
      }

      let path = `/api/lol/static-data/${this.region}/v1.2/${key}`;
      this.callEndpoint(path, params, callback);
    };

    if (options.id) {
      RiotApi.prototype[`getStaticData${options.singular}ById`] = function(id, params, callback) {
        assert(arguments.length === 2 || arguments.length === 3);
        if (arguments.length === 2) {
          callback = arguments[1];
          params = {};
        }

        let path = `/api/lol/static-data/${this.region}/v1.2/${key}/${id}`;
        this.callEndpoint(path, params, callback);
      };
    }
  }
}

module.exports = RiotApi;
