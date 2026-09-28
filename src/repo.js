/**
 * SPDX-FileCopyrightText: Copyright (c) 2024-2026 Yegor Bugayenko
 * SPDX-License-Identifier: MIT
 */

/**
 * A GitHub repository, reachable through the REST API with a token,
 * which answers with JSON documents found under its own path.
 */
class Repo {
  #api;
  #name;
  #token;
  constructor(api, name, token) {
    this.#api = api;
    this.#name = name;
    this.#token = token;
  }
  async json(path) {
    const res = await fetch(`${this.#api}/repos/${this.#name}${path}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${this.#token}`
      }
    });
    if (!res.ok) {
      throw new Error(`GitHub API responded with HTTP ${res.status} to ${path} of ${this.#name}`);
    }
    return res.json();
  }
}

module.exports = Repo;
