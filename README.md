## Solana Workbench
![](https://user-images.githubusercontent.com/28492/167247189-af6778ba-e8ee-4676-a7f1-ec5b9792b8b7.png)
Solana Workbench is your one stop shop for local Solana development.

Deploy local validators, airdrop tokens, and more with its GUI on OSX and Windows.
Solana development may be like chewing glass today, but we’re on a mission to change
that forever.

## Build dependencies

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

>> NOTE: use `bin/setup.sh` for both Linux and OSX (but don't forget to add XCode cmdline tools for OSX) - it basically does the following

- [Nvm](https://github.com/nvm-sh/nvm): `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash`
- Node (latest version): `nvm install 16.15.0` and `nvm use 16.15.0`
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

### Linux

to build the rust based tools (`solana` and `anchor` cli's), you will also need to install some native build tools and libraries. (See the Dockerfile for more)

```
sudo apt-get install -yq curl libudev-dev git build-essential libssl-dev pkg-config
```

### OSX

- XCode Command Line Tools (if on OSX)
- on OSX some path stuffing around, so solana and anchor binaries are in the path (for development)

### Windows (native)

without anchor tooling for now

- [NVM for Windows](https://github.com/coreybutler/nvm-windows)
- Node (latest version): `nvm install 16.15.0`
- as Administrator `nvm use 16.15.0`
- Yarn: `corepack enable`
- `npm install --legacy-peer-deps`
- `cd ./release/app/`
- `npm install --legacy-peer-deps`


## Run

to run:

```
$ npm run start
```

Now you're working with Workbench!

## building a release

On each platform (OSX, Windows, Linux), run:

```
git clone https://github.com/workbenchapp/solana-workbench new-release-dir
cd new-release-dir
npm install --legacy-peer-deps
cd ./release/app/
npm install --legacy-peer-deps
cd ../..
npm install --legacy-peer-deps
npm run package
```

>> TODO: add the signing steps for each platform.

then copy the appimage/dmg/exe to a staging dir, and run

```

```