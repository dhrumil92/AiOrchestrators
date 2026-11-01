/** An expected failure. Its code and message are safe to send to the client. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what: string): HttpError =>
  new HttpError(404, 'NOT_FOUND', `${what} not found`);

export const requestClosed = (): HttpError =>
  new HttpError(409, 'REQUEST_CLOSED', 'This request is closed');
