import React from 'react';
import { Request, Response } from 'express';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import createStore from './redux/configureStore';
import reduxRoutes from './pages/ReduxPage/reduxRoutes';

const renderHTML = (html: string, preloadedState: any) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>React Features</title>
      </head>
      <body>
        <div id="root">${html}</div>
        <script>
          window.PRELOADED_STATE = ${JSON.stringify(preloadedState).replace(/</g, '\\u003c')}        
        </script>
      </body>
    </html>
  `;
};

export default () => {
  return (req: Request, res: Response) => {
    const store = createStore();
    const context: { url?: string } = {};

    const root = (
      <App
        context={context}
        location={req.url}
        Router={StaticRouter}
        store={store}
      />
    );

    if (context.url) {
      res.writeHead(302, {
        Location: context.url
      });

      res.end();
      return;
    }

    // @ts-ignore
    store.runSaga().toPromise().then(() => {
      const html = renderToString(root);
      if (context.url) {
        res.writeHead(302, {
          Location: context.url
        });

        res.end();
        return;
      }

      const state = store.getState();

      res.send(renderHTML(html, state));
    });

    const promises: any = [];
    reduxRoutes.forEach((route) => {
      if (req.url === route.path && route.fetch) {
        promises.push(route.fetch(store.dispatch));
      }
    });

    // @ts-ignore
    return Promise.all(promises).then(() => store.close());
  };
}
