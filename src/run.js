/**
 * SPDX-FileCopyrightText: Copyright (c) 2024-2026 Yegor Bugayenko
 * SPDX-License-Identifier: MIT
 */

/**
 * A single run of a GitHub Actions workflow in a repository,
 * which knows whether it failed, how long it lasted, and whether it fixed
 * a build that the previous runs of the same workflow had broken,
 * how many of them failed in a row, and since when.
 *
 * @todo #1:30min The list of workflow runs, returned by GitHub, may be stale
 *  and miss the conclusion of the previous run, as seen in the EC2 workflow of
 *  objectionary/eo. Let's retry the request a few times, with a bounded delay,
 *  until the current run appears in the list, as that workflow does.
 * @todo #1:45min The streak of failed runs is found only among the last
 *  hundred runs of the workflow, since GitHub returns no more on one page.
 *  A longer streak is undercounted and its start is misdated. Let's walk
 *  through the next pages until a successful run is found.
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
    return (await this.failures()) > 0;
  }
  async failures() {
    return (await this.#streak()).length;
  }
  async since() {
    const streak = await this.#streak();
    if (streak.length === 0) {
      throw new Error(`The run ${this.#id} has no failed runs before it`);
    }
    return new Date(streak.at(-1).run_started_at);
  }
  async #streak() {
    const run = await this.#repo.json(`/actions/runs/${this.#id}`);
    const { workflow_runs: runs } = await this.#repo.json(
      [
        `/actions/workflows/${run.workflow_id}/runs`,
        `?branch=${encodeURIComponent(run.head_branch)}&per_page=100`
      ].join('')
    );
    const previous = runs.filter(
      (item) => item.id < this.#id && ['failure', 'success'].includes(item.conclusion)
    );
    const end = previous.findIndex((item) => item.conclusion === 'success');
    if (end === -1) {
      return previous;
    }
    return previous.slice(0, end);
  }
}

module.exports = Run;
