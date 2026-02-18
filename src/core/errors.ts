export class TronClassError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TronClassError';
    Object.setPrototypeOf(this, TronClassError.prototype);
  }
}

export class RateLimitError extends TronClassError {
  waitTime: number;

  constructor(waitTime: number, message?: string) {
    super(message ?? `Rate limit exceeded. Please wait ${waitTime}ms before retrying.`);
    this.name = 'RateLimitError';
    this.waitTime = waitTime;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class AuthenticationError extends TronClassError {
  constructor(message: string = 'Authentication failed.') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class NetworkError extends TronClassError {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class ApiError extends TronClassError {
  statusCode: number;
  responseBody?: string;

  constructor(message: string, statusCode: number, responseBody?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
