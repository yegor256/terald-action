/**
 * SPDX-FileCopyrightText: Copyright (c) 2024-2026 Yegor Bugayenko
 * SPDX-License-Identifier: MIT
 */

const { assertThat, hasProperties, is, promiseThat, rejected } = require('hamjest');
const Fake = require('./fake');
const Repo = require('../src/repo');

const random = () => Math.floor(Math.random() * 1000000) + 1000;

it('reads the document of the repository', async () => {
  const id = random();
  const fake = new Fake({ [`/repos/ya/b${id}/issues/${id}`]: { 'number': id } });
  const json = await new Repo(await fake.start(), `ya/b${id}`, 'hh').json(`/issues/${id}`);
  await fake.stop();
  assertThat('The document was not read', json, hasProperties({ 'number': id }));
});

it('sends the token to GitHub', async () => {
  const id = random();
  const fake = new Fake({ [`/repos/s/v${id}/pulls`]: [] });
  const token = `ghs_${random()}`;
  await new Repo(await fake.start(), `s/v${id}`, token).json('/pulls');
  await fake.stop();
  assertThat(
    'The token was not sent to GitHub',
    fake.hits()[0].headers.authorization,
    is(`Bearer ${token}`)
  );
});

it('fails when GitHub cannot find the document', async () => {
  const id = random();
  const fake = new Fake({});
  const url = await fake.start();
  await promiseThat(
    'The missing document was not reported',
    new Repo(url, `u/j${id}`, 'f7').json(`/actions/runs/${id}`).finally(() => fake.stop()),
    rejected()
  );
});
