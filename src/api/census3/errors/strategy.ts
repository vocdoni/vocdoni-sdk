export class ErrNoStrategies extends Error {
  static readonly code: number = 4008;
  constructor(message?: string) {
    super(message ? message : 'no strategy found');
  }
}

export class ErrCantGetStrategies extends Error {
  static readonly code: number = 5008;
  constructor(message?: string) {
    super(message ? message : 'error getting strategies information');
  }
}

export class ErrEncodeStrategies extends Error {
  static readonly code: number = 5016;
  constructor(message?: string) {
    super(message ? message : 'error encoding strategies');
  }
}

export class ErrMalformedStrategyID extends Error {
  static readonly code: number = 4002;
  constructor(message?: string) {
    super(message ? message : 'malformed strategy ID, it must be a integer');
  }
}

export class ErrNotFoundStrategy extends Error {
  static readonly code: number = 4005;
  constructor(message?: string) {
    super(message ? message : 'no strategy found with the ID provided');
  }
}

export class ErrCantGetStrategy extends Error {
  static readonly code: number = 5007;
  constructor(message?: string) {
    super(message ? message : 'error getting strategy information');
  }
}

export class ErrEncodeStrategy extends Error {
  static readonly code: number = 5015;
  constructor(message?: string) {
    super(message ? message : 'error encoding strategy');
  }
}
