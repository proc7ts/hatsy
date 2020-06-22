/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
/**
 * A error corresponding to the given HTTP status code.
 *
 * HTTP request processing handlers may raise this error. The {@link renderHttpError error handler} would render
 * corresponding error page then.
 *
 * @see HttpConfig.errorHandler
 */
export class HttpError extends Error {

  /**
   * Constructs HTTP status error.
   *
   * @param statusCode  HTTP status code.
   * @param statusMessage  HTTP status message.
   */
  constructor(
      readonly statusCode: number,
      readonly statusMessage?: string,
  ) {
    super(statusMessage ? `${statusCode} ${statusMessage}` : `${statusCode}`);
  }

}
