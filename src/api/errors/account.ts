export class ErrAddressMalformed extends Error {
  constructor(message?: string) {
    super(message ? message : 'address malformed');
  }
}

export class ErrAccountNotFound extends Error {
  constructor(message?: string) {
    super(message ? message : 'account not found');
  }
}

export class ErrOrganizationNotFound extends Error {
  constructor(message?: string) {
    super(message ? message : 'organization not found');
  }
}
