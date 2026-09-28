/**
 * SPDX-FileCopyrightText: Copyright (c) 2024-2026 Yegor Bugayenko
 * SPDX-License-Identifier: MIT
 */

const { assertThat, greaterThanOrEqualTo, is } = require('hamjest');
const Fake = require('./fake');
const Repo = require('../src/repo');
const Run = require('../src/run');

const random = () => Math.floor(Math.random() * 1000000) + 1000;

it('reports failure when one of the jobs failed', async () => {
  const id = random();
  const fake = new Fake({
    [`/repos/yegor256/abc${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'success', 'steps': [] }, { 'conclusion': 'failure', 'steps': [] }]
    }
  });
  const failed = await new Run(new Repo(await fake.start(), `yegor256/abc${id}`, 'x9'), id).
    failed();
  await fake.stop();
  assertThat('The failed job was not noticed', failed, is(true));
});

it('reports failure when a step of the running job failed', async () => {
  const id = random();
  const fake = new Fake({
    [`/repos/foo/bar-${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [
        {
          'conclusion': null,
          'steps': [{ 'conclusion': 'success' }, { 'conclusion': 'failure' }]
        }
      ]
    }
  });
  const failed = await new Run(new Repo(await fake.start(), `foo/bar-${id}`, 'tk'), id).failed();
  await fake.stop();
  assertThat('The failed step was not noticed', failed, is(true));
});

it('reports failure when one of the jobs timed out', async () => {
  const id = random();
  const fake = new Fake({
    [`/repos/q/w${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'timed_out', 'steps': [] }]
    }
  });
  const failed = await new Run(new Repo(await fake.start(), `q/w${id}`, 'zz'), id).failed();
  await fake.stop();
  assertThat('The timed out job was not noticed', failed, is(true));
});

it('denies failure when all jobs succeeded', async () => {
  const id = random();
  const fake = new Fake({
    [`/repos/xy/z_${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [
        { 'conclusion': 'success', 'steps': [{ 'conclusion': 'success' }] },
        { 'conclusion': null, 'steps': [{ 'conclusion': 'skipped' }, { 'conclusion': null }] }
      ]
    }
  });
  const failed = await new Run(new Repo(await fake.start(), `xy/z_${id}`, 'k'), id).failed();
  await fake.stop();
  assertThat('The healthy run was reported as failed', failed, is(false));
});

it('counts seconds since the start of the run', async () => {
  const id = random();
  const past = random() % 5000;
  const fake = new Fake({
    [`/repos/abc/d${id}/actions/runs/${id}`]: {
      'run_started_at': new Date(Date.now() - (past * 1000)).toISOString()
    }
  });
  const seconds = await new Run(new Repo(await fake.start(), `abc/d${id}`, 'pq'), id).seconds();
  await fake.stop();
  assertThat('The elapsed time was not counted', seconds, is(greaterThanOrEqualTo(past)));
});

it('reports recovery when the previous run failed', async () => {
  const id = random();
  const flow = random();
  const fake = new Fake({
    [`/repos/me/r${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'success', 'steps': [] }]
    },
    [`/repos/me/r${id}/actions/runs/${id}`]: { 'head_branch': 'fix/some', 'workflow_id': flow },
    [`/repos/me/r${id}/actions/workflows/${flow}/runs?branch=fix%2Fsome&per_page=100`]: {
      'workflow_runs': [
        { 'conclusion': 'success', 'id': id + 7 },
        { 'conclusion': null, id },
        { 'conclusion': 'cancelled', 'id': id - 3 },
        { 'conclusion': 'failure', 'id': id - 5 },
        { 'conclusion': 'success', 'id': id - 9 }
      ]
    }
  });
  const recovered = await new Run(new Repo(await fake.start(), `me/r${id}`, 'z1'), id).
    recovered();
  await fake.stop();
  assertThat('The recovery was not noticed', recovered, is(true));
});

it('denies recovery when the previous run succeeded', async () => {
  const id = random();
  const flow = random();
  const fake = new Fake({
    [`/repos/you/t${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'success', 'steps': [] }]
    },
    [`/repos/you/t${id}/actions/runs/${id}`]: { 'head_branch': 'master', 'workflow_id': flow },
    [`/repos/you/t${id}/actions/workflows/${flow}/runs?branch=master&per_page=100`]: {
      'workflow_runs': [
        { 'conclusion': 'success', 'id': id - 1 },
        { 'conclusion': 'failure', 'id': id - 2 }
      ]
    }
  });
  const recovered = await new Run(new Repo(await fake.start(), `you/t${id}`, 'o0'), id).
    recovered();
  await fake.stop();
  assertThat('The stable run was reported as recovered', recovered, is(false));
});

it('denies recovery when there is no previous run', async () => {
  const id = random();
  const flow = random();
  const fake = new Fake({
    [`/repos/p/n${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'success', 'steps': [] }]
    },
    [`/repos/p/n${id}/actions/runs/${id}`]: { 'head_branch': 'main', 'workflow_id': flow },
    [`/repos/p/n${id}/actions/workflows/${flow}/runs?branch=main&per_page=100`]: {
      'workflow_runs': [{ 'conclusion': null, id }]
    }
  });
  const recovered = await new Run(new Repo(await fake.start(), `p/n${id}`, 'e4'), id).
    recovered();
  await fake.stop();
  assertThat('The first run was reported as recovered', recovered, is(false));
});

it('denies recovery when the run itself failed', async () => {
  const id = random();
  const fake = new Fake({
    [`/repos/k/m${id}/actions/runs/${id}/jobs?per_page=100`]: {
      'jobs': [{ 'conclusion': 'failure', 'steps': [] }]
    }
  });
  const recovered = await new Run(new Repo(await fake.start(), `k/m${id}`, 'r5'), id).
    recovered();
  await fake.stop();
  assertThat('The failed run was reported as recovered', recovered, is(false));
});

it('counts consecutive failures before the run', async () => {
  const id = random();
  const flow = random();
  const fake = new Fake({
    [`/repos/g/h${id}/actions/runs/${id}`]: { 'head_branch': 'trunk', 'workflow_id': flow },
    [`/repos/g/h${id}/actions/workflows/${flow}/runs?branch=trunk&per_page=100`]: {
      'workflow_runs': [
        { 'conclusion': 'failure', 'id': id + 2 },
        { 'conclusion': null, id },
        { 'conclusion': 'failure', 'id': id - 1 },
        { 'conclusion': 'cancelled', 'id': id - 4 },
        { 'conclusion': 'failure', 'id': id - 6 },
        { 'conclusion': 'failure', 'id': id - 8 },
        { 'conclusion': 'success', 'id': id - 11 },
        { 'conclusion': 'failure', 'id': id - 13 }
      ]
    }
  });
  const failures = await new Run(new Repo(await fake.start(), `g/h${id}`, 'u7'), id).
    failures();
  await fake.stop();
  assertThat('The consecutive failures were miscounted', failures, is(3));
});

it('counts no failures when the previous run succeeded', async () => {
  const id = random();
  const flow = random();
  const fake = new Fake({
    [`/repos/s/v${id}/actions/runs/${id}`]: { 'head_branch': 'rel', 'workflow_id': flow },
    [`/repos/s/v${id}/actions/workflows/${flow}/runs?branch=rel&per_page=100`]: {
      'workflow_runs': [
        { 'conclusion': 'success', 'id': id - 2 },
        { 'conclusion': 'failure', 'id': id - 3 }
      ]
    }
  });
  const failures = await new Run(new Repo(await fake.start(), `s/v${id}`, 'b3'), id).
    failures();
  await fake.stop();
  assertThat('The failures were counted after a success', failures, is(0));
});

it('finds the start of the earliest consecutive failure', async () => {
  const id = random();
  const flow = random();
  const fake = new Fake({
    [`/repos/c/l${id}/actions/runs/${id}`]: { 'head_branch': 'b7', 'workflow_id': flow },
    [`/repos/c/l${id}/actions/workflows/${flow}/runs?branch=b7&per_page=100`]: {
      'workflow_runs': [
        { 'conclusion': 'failure', 'id': id - 2, 'run_started_at': '2026-03-17T08:41:09Z' },
        { 'conclusion': 'cancelled', 'id': id - 3, 'run_started_at': '2026-03-16T11:02:55Z' },
        { 'conclusion': 'failure', 'id': id - 7, 'run_started_at': '2026-03-14T23:19:37Z' },
        { 'conclusion': 'success', 'id': id - 9, 'run_started_at': '2026-03-11T04:12:48Z' }
      ]
    }
  });
  const since = await new Run(new Repo(await fake.start(), `c/l${id}`, 'n2'), id).since();
  await fake.stop();
  assertThat(
    'The start of the failures was not found',
    since.toISOString(),
    is('2026-03-14T23:19:37.000Z')
  );
});
