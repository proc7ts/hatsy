/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * HTTP request processing means.
 *
 * When passed to HTTP handler the latter responds by utilizing the passed in [[response]], or delegates to the
 * {@link RequestContext.Agent.next next handler}.
 *
 * @typeparam TRequest  HTTP request type.
 * @typeparam TResponse  HTTP response type.
 */
export interface HttpMeans<
    TRequest extends IncomingMessage = IncomingMessage,
    TResponse extends ServerResponse = ServerResponse,
    > {

  /**
   * HTTP request.
   */
  readonly request: TRequest;

  /**
   * HTTP request addressing info.
   */
  readonly requestAddresses: HttpMeans.Addresses;

  /**
   * HTTP response.
   */
  readonly response: TResponse;

  /**
   * A logger to use.
   */
  readonly log: Console;

}

export namespace HttpMeans {

  /**
   * HTTP request addressing info.
   */
  export interface Addresses {

    /**
     * Request URL.
     */
    readonly url: URL;

    /**
     * Remote address.
     */
    readonly ip: string;

  }

}
