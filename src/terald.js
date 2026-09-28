/**
 * SPDX-FileCopyrightText: Copyright (c) 2024-2026 Yegor Bugayenko
 * SPDX-License-Identifier: MIT
 */

const Chat = require('./chat');
const Repo = require('./repo');
const Run = require('./run');

const variable = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`The environment variable ${name} is not set`);
  }
  return value;
};

const input = (name) => variable(`INPUT_${name.toUpperCase()}`);

const day = (date) => [
  String(date.getUTCDate()).padStart(2, '0'),
  date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
  date.getUTCFullYear()
].join('-');

const failures = (count) => {
  if (count === 1) {
    return '1 failure';
  }
  return `${count} failures`;
};

const duration = (seconds) => {
  if (seconds > 60) {
    return `${Math.round(seconds / 60)}min`;
  }
  return `${seconds}s`;
};

const log = (line) => process.stdout.write(`${line}\n`);

(async () => {
  const repo = variable('GITHUB_REPOSITORY');
  const id = Number(variable('GITHUB_RUN_ID'));
  const chat = new Chat(input('telegram'), input('token'), input('chat'));
  const run = new Run(
    new Repo(process.env.GITHUB_API_URL || 'https://api.github.com', repo, input('github-token')),
    id
  );
  const report = async (verb, emoji, tail = '') => {
    await chat.post(
      [
        `${emoji} The \`${process.env.GITHUB_WORKFLOW}\` workflow of \`${repo}\``,
        `just [${verb}](${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${id})`,
        `in ${duration(await run.seconds())}${tail}`
      ].join(' ')
    );
    log(`The build of ${repo} ${verb}, and Telegram was told about it`);
  };
  if (await run.failed()) {
    await report('failed', '⚠️');
  } else if (await run.recovered()) {
    await report(
      'recovered',
      '🍓',
      `, after ${failures(await run.failures())} since ${day(await run.since())}`
    );
  } else {
    log(`The build of ${repo} is neither failed nor recovered, nothing to report`);
  }
})().catch((ex) => {
  log(`::error::${ex.message}`);
  process.exitCode = 1;
});
