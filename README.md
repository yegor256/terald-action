# GitHub Action to Deliver CI Failures to Telegram

[![test](https://github.com/yegor256/terald-action/actions/workflows/test.yml/badge.svg)](https://github.com/yegor256/terald-action/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/yegor256/terald-action/blob/master/LICENSE.txt)

Add it as the last step of your GitHub Actions job:

```yaml
name: build
jobs:
  build:
    runs-on: ubuntu-24.04
    permissions:
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@v6
      - run: make
      - if: always()
        uses: yegor256/terald-action@0.0.0
        with:
          token: ${{ secrets.TELEGRAM_TOKEN }}
          chat: -1009999999999
```

When your build fails, it sends a message to the Telegram chat.
When your build succeeds right after a failed run of the same workflow
  on the same branch, it sends a message saying that the build recovered.
Otherwise, it stays silent.

The `token` is the token of a Telegram bot, which you get from
  [@BotFather](https://t.me/BotFather).
The `chat` is the ID of the chat where the bot is a member.
Get it, as [explained](https://stackoverflow.com/questions/32423837).

The action reads the runs of the workflow through the GitHub API,
  that's why the job needs the `actions: read` permission.
The step needs `if: always()`, otherwise GitHub skips it after a failure.

You can also put it into a separate job, which waits for all other jobs:

```yaml
jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - run: make
  telegram:
    needs: build
    if: always()
    runs-on: ubuntu-24.04
    permissions:
      actions: read
    steps:
      - uses: yegor256/terald-action@0.0.0
        with:
          token: ${{ secrets.TELEGRAM_TOKEN }}
          chat: -1009999999999
```

## How to Contribute

If you want to contribute, make a fork, then create a branch.
Then run `npm test` in the root directory.
It should compile everything without errors.
If not, submit an issue and wait.
Otherwise, make your changes and then run `npm test` again.
If the build is still clean, submit a pull request.
