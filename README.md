# Hatsy

**Asynchronous TypeScript-friendly HTTP server for Node.js**

[![NPM][npm-image]][npm-url]
[![Build Status][build-status-img]][build-status-link]
[![Code Quality][quality-img]][quality-link]
[![Coverage][coverage-img]][coverage-link]
[![GitHub Project][github-image]][github-url]
[![API Documentation][api-docs-image]][api-docs-url]

[npm-image]: https://img.shields.io/npm/v/@hatsy/hatsy.svg?logo=npm
[npm-url]: https://www.npmjs.com/package/@hatsy/hatsy
[build-status-img]: https://github.com/hatsyjs/hatsy/workflows/Build/badge.svg
[build-status-link]: https://github.com/hatsyjs/hatsy/actions?query=workflow:Build
[quality-img]: https://app.codacy.com/project/badge/Grade/2a0e884645ed42aea74cb32f7d31065c
[quality-link]: https://app.codacy.com/gh/hatsyjs/hatsy/dashboard?utm_source=gh&utm_medium=referral&utm_content=hatsyjs/hatsy&utm_campaign=Badge_Grade
[coverage-img]: https://app.codacy.com/project/badge/Coverage/2a0e884645ed42aea74cb32f7d31065c
[coverage-link]: https://app.codacy.com/gh/hatsyjs/hatsy/dashboard?utm_source=gh&utm_medium=referral&utm_content=hatsyjs/hatsy&utm_campaign=Badge_Coverage
[github-image]: https://img.shields.io/static/v1?logo=github&label=GitHub&message=project&color=informational
[github-url]: https://github.com/hatsyjs/hatsy
[api-docs-image]: https://img.shields.io/static/v1?logo=typescript&label=API&message=docs&color=informational
[api-docs-url]: https://hatsyjs.github.io/hatsy/

## Example

```typescript
import { escapeHTML } from 'httongue';
import { httpListener, Rendering } from '@hatsy/hatsy';
import { dispatchByName, Routing } from '@hatsy/router';
import { createServer } from 'http';

const server = createServer(
  httpListener(
    Routing.and(Rendering).for(
      dispatchByName({
        hello({
          route: {
            url: { searchParams },
          },
          renderHtml,
        }) {
          renderHtml(
            `<!DOCTYPE html>
<html lang="en">
<body>Hello, ${escapeHTML(searchParams.get('name') || 'World')}!</body>
</html>
`,
          );
        },
      }),
    ),
  ),
);

server.listen(8080);
```

The server above responds with `Hello, your-name-here!` HTML at http://localhost:8080/hello?name=your-name-here

## Goals

Hatsy is developed with the following goals in mind:

- Simple API.

  Hatsy is a thin layer atop of Node.js HTTP listener.
  Everything in Hatsy implemented as a [RequestHandler] function.
  There is no API like application, middleware, etc. They all can be boiled down to handlers.

  More than that, Hatsy is not strictly bound to Node.js API. The core functionality works with any type of requests.

- First-class TypeScript support.

  No need in declaration merging.
  The request context can be extended in a type-safe manner when needed.

- Asynchronous processing.

  A [RequestHandler] can be either synchronous or asynchronous.

Good to have:

- Existing middleware support. At least at some level.

  [Connect]-style middleware supported. Not ExpressJS one.

Non-goals:

- HTTP/2, TLS support.

  The typical place of Node.js-driven HTTP server is behind the forwarding proxy. So, there is no need in these
  technologies supported at Node.js application level.

  Such support is still possible however. Everything that works with standard HTTP API will work with TLS or HTTP/2
  compatibility API. Specific functionality can be added by extending a request context.

[connect]: https://github.com/senchalabs/connect

## HTTP listener

`httpListener([config,] handler)` function creates a Node.js HTTP listener. It accepts an optional configuration and
a [RequestHandler] to process HTTP requests by.

[HTTP processing configuration] has the following options:

- `defaultHandler` - A request handler to call if other handlers did not respond.

  Issues 404 (Not Found) error by default.

- `errorHandler` - A request handler to call when error occurred.

  By default, handles [HttpError] with corresponding status code and renders error page (either HTML or JSON).

- `logError` - Whether to log HTTP processing error.

  `true` by default.

- `handleBy` - Creates actual HTTP request handler.

  This can be used e.g. to set up additional request processing capabilities, such as [Logging].

[http processing configuration]: https://hatsyjs.github.io/hatsy/interfaces/_hatsy_hatsy.HttpConfig-1.html
[HttpError]: https://hatsyjs.github.io/hatsy/classes/_hatsy_hatsy.HttpError-1.html
[Logging]: https://hatsyjs.github.io/hatsy/variables/_hatsy_hatsy.Logging-1.html

## Request Handlers

[RequestHandler]: #request-handlers

