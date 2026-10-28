/** Error with an HTTP status for Express error middleware and route catch blocks. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function httpError(status, message) {
  return new HttpError(status, message);
}
