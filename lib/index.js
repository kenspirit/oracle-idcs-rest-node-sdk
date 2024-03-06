const axios = require('axios');
const axiosRetry = require('axios-retry');
const User = require('./user');
const Group = require('./group');

async function getNewToken(self, params) {
  try {
    const response = await self.gateway({
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Authorization: `Basic ${self.options.oracle.BASE64_CLIENTID_SECRET}`
      },
      url: `${self.options.oracle.IDCSHost}/oauth2/v1/token`,
      data: params
    });
    return response.data;
  } catch (e) {
    if (e.response) {
      throw new Error(e.response.statusText);
    }
    throw e;
  }
}

function _isTokenExpired(token) {
  // Expired within 1 minute
  return token.expires_in - Date.now() <= 60 * 1000;
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
      ClientId, ClientSecret, IDCSHost
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

    const requestOptions = {
      timeout: this.options.defaultTimeout || 30000,
      proxy: this.options.proxy,
      baseURL: this.options.oracle.REST_BASE_URL
    };
    if (requestOptions.proxy && options.oracle.IDCSHost.startsWith('https:')) {
      requestOptions.protocol = 'https:';
    }
    this.gateway = axios.create(requestOptions);
    axiosRetry(this.gateway, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay
    });

    Object.freeze(this.options);

    this.User = new User(this);
    this.Group = new Group(this);

    return this;
  }

  async getToken(params = { scope: 'urn:opc:idm:__myscopes__', grant_type: 'client_credentials' }) {
    if (!this.cachedToken || _isTokenExpired(this.cachedToken)) {
      this.cachedToken = await getNewToken(this, params);
      this.cachedToken.expires_in = Date.now() + this.cachedToken.expires_in * 1000;
    }

    return this.cachedToken;
  }

  async handleRequest(params) {
    const oracleAppToken = await this.getToken({
      scope: 'urn:opc:idm:__myscopes__',
      grant_type: 'client_credentials'
    });

    try {
      params.headers = params.headers || {};
      if (!params.headers['Content-Type']) {
        params.headers['Content-Type'] = 'application/json';
      }
      params.headers.Authorization = `Bearer ${oracleAppToken.access_token}`;
      const response = await this.gateway(params);
      if (params.method === 'DELETE' && response.status === 204) {
        return true;
      }
      return response.data;
    } catch (e) {
      if (e.response) {
        let msg = e.response.statusText;
        if (e.response.data && e.response.data.detail) {
          msg = e.response.data.detail;
        }
        throw new Error(`Status ${e.response.status} - ${msg}`);
      }
      throw e;
    }
  }
}

module.exports = IDCS;
