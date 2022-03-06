FROM ubuntu

# because tzdata still is stupid
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -yq curl libudev-dev git build-essential libssl-dev pkg-config

# make sure the setup.sh script can work
WORKDIR /app/bin/
COPY bin/setup.sh .
RUN ./setup.sh 