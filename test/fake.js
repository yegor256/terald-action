/**
 * SPDX-FileCopyrightText: Copyright (c) 2024-2026 Yegor Bugayenko
 * SPDX-License-Identifier: MIT
 */

const http = require('http');

/**
 * A local HTTP server that pretends to be GitHub or Telegram,
 * answering with prepared JSON documents and remembering every request.
 */
class Fake {
  #routes;
  #hits;
  #server;
  constructor(routes) {
    this.#routes = routes;
    this.#hits = [];
    this.#server = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        this.#hits.push({
          body: Buffer.concat(chunks).toString(),
          headers: req.headers,
          path: req.url
        });
        res.setHeader('Content-Type', 'application/json');
        if (Object.hasOwn(this.#routes, req.url)) {
          res.end(JSON.stringify(this.#routes[req.url]));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ message: 'Not Found' }));
        }
      });
    });
  }
  start() {
    return new Promise((resolve) => {
      this.#server.listen(0, '127.0.0.1', () => {
        resolve(`http://127.0.0.1:${this.#server.address().port}`);
      });
    });
  }
  hits() {
    return this.#hits;
  }
  stop() {
    return new Promise((resolve) => {
      this.#server.close(resolve);
    });
  }
}

module.exports = Fake;
