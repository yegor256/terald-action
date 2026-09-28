/**
 * SPDX-FileCopyrightText: Copyright (c) 2024-2026 Yegor Bugayenko
 * SPDX-License-Identifier: MIT
 */

const { assertThat, hasProperties, promiseThat, rejected } = require('hamjest');
const Chat = require('../src/chat');
const Fake = require('./fake');

const random = () => Math.floor(Math.random() * 1000000) + 1000;

it('posts the text to the chat', async () => {
  const token = `${random()}:AAF${random()}`;
  const chat = `-100${random()}`;
  const text = `Привет, ${random()} *мир*`;
  const fake = new Fake({ [`/bot${token}/sendMessage`]: { 'ok': true } });
  await new Chat(await fake.start(), token, chat).post(text);
  await fake.stop();
  assertThat(
    'The text was not posted to the chat',
    JSON.parse(fake.hits()[0].body),
    hasProperties({ 'chat_id': chat, 'parse_mode': 'Markdown', text })
  );
});

it('fails when Telegram rejects the message', async () => {
  const fake = new Fake({});
  const url = await fake.start();
  await promiseThat(
    'The rejected message was not reported',
    new Chat(url, `${random()}:bad`, `${random()}`).post('hi').finally(() => fake.stop()),
    rejected()
  );
});
