/**
 * SPDX-FileCopyrightText: Copyright (c) 2024-2026 Yegor Bugayenko
 * SPDX-License-Identifier: MIT
 */

const { assertThat, containsString, hasItem, is, matchesPattern, not } = require('hamjest');
const Fake = require('./fake');
const path = require('path');
const { spawn } = require('child_process');

const random = () => Math.floor(Math.random() * 1000000) + 1000;

const launch = (url, env) => new Promise((resolve) => {
  const proc = spawn(
    'node',
    [path.resolve(__dirname, '../src/terald.js')],
    {
      env: {
        ...process.env,
        'GITHUB_API_URL': url,
        'GITHUB_SERVER_URL': 'https://github.example',
        'INPUT_CHAT': '-1009',
        'INPUT_GITHUB-TOKEN': 'ghs_abc',
        'INPUT_TELEGRAM': url,
        'INPUT_TOKEN': 'tg',
        ...env
      },
      timeout: 10000
    }
  );
  let stdout = '';
  proc.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  proc.on('close', (code) => resolve({ code, stdout }));
});

it('announces the failure of the build', async () => {
  const id = random();
  const fake = new Fake({
    '/bottg/sendMessage': { 'ok': true },
    [`/repos/ab/c${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'failure', 'steps': [] }]
    },
    [`/repos/ab/c${id}/actions/runs/${id}`]: { 'run_started_at': new Date().toISOString() }
  });
  await launch(await fake.start(), {
    'GITHUB_REPOSITORY': `ab/c${id}`,
    'GITHUB_RUN_ID': `${id}`,
    'GITHUB_WORKFLOW': 'mvn'
  });
  await fake.stop();
  assertThat(
    'The failure was not announced',
    JSON.parse(fake.hits().find((hit) => hit.path === '/bottg/sendMessage').body).text,
    containsString(
      [
        `\`mvn\` workflow of \`ab/c${id}\``,
        `just [failed](https://github.example/ab/c${id}/actions/runs/${id})`
      ].join(' ')
    )
  );
});

it('announces the recovery of the build', async () => {
  const id = random();
  const fake = new Fake({
    '/bottg/sendMessage': { 'ok': true },
    [`/repos/x/y${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'success', 'steps': [] }]
    },
    [`/repos/x/y${id}/actions/runs/${id}`]: {
      'head_branch': 'master',
      'run_started_at': new Date().toISOString(),
      'workflow_id': 42
    },
    [`/repos/x/y${id}/actions/workflows/42/runs?branch=master&per_page=100`]: {
      'workflow_runs': [
        { 'conclusion': 'failure', id: id - 1, 'run_started_at': '2026-05-07T10:00:00Z' }
      ]
    }
  });
  await launch(await fake.start(), {
    'GITHUB_REPOSITORY': `x/y${id}`,
    'GITHUB_RUN_ID': `${id}`,
    'GITHUB_WORKFLOW': 'make'
  });
  await fake.stop();
  assertThat(
    'The recovery was not announced',
    JSON.parse(fake.hits().find((hit) => hit.path === '/bottg/sendMessage').body).text,
    containsString('just [recovered]')
  );
});

it('announces the number of failures before the recovery', async () => {
  const id = random();
  const fake = new Fake({
    '/bottg/sendMessage': { 'ok': true },
    [`/repos/j/k${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'success', 'steps': [] }]
    },
    [`/repos/j/k${id}/actions/runs/${id}`]: {
      'head_branch': 'main',
      'run_started_at': new Date().toISOString(),
      'workflow_id': 19
    },
    [`/repos/j/k${id}/actions/workflows/19/runs?branch=main&per_page=100`]: {
      'workflow_runs': [
        { 'conclusion': 'failure', id: id - 1, 'run_started_at': '2026-12-23T17:05:31Z' },
        { 'conclusion': 'failure', id: id - 4, 'run_started_at': '2026-12-22T09:48:14Z' },
        { 'conclusion': 'success', id: id - 5, 'run_started_at': '2026-12-19T13:27:02Z' }
      ]
    }
  });
  await launch(await fake.start(), {
    'GITHUB_REPOSITORY': `j/k${id}`,
    'GITHUB_RUN_ID': `${id}`,
    'GITHUB_WORKFLOW': 'deep'
  });
  await fake.stop();
  assertThat(
    'The number of failures was not announced',
    JSON.parse(fake.hits().find((hit) => hit.path === '/bottg/sendMessage').body).text,
    containsString('s, after 2 failures since 22-Dec-2026')
  );
});

it('announces the duration in seconds when it is short', async () => {
  const id = random();
  const fake = new Fake({
    '/bottg/sendMessage': { 'ok': true },
    [`/repos/u/i${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'failure', 'steps': [] }]
    },
    [`/repos/u/i${id}/actions/runs/${id}`]: {
      'run_started_at': new Date(Date.now() - 37000).toISOString()
    }
  });
  await launch(await fake.start(), {
    'GITHUB_REPOSITORY': `u/i${id}`,
    'GITHUB_RUN_ID': `${id}`,
    'GITHUB_WORKFLOW': 'lint'
  });
  await fake.stop();
  assertThat(
    'The short duration was not announced in seconds',
    JSON.parse(fake.hits().find((hit) => hit.path === '/bottg/sendMessage').body).text,
    matchesPattern(/ in 3[789]s$/u)
  );
});

it('announces the duration in minutes when it is long', async () => {
  const id = random();
  const minutes = (random() % 500) + 2;
  const fake = new Fake({
    '/bottg/sendMessage': { 'ok': true },
    [`/repos/o/p${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'failure', 'steps': [] }]
    },
    [`/repos/o/p${id}/actions/runs/${id}`]: {
      'run_started_at': new Date(Date.now() - (minutes * 60000) - 7000).toISOString()
    }
  });
  await launch(await fake.start(), {
    'GITHUB_REPOSITORY': `o/p${id}`,
    'GITHUB_RUN_ID': `${id}`,
    'GITHUB_WORKFLOW': 'build'
  });
  await fake.stop();
  assertThat(
    'The long duration was not announced in minutes',
    JSON.parse(fake.hits().find((hit) => hit.path === '/bottg/sendMessage').body).text,
    containsString(` in ${minutes}min`)
  );
});

it('stays silent when the build is stable', async () => {
  const id = random();
  const fake = new Fake({
    '/bottg/sendMessage': { 'ok': true },
    [`/repos/m/n${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'success', 'steps': [] }]
    },
    [`/repos/m/n${id}/actions/runs/${id}`]: { 'head_branch': 'dev', 'workflow_id': 7 },
    [`/repos/m/n${id}/actions/workflows/7/runs?branch=dev&per_page=100`]: {
      'workflow_runs': [{ 'conclusion': 'success', id: id - 1 }]
    }
  });
  await launch(await fake.start(), {
    'GITHUB_REPOSITORY': `m/n${id}`,
    'GITHUB_RUN_ID': `${id}`,
    'GITHUB_WORKFLOW': 'ci'
  });
  await fake.stop();
  assertThat(
    'The stable build was announced',
    fake.hits().map((hit) => hit.path),
    not(hasItem('/bottg/sendMessage'))
  );
});

it('fails when the chat is not given', async () => {
  const id = random();
  const fake = new Fake({});
  const { code } = await launch(await fake.start(), {
    'GITHUB_REPOSITORY': `e/f${id}`,
    'GITHUB_RUN_ID': `${id}`,
    'INPUT_CHAT': ''
  });
  await fake.stop();
  assertThat('The missing chat was tolerated', code, is(1));
});
