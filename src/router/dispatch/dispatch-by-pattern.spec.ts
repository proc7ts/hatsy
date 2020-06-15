import {
  MatrixRoute,
  matrixRoute,
  matrixRoutePattern,
  rcaptureEntry,
  rmatchDirs,
  rmatchDirSep,
  URLRoute,
} from '@hatsy/route-match';
import { RouteMatcher } from '@hatsy/route-match/d.ts/route-matcher';
import { RequestContext } from '../../core';
import { HttpForwarding, httpListener, Rendering, RenderMeans } from '../../http';
import { readAll, testServer, TestServer } from '../../spec';
import { requestURL } from '../../util';
import { RouterMeans } from '../router-means';
import { Routing } from '../routing';
import { dispatchByPattern } from './dispatch-by-pattern';

describe('dispatchByPattern', () => {

  let server: TestServer;

  beforeAll(async () => {
    server = await testServer();
  });
  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.listener.mockReset();
  });

  it('follows matching route', async () => {

    const wrongHandler = jest.fn();

    server.listener.mockImplementation(httpListener(
        Rendering
            .and(Routing)
            .for(dispatchByPattern([
              {
                on: 'wrong',
                to: wrongHandler,
              },
              {
                on: 'test',
                to({ renderJson }) {
                  renderJson({ response: 'test' });
                },
              },
            ])),
    ));

    const response = await server.get('/test');

    expect(JSON.parse(await readAll(response))).toEqual({ response: 'test' });
    expect(wrongHandler).not.toHaveBeenCalled();
  });
  it('follows nested route', async () => {

    const wrongHandler = jest.fn();

    server.listener.mockImplementation(httpListener(
        Rendering
            .and(Routing)
            .for(dispatchByPattern({
              on: 'dir/**',
              to: dispatchByPattern({
                on: 'test',
                to({ renderJson }: RequestContext<RenderMeans & RouterMeans>) {
                  renderJson({ response: 'test' });
                },
              }),
            })),
    ));

    const response = await server.get('/dir/test');

    expect(JSON.parse(await readAll(response))).toEqual({ response: 'test' });
    expect(wrongHandler).not.toHaveBeenCalled();
  });
  it('respects route pattern parser override', async () => {

    const wrongHandler = jest.fn();

    const nested = dispatchByPattern({
      on: 'test;attr',
      to({ renderJson }: RequestContext<RenderMeans & RouterMeans<MatrixRoute>>) {
        renderJson({ response: 'test' });
      },
    });

    server.listener.mockImplementation(httpListener(
        Rendering
            .and(Routing)
            .for(dispatchByPattern({
              on: 'dir/**',
              async to({ next }) {
                await next(
                    nested,
                    {
                      route: matrixRoute('test;attr=value'),
                      routePattern: matrixRoutePattern,
                    },
                );
              },
            })),
    ));

    const response = await server.get('/dir/test;attr=value');

    expect(JSON.parse(await readAll(response))).toEqual({ response: 'test' });
    expect(wrongHandler).not.toHaveBeenCalled();
  });
  it('extracts route tail', async () => {
    server.listener.mockImplementation(httpListener(
        Rendering
            .and(Routing)
            .for(dispatchByPattern({
              on: 'test/**',
              to({ route, renderJson }) {
                renderJson({ route: route.toString() });
              },
            })),
    ));

    const response = await server.get('/test/nested?param=value');

    expect(JSON.parse(await readAll(response))).toEqual({ route: 'nested?param=value' });
  });
  it('uses matching route as tail', async () => {
    server.listener.mockImplementation(httpListener(
        Rendering
            .and(Routing)
            .for(dispatchByPattern({
              on: 'test/nested',
              to({ route, renderJson }) {
                renderJson({ route: route.toString() });
              },
            })),
    ));

    const response = await server.get('/test/nested?param=value');

    expect(JSON.parse(await readAll(response))).toEqual({ route: 'test/nested?param=value' });
  });
  it('extracts route tail with custom function', async () => {
    server.listener.mockImplementation(httpListener(
        Rendering
            .and(Routing)
            .for(dispatchByPattern({
              on: 'test/{tail:**}',
              to({ route, renderJson }) {
                renderJson({ route: String(route) });
              },
              tail({ routeMatch }) {

                let tail!: URLRoute;

                routeMatch((_type, key, _value, position: RouteMatcher.Position<URLRoute>) => {
                  if (key === 'tail') {
                    tail = position.route.section(position.entryIndex);
                  }
                });

                return tail;
              },
            })),
    ));

    const response = await server.get('/test/nested?param=value');

    expect(JSON.parse(await readAll(response))).toEqual({ route: 'nested?param=value' });
  });
  it('captures route matches', async () => {
    server.listener.mockImplementation(httpListener(
        Rendering
            .and(Routing)
            .for(dispatchByPattern({
              on: [rcaptureEntry('dir'), rmatchDirSep, rmatchDirs],
              to({ routeMatch, renderJson }) {

                const captured: (readonly [string, string | number, any])[] = [];

                routeMatch((type, key, value, _position): void => {
                  captured.push([type, key, value]);
                });

                renderJson(captured);
              },
            })),
    ));

    const response = await server.get('/test/nested');

    expect(JSON.parse(await readAll(response))).toEqual([['capture', 'dir', 'test'], ['dirs', 1, 2]]);
  });
  it('builds custom route', async () => {
    server.listener.mockImplementation(httpListener(Rendering.for(
        Routing.with<RenderMeans, MatrixRoute>({
          buildRoute({ request }) {
            return matrixRoute(requestURL(request, this.forwardTrust));
          },
          routePattern: matrixRoutePattern,
        }).for(dispatchByPattern({
          on: 'test;attr/**',
          to({ fullRoute, renderJson }) {
            renderJson({ attr: fullRoute.path[0].attrs.get('attr') });
          },
        })),
    )));

    const response = await server.get('/test;attr=val/nested?param=value');

    expect(JSON.parse(await readAll(response))).toEqual({ attr: 'val' });
  });
  it('extracts URL from trusted forwarding info', async () => {
    server.listener.mockImplementation(httpListener(
        HttpForwarding
            .with({ trusted: true })
            .and(Rendering)
            .and(Routing.with({
              forwardTrust: {
                trusted: true,
              },
            }))
            .for(dispatchByPattern({
              on: 'test/**',
              to({ fullRoute: { url: { href } }, renderJson }) {
                renderJson({ href });
              },
            })),
    ));

    const response = await server.get(
        '/test/nested?param=value',
        {
          headers: {
            forwarded: 'host=test.com:8443;proto=https',
          },
        },
    );

    expect(JSON.parse(await readAll(response))).toEqual({ href: 'https://test.com:8443/test/nested?param=value' });
  });
});
