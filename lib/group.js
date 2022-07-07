const Promise = require('bluebird');

module.exports = class Group {
  constructor(idcs) {
    this.idcs = idcs;
    return this;
  }

  addUsers(groupId, userIds) {
    const self = this;
    return this.idcs.getToken({
      scope: 'urn:opc:idm:__myscopes__',
      grant_type: 'client_credentials',
    })
      .then((oracleAppToken) => {
        const operations = [].concat(userIds).map((userId) => {
          return {
            op: 'add',
            path: 'members',
            value: [
              {
                value: userId,
                type: 'User',
              }
            ],
          };
        });

        return new Promise((resolve, reject) => {
          self.idcs.gateway({
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${oracleAppToken.access_token}`,
            },
            url: `${self.idcs.options.oracle.REST_BASE_URL}/Groups/${groupId}`,
            body: {
              schemas: [
                'urn:ietf:params:scim:api:messages:2.0:PatchOp'
              ],
              Operations: operations,
            },
          }, (err, res) => {
            if (err) {
              return reject(err);
            }

            if (res.statusCode !== 200) {
              return reject(res.statusMessage);
            }

            resolve(true);
          });
        });
      });
  }

  searchByGroupName(groupName) {
    const self = this;
    return this.idcs.getToken({
      scope: 'urn:opc:idm:__myscopes__',
      grant_type: 'client_credentials'
    })
      .then((oracleAppToken) => {
        return new Promise((resolve, reject) => {
          return self.idcs.gateway({
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${oracleAppToken.access_token}`,
            },
            url: `${self.idcs.options.oracle.REST_BASE_URL}/Groups?filter=(displayName eq "${encodeURIComponent(groupName)}")`
          }, (err, res) => {
            if (err) {
              return reject(err);
            } else if (res.statusCode === 200) {
              return resolve(res.body);
            }

            return reject(res.statusMessage);
          });
        });
      });
  }
};
