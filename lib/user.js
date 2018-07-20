const axios = require('axios');
const crypto = require('crypto');
const Promise = require('bluebird');

module.exports = class User {
  constructor(idcs) {
    this.idcs = idcs;
    return this;
  }

  hashPassword(pwd) {
    const config = this.idcs.options.password;
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(32);
      crypto.pbkdf2(pwd, salt, config.iteration, config.keyLength, config.digest,
        (err, derivedKey) => {
          if (err) return reject(err);

          return resolve(Buffer.concat([derivedKey, salt]).toString('base64'));
        });
    });
  }

  create(user, resetAfterLogin = false) {
    const self = this;
    let { defaultPassword } = this.idcs.options.password;

    if (!resetAfterLogin && !defaultPassword) {
      throw new Error('defaultPassword must be set in options if created user doesnot need to reset');
    }
    if (!resetAfterLogin && user.password) {
      defaultPassword = user.password;
    }

    return Promise.all([
      this.hashPassword(defaultPassword),
      this.idcs.getToken({
        scope: 'urn:opc:idm:__myscopes__',
        grant_type: 'client_credentials',
      }),
    ])
      .spread((hashedPassword, oracleAppToken) => {
        const userData = Object.assign({}, user, {
          schemas: [
            'urn:ietf:params:scim:schemas:core:2.0:User',
          ],
          password: resetAfterLogin ? defaultPassword : `{PBKDF2-HMAC-SHA512}${self.idcs.options.password.iteration}$${hashedPassword}`,
        });

        return axios({
          method: 'POST',
          headers: {
            'Content-Type': 'application/scim+json',
            Authorization: `Bearer ${oracleAppToken.access_token}`,
          },
          url: `${self.idcs.options.oracle.REST_BASE_URL}/Users`,
          data: userData,
        });
      })
      .then(response => response.data);
  }

  delete(userId, forceDelete = true) {
    const self = this;
    return this.idcs.getToken({
      scope: 'urn:opc:idm:__myscopes__',
      grant_type: 'client_credentials',
    })
      .then((oracleAppToken) => {
        return axios({
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${oracleAppToken.access_token}`,
          },
          url: `${self.idcs.options.oracle.REST_BASE_URL}/Users/${userId}?forceDelete=${forceDelete}`,
        });
      })
      .then(() => true);
  }
};
