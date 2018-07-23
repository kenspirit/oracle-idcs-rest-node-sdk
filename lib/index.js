const axios = require('axios');
const querystring = require('querystring');
const User = require('./user');
const Group = require('./group');

/*
 * Options sample format
 * <code>
 * {
 *   oracle: {
 *     "ClientId": "123456789abcdefghij",
 *     "ClientSecret": "abcde-12345-zyxvu-98765-qwerty",
 *     "IDCSHost": "https://idcs-abcd1234.identity.oraclecloud.com"
 *   },
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

    Object.freeze(this.options);

    this.User = new User(this);
    this.Group = new Group(this);

    return this;
  }

  getToken(params = {}) {
    return axios({
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Authorization: `Basic ${this.options.oracle.BASE64_CLIENTID_SECRET}`,
      },
      url: `${this.options.oracle.IDCSHost}/oauth2/v1/token`,
      data: querystring.stringify(params),
    })
      .then(response => response.data);
  }
}

module.exports = IDCS;
