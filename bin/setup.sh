#!/bin/bash

# - [Nvm](https://github.com/nvm-sh/nvm): 
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
# - Node (latest version): 
nvm install v16.14.0
# - Docker: 
#curl -o- https://get.docker.com | bash
# - Yarn:
corepack enable
# - Anchor CLI must be available in PATH to use Anchor stuff
#   - from https://book.anchor-lang.com/chapter_2/installation.html
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- --default-toolchain stable -y
source $HOME/.cargo/env
sh -c "$(curl -sSfL https://release.solana.com/v1.9.9/install)"
echo 'export PATH="/root/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
# needs build-essential libssl-dev pkg-config
# see https://github.com/project-serum/anchor/pull/1558 for `avm use --yes`
cargo install --git https://github.com/SvenDowideit/anchor --branch add-use--yes-for-non-interactie-use avm --locked --force
avm use --yes latest
#   - `warning: be sure to add `/home/sven/.avm/bin` to your PATH to be able to run the installed binaries`
