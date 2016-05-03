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
}

module.exports = RiotApi;
