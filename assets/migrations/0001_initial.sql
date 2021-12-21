CREATE TABLE net (ID INTEGER PRIMARY KEY, name TEXT);

INSERT INTO
    net (name)
VALUES
    ("localhost"), ("devnet"), ("mainnet"), ("testnet");

CREATE TABLE account (
    ID INTEGER PRIMARY KEY,
    pubKey TEXT NOT NULL,
    netID INTEGER,
    humanName TEXT DEFAULT ""
);

CREATE INDEX index_name ON account(pubKey);

CREATE TABLE account_group (
    ID INTEGER PRIMARY KEY,
    name TEXT DEFAULT ""
);

CREATE TABLE account_group_assoc (
    ID INTEGER PRIMARY KEY,
    accountID INTEGER,
    groupID INTEGER
);