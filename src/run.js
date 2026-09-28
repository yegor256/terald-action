/**
 * SPDX-FileCopyrightText: Copyright (c) 2024-2026 Yegor Bugayenko
 * SPDX-License-Identifier: MIT
 */

/**
 * A single run of a GitHub Actions workflow in a repository,
 * which knows whether it failed, how long it lasted, and whether it fixed
 * a build that the previous run of the same workflow had broken.
 *
 * @todo #1:30min The list of workflow runs, returned by GitHub, may be stale
 *  and miss the conclusion of the previous run, as seen in the EC2 workflow of
 *  objectionary/eo. Let's retry the request a few times, with a bounded delay,
 *  until the current run appears in the list, as that workflow does.
 */
class Run {
  #repo;
  #id;
  constructor(repo, id) {
    this.#repo = repo;
    this.#id = id;
  }
  async failed() {
    const { jobs } = await this.#repo.json(`/actions/runs/${this.#id}/jobs?per_page=100`);
    return jobs.
      flatMap((job) => [job, ...job.steps]).
      some((item) => ['failure', 'timed_out'].includes(item.conclusion));
  }
  async seconds() {
    const run = await this.#repo.json(`/actions/runs/${this.#id}`);
    return Math.max(0, Math.round((Date.now() - Date.parse(run.run_started_at)) / 1000));
  }
  async recovered() {
    if (await this.failed()) {
      return false;
    }
    const run = await this.#repo.json(`/actions/runs/${this.#id}`);
    const { workflow_runs: runs } = await this.#repo.json(
      [
        `/actions/workflows/${run.workflow_id}/runs`,
        `?branch=${encodeURIComponent(run.head_branch)}&per_page=100`
      ].join('')
    );
    const [previous] = runs.filter(
      (item) => item.id < this.#id && ['failure', 'success'].includes(item.conclusion)
    );
    return previous?.conclusion === 'failure';
  }
}

module.exports = Run;
