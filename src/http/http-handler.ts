/**
 * @packageDocumentation
 * @module @hatsy/hatsy
 */
import { RequestHandler } from '../request-handler';
import { HttpMatters } from './http-matters';

/**
 * HTTP request handler signature.
 *
 * HTTP request handler is called once per request. It accepts a {@link RequestContext request processing context}
 * containing {@link HttpMatters HTTP request processing matters} used to respond or to delegate to another handler.
 *
 * @category HTTP
 * @typeparam THttpMatters  A type of supported HTTP request processing matters.
 * @typeparam TMatters  A type of request processing matters required in addition to HTTP request processing ones.
 */
export type HttpHandler<
    THttpMatters extends HttpMatters = HttpMatters,
    TMatters = object,
> = RequestHandler<THttpMatters & TMatters>;
