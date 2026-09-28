# GitHub Action to Deliver CI Failures to Telegram

[![test](https://github.com/yegor256/terald-action/actions/workflows/test.yml/badge.svg)](https://github.com/yegor256/terald-action/actions/workflows/test.yml)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/yegor256/terald-action/blob/master/LICENSE.txt)

Add it to your GitHub Actions workflow:

```yaml
name: build
jobs:
  build:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: yegor256/terald-action@0.0.0
        with:
          token: ...
          chat: 99999999999
```

When your build fails, it will send a message to Telegram.

## How to Contribute

If you want to contribute, make a fork, then create a branch.
Then run `npm test` in the root directory.
It should compile everything without errors.
If not, submit an issue and wait.
Otherwise, make your changes and then run `npm test` again.
If the build is still clean, submit a pull request.
