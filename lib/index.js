const request = require('request');
const Promise = require('bluebird');
const User = require('./user');
const Group = require('./group');

let token;

async function getNewToken(self, params) {
  return new Promise((resolve, reject) => {
    return self.gateway({
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Authorization: `Basic ${self.options.oracle.BASE64_CLIENTID_SECRET}`,
      },
      url: `${self.options.oracle.IDCSHost}/oauth2/v1/token`,
      form: params,
    }, (err, res, body) => {
      if (err) {
        return reject(err);
      }
      if (res.statusCode !== 200) {
        return reject(res.statusMessage);
      }

      token = body;

      resolve(body);
    });
  });
}

/*
 * Options sample format
 * <code>
 * {
 *   oracle: {
 *     "ClientId": "123456789abcdefghij",
 *     "ClientSecret": "abcde-12345-zyxvu-98765-qwerty",
 *     "IDCSHost": "https://idcs-abcd1234.identity.oraclecloud.com"
 *   },,
 *   proxy: 'http://localhost:1234',
 *   defaultTimeout: 30000,
 *   password: {
 *     "iteration": 100000,
 *     "keyLength": 64,
 *     "digest": "sha512"
 *     "defaultPassword": "Welcome1@bc"
 *   }
 * }
 * </code>
*/
class IDCS {
  constructor(options) {
    if (!options || !options.oracle) {
      throw new Error('Oracle options are missing');
    }

    const {
      ClientId, ClientSecret, IDCSHost,
    } = options.oracle;

    if (!ClientId) {
      throw new Error('Missing ClientId in options');
    }
    if (!ClientSecret) {
      throw new Error('Missing ClientSecret in options');
    }
    if (!IDCSHost) {
      throw new Error('Missing IDCSHost in options');
    }

    this.options = options;
    this.options.oracle.REST_BASE_URL = `${options.oracle.IDCSHost}/admin/v1`;
    this.options.oracle.BASE64_CLIENTID_SECRET = Buffer.from(`${ClientId}:${ClientSecret}`).toString('base64');

    this.gateway = request.defaults({
      timeout: this.options.defaultTimeout || 30000,
      proxy: this.options.proxy,
      json: true,
    });

    Object.freeze(this.options);

    this.User = new User(this);
    this.Group = new Group(this);

    return this;
  }

  getToken(params = {}) {
    if (!token || token.expiredOn < (Date.now() / 1000 - 120)) {
      return getNewToken(this, params);
    }

    return Promise.resolve(token);
  }
}

module.exports = IDCS;
