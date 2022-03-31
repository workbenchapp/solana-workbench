## Solana Workbench
![](https://github.com/workbenchapp/solana-workbench-releases/raw/main/solworkbench.png?s=200)
Solana Workbench is your one stop shop for local Solana development.

Deploy local validators, airdrop tokens, and more with its GUI on OSX and Windows.
Solana development may be like chewing glass today, but we’re on a mission to change
that forever.

## Deps

If you already have Node on your system (we recommend version 17), you can
install the Node deps like so:

```
$ npm install --legacy-peer-deps && \
    (cd ./release/app/ && npm install --legacy-peer-deps) && \
    npm install --legacy-peer-deps
```

In order to use Anchor functionality, the `anchor` CLI must be
installed. To connect to a local test validator, you can either
run one yourself on the CLI, or use the Docker functionality via
the app.

Detailed instructions:

>> NOTE: see `bin/setup.sh`

- [Nvm](https://github.com/nvm-sh/nvm): `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash`
- Node (latest version): `nvm install v16.14.0`
- Docker: `curl -o- https://get.docker.com | bash`
- Yarn: `corepack enable`
- Anchor CLI must be available in PATH to use Anchor stuff
  - from https://book.anchor-lang.com/chapter_2/installation.html
  - `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
  - `source $HOME/.cargo/env`
  - `sh -c "$(curl -sSfL https://release.solana.com/v1.9.9/install)"`
  - `cargo install --git https://github.com/project-serum/anchor avm --locked --force`
  - `avm use latest` -- needed on Linux (needs `libudev-dev`)
  - Be sure to add `$HOME/.avm/bin` to your PATH to be able to run the installed binaries
- XCode Command Line Tools (if on OSX)

## Run

to run:

```
$ npm run start
```

Now you're working with Workbench!

## building a release

To get `npm run package` to run on M1 mac, Node version 16 was required.
