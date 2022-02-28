## Solana Workbench

Work on Solana more easily in your local environment and gain access to lots
of other fun tricks too.

## Deps

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
  - `avm use latest` -- dies on my linux box (needs libudev) - which makes me think there's lots of hidden dependences.
- XCode Command Line Tools (if on OSX)

## Run

Install modules, then native deps:

```
$ npm install --legacy-peer-deps &&
  (cd release/app && npm install)
```

To get `npm run package` to run on M1 mac, Node version 16 was required.

to run:

```
$ npm run start
```

Now you're working with Workbench!