Everything in Hatsy is implemented as a request handler, which is a function accepting a [RequestContext] as its only
parameter. The latter contains all means necessary for request processing.

The handler can do the following:

- Respond synchronously. E.g. by utilizing HTTP response from request context.
- Respond asynchronously by returning a promise.
- Delegate request processing to another handler by calling `next()` function from request context.
- Modify or even extend with additional properties the request context for the next handler.

### Request Context

[RequestContext]: #request-context

By default, HTTP request processing context contains the following properties:

- `request` - Node.js HTTP request.
- `response` - Node.js HTTP response.
- `requestAddresses` object containing request `url` and remote `ip`.
- `next()` method the handler can use to delegate to another one.

However, the request handler may require more properties to operate. This is where context extension comes into play:

```typescript
import { HttpMeans, RequestContext } from '@hatsy/hatsy';

/**
 * This is an extended request processing means containing user info.
 *
 * They are applied by [contentExtender] handler and passed to [greeter] one.
 */
interface UserMeans {
  readonly name: string;
}

/**
 * Accepts context containing HTTP request processing means (`HttpMeans`).
 *
 * Delegates to [greeter] handler and extends its context with the necessary means.
 */
async function contextExtender(
  // Every context property, including methods, is suitable for destructuring.
  { requestAddresses, next }: RequestContext<HttpMeans>,
): Promise<void> {
  // The second parameter contains request context properties that will be added or updated.
  // The rest remain unchanged.
  await next(greeter, { name: requestAddresses.url.searchParams.get('name') || 'anonymous' });
}

/**
 * Accepts extended request processing means. I.e. both HTTP and user info.
 */
function greeter({ name, response }: RequestContext<HttpMeans & UserMeans>): void {
  // Respond with HTTP response.
  // Hatsy would detect the handler actually responded, because of the `.end()` method call.
  // Otherwise, Hatsy may try other handlers to process the same request.
  response.end(`Hello, ${name}`);
}
```

## Capabilities

Request handlers are everything needed to process the requests. However, it is quite typical to add more request
processing means. The request processing capabilities is a conventional API for the task. They also can be combined
to add multiple processing means at a time.

Some capabilities are:

- `Rendering`.

  Extends request context with `RenderMeans` containing `renderHtml()` and `renderJson()` methods.

- `FormDecoding`.

  Decodes `application/x-www-form-urlecoded` request.
  Extends request context with `RequestBodyMeans` containing `body` property with request body decoded as
  `URLSearchParams` or converted to some other representation.

- `JsonParsing`

  Parses `application/json` request.
  Extends request context with `RequestBodyMeans` containing `body` property with request body optionally
  converted to other representation.

- `Logging`

  Request logging capability.
  Extends request context with `LoggerMeans` containing a logger instance for request logging.

- `Routing` from [@hatsy/router] module.

  Initiates routing.
  Extends request context with `RouterMeans` containing request route used to dispatch to handler(s) matching it.

See the [very first example] containing capabilities usage. Here is the explanation:

```typescript
Routing.and(Rendering) // Combine two capabilities. `Rendering` will be applied after `Routing`.
  // More capabilities can be combined by chaining `.and()` calls.
  .for(handler); // Apply capabilities to the handler.
// The handler receives a request context extended by both of them.
```

[very first example]: #example
[@hatsy/router]: https://www.npmjs.com/package/@hatsy/router

## Dispatchers

Dispatchers are handlers that delegate processing to other handlers depending on request.

The following dispatcher implemented:

- [dispatchByAccepted] dispatches accordingly to [content negotiation] based on [Accept] request header.
- [dispatchByLanguage] dispatches accordingly to [content negotiation] based on [Accept-Language] request header.
- [dispatchByMethod] dispatches accordingly to HTTP request method.
- [dispatchError] dispatches request processing error.

[dispatchByAccepted]: https://hatsyjs.github.io/hatsy/functions/_hatsy_hatsy.dispatchByAccepted.html
[dispatchByLanguage]: https://hatsyjs.github.io/hatsy/functions/_hatsy_hatsy.dispatchByLanguage.html
[dispatchByMethod]: https://hatsyjs.github.io/hatsy/functions/_hatsy_hatsy.dispatchByMethod.html
[dispatchError]: https://hatsyjs.github.io/hatsy/functions/_hatsy_hatsy.dispatchError.html
[content negotiation]: https://developer.mozilla.org/docs/Web/HTTP/Content_negotiation
[accept]: https://developer.mozilla.org/docs/Web/HTTP/Headers/Accept
[accept-language]: https://developer.mozilla.org/docs/Web/HTTP/Headers/Accept-Language

## Middleware

[Connect]-style middleware can be utilized by [middleware] function.

[middleware]: https://hatsyjs.github.io/hatsy/modules/_hatsy_hatsy.html#middleware
