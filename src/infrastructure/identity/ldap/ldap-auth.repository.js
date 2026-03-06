import { Client } from 'ldapts';
import { InvalidCredentialsError } from '../../../domain/auth/auth-errors.js';

const escapeLdapFilter = (value) => {
  return value.replace(/[*()\\\0]/g, (char) => {
    const escapedChars = {
      '*': '\\2a',
      '(': '\\28',
      ')': '\\29',
      '\\': '\\5c',
      '\0': '\\00',
    };

    return escapedChars[char] || char;
  });
};

const deriveRoleFromGroups = (groups = [], roleMapping = {}) => {
  for (const [groupDn, role] of Object.entries(roleMapping)) {
    if (groups.includes(groupDn)) {
      return role;
    }
  }

  throw new InvalidCredentialsError(
    'User does not belong to a mapped LDAP role group'
  );
};

export class LdapAuthRepository {
  constructor(options) {
    this.url = options.url;
    this.baseDn = options.baseDn;
    this.userSearchAttribute = options.userSearchAttribute || 'uid';
    this.serviceAccountDn = options.serviceAccountDn;
    this.serviceAccountPassword = options.serviceAccountPassword;
    this.roleMapping = options.roleMapping || {};
    this.timeout = options.timeout || 5000;
    this.tlsRejectUnauthorized = options.tlsRejectUnauthorized !== false;
  }

  async authenticate(credentials) {
    const { username, password } = credentials;

    const client = new Client({
      url: this.url,
      timeout: this.timeout,
      connectTimeout: this.timeout,
      tlsOptions: {
        rejectUnauthorized: this.tlsRejectUnauthorized,
      },
    });

    try {
      if (this.serviceAccountDn && this.serviceAccountPassword) {
        await client.bind(this.serviceAccountDn, this.serviceAccountPassword);
      }

      const escapedUsername = escapeLdapFilter(username);
      const filter = `(&(${this.userSearchAttribute}=${escapedUsername})(objectClass=person))`;

      const searchResult = await client.search(this.baseDn, {
        scope: 'sub',
        filter,
        attributes: ['dn', this.userSearchAttribute, 'memberOf'],
        sizeLimit: 1,
      });

      const entry = searchResult.searchEntries[0];
      if (!entry || !entry.dn) {
        throw new InvalidCredentialsError('Invalid username or password');
      }

      await client.bind(entry.dn, password);

      const memberOf = Array.isArray(entry.memberOf)
        ? entry.memberOf
        : entry.memberOf
          ? [entry.memberOf]
          : [];

      return {
        id: entry.dn,
        username,
        role: deriveRoleFromGroups(memberOf, this.roleMapping),
      };
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw error;
      }

      const invalidCredentialsCodes = ['49', 49, 'InvalidCredentialsError'];
      if (
        invalidCredentialsCodes.includes(error.code) ||
        error.name === 'InvalidCredentialsError'
      ) {
        throw new InvalidCredentialsError('Invalid username or password');
      }

      throw error;
    } finally {
      await client.unbind().catch(() => {});
    }
  }
}
