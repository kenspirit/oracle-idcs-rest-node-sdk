module.exports = class Group {
  constructor(idcs) {
    this.idcs = idcs;
    return this;
  }

  async addUsers(groupId, userIds) {
    const operations = [].concat(userIds).map((userId) => {
      return {
        op: 'add',
        path: 'members',
        value: [
          {
            value: userId,
            type: 'User'
          }
        ]
      };
    });

    const params = {
      method: 'PATCH',
      url: `/Groups/${groupId}`,
      data: {
        schemas: [
          'urn:ietf:params:scim:api:messages:2.0:PatchOp'
        ],
        Operations: operations
      }
    };

    return this.idcs.handleRequest(params);
  }

  async searchByGroupName(groupName) {
    const params = {
      method: 'GET',
      url: `/Groups?filter=(displayName eq "${encodeURIComponent(groupName)}")`
    };

    return this.idcs.handleRequest(params);
  }
};
