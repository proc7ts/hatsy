import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { noop } from '@proc7ts/primitives';
import type { Mock } from 'jest-mock';
import { Logging } from '../core';
import { suppressedLog, TestHttpServer } from '../testing';
import { HttpError } from './http-error';
import { middleware, Middleware } from './middleware';
import { Rendering } from './render';

describe('middleware', () => {

  let server: TestHttpServer;

  beforeAll(async () => {
    server = await TestHttpServer.start();
  });
  afterAll(async () => {
    await server.stop();
  });

  afterEach(() => {
    server.listenBy(noop);
  });

  let ware: Mock<void, Parameters<Middleware>>;

  beforeEach(() => {
    ware = jest.fn((_request, _response, next) => next());
  });

  it('applies middleware after capabilities', async () => {
    server.handleBy(
        Rendering
            .and(middleware(ware))
            .for(({ renderJson }) => {
              renderJson({ response: 'ok' });
            }),
    );

    const response = await server.get('/test');

    expect(JSON.parse(await response.body())).toEqual({ response: 'ok' });
    expect(ware).toHaveBeenCalledTimes(1);
  });
  it('applies capabilities after middleware', async () => {
    server.handleBy(
        middleware(ware)
            .and(Rendering)
            .for(({ renderJson }) => {
              renderJson({ response: 'ok' });
            }),
    );

    const response = await server.get('/test');

    expect(JSON.parse(await response.body())).toEqual({ response: 'ok' });
    expect(ware).toHaveBeenCalledTimes(1);
  });
  it('allows middleware to error', async () => {
    ware.mockImplementation((_request, _response, next) => next(new HttpError(503, { statusMessage: 'Custom Error' })));

    server.handleBy(
        {
          handleBy(handler) {
            return Logging.logBy(suppressedLog).for(handler);
          },
        },
        middleware(ware).for(noop),
    );

    const response = await server.get('/test');

    expect(response.statusCode).toBe(503);
    expect(response.statusMessage).toBe('Custom Error');
  });
  it('allows middleware to respond', async () => {
    ware.mockImplementation((_request, response) => {
      response.end('TEST');
    });

    server.handleBy(
        middleware(ware).for(noop),
    );

    const response = await server.get('/test');

    expect(response.statusCode).toBe(200);
    expect(await response.body()).toBe('TEST');
  });
});
