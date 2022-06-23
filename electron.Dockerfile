FROM python:3

COPY . /solana-workbench
WORKDIR /solana-workbench
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash - && apt-get install -y nodejs
ENV DEBUG electron-rebuild
RUN rm -f /usr/bin/python && ln -s /usr/bin/python3 /usr/bin/python

# Need Typescript, etc. for native extension build to work
RUN npm install
RUN (cd ./release/app npm install)
RUN npm build
