## Solana Workbench

Work on Solana more easily in your local environment and gain access to lots
of other fun tricks too.

## Deps

- Node (latest version)
- Docker
- Yarn
- Anchor CLI must be available in PATH to use Anchor stuff
  - At the moment there's also a hack that I also use copying Serum's `dex/Anchor.toml`
    to top level of workbench directory. Otherwise Anchor complains about no TOML.

## Run

install deps:

```
$ yarn
```

run:

```
$ npm run-script start
```

Now you're working with Workbench!
