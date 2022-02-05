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
