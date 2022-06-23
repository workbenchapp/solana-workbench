FROM ubuntu

# because tzdata still is stupid
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -yq curl libudev-dev git build-essential libssl-dev pkg-config

# make sure the setup.sh script can work
WORKDIR /app/bin/
COPY bin/setup.sh .
RUN ./setup.sh

# use the .profile and .bashrc files setup above
SHELL ["/bin/bash", "-c"]

# node-gyp needs python...
RUN apt-get install -yq python3 python-is-python3
WORKDIR /app/
# and now the source
#COPY ["package.json", "package-lock.json*", ".erb", "./"]
COPY . .
RUN rm -rf node_modules src/node_modules release/app/node_modules
RUN source /root/.profile && source $HOME/.nvm/nvm.sh \
    && npm install

# more DEBUG build info
ENV DEBUG=electron-rebuild

WORKDIR /app/release/app/
#COPY ["package.json", "package-lock.json*", "./"]
RUN source /root/.profile && source $HOME/.nvm/nvm.sh \
    && npm install

WORKDIR /app/
#COPY . .
RUN source /root/.profile && source $HOME/.nvm/nvm.sh \
    && npm run package
