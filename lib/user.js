const crypto = require('crypto');

module.exports = class User {
  constructor(idcs) {
    this.idcs = idcs;
    return this;
  }

  async hashPassword(pwd) {
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

  async create(user, resetAfterLogin = false) {
    let { defaultPassword } = this.idcs.options.password;

    if (!resetAfterLogin && !defaultPassword) {
      throw new Error('defaultPassword must be set in options if created user doesnot need to reset');
    }
    if (!resetAfterLogin && user.password) {
      defaultPassword = user.password;
    }

    const hashedPassword = await this.hashPassword(defaultPassword);

    const userData = {
      ...user,
      schemas: [
        'urn:ietf:params:scim:schemas:core:2.0:User'
      ],
      password: resetAfterLogin ? defaultPassword : `{PBKDF2-HMAC-SHA512}${this.idcs.options.password.iteration}$${hashedPassword}`
    };

    const params = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/scim+json'
      },
      url: '/Users',
      data: userData
    };

    return this.idcs.handleRequest(params);
  }

  async delete(userId, forceDelete = true) {
    const params = {
      method: 'DELETE',
      url: `/Users/${userId}?forceDelete=${forceDelete}`
    };

    return this.idcs.handleRequest(params);
  }

  async resetPassword(userId, newPassword, bypassNotification = false) {
    const params = {
      method: 'PUT',
      url: `/UserPasswordChanger/${userId}`,
      data: {
        password: newPassword,
        schemas: ['urn:ietf:params:scim:schemas:oracle:idcs:UserPasswordChanger'],
        bypassNotification
      }
    };

    return this.idcs.handleRequest(params);
  }

  async searchByUsername(username) {
    const params = {
      method: 'GET',
      url: `/Users?filter=(userName eq "${encodeURIComponent(username)}")`
    };

    return this.idcs.handleRequest(params);
  }

  async getOneUser(userId) {
    const params = {
      method: 'GET',
      url: `/Users/${userId}?attributeSets=all`
    };

    return this.idcs.handleRequest(params);
  }
};
