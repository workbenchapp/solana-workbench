## Solana Workbench

Work on Solana more easily in your local environment and gain access to lots
of other fun tricks too.

## Deps

- Node (latest version)
- Docker
- Yarn
- Anchor CLI must be available in PATH to use Anchor stuff
- XCode Command Line Tools (if on OSX)

## Run

install native deps:

```
$ yarn || true
... will complain saying to do following, but it's ok ...
$ (cd release/app && npm install @solana/web3.js)
```

now install top level deps:

```
$ yarn
```

run:

```
$ npm run start
```

Now you're working with Workbench!
