/**
 * SPDX-FileCopyrightText: Copyright (c) 2024-2026 Yegor Bugayenko
 * SPDX-License-Identifier: MIT
 */

/**
 * A Telegram chat, reachable through the Bot API with the token
 * of a bot that is a member of it.
 */
class Chat {
  #api;
  #token;
  #id;
  constructor(api, token, id) {
    this.#api = api;
    this.#token = token;
    this.#id = id;
  }
  async post(text) {
    const res = await fetch(`${this.#api}/bot${this.#token}/sendMessage`, {
      body: JSON.stringify({
        'chat_id': this.#id,
        'disable_web_page_preview': true,
        'parse_mode': 'Markdown',
        text
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    });
    if (!res.ok) {
      throw new Error(
        `Telegram responded with HTTP ${res.status} to the message for chat ${this.#id}`
      );
    }
  }
}

module.exports = Chat;
