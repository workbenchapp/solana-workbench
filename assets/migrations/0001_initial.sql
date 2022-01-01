CREATE TABLE net (ID INTEGER PRIMARY KEY, name TEXT);

INSERT INTO
    net (name)
VALUES
    ("localhost"), ("devnet"), ("mainnet"), ("testnet");

CREATE TABLE account (
    id INTEGER PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    pubKey TEXT NOT NULL,
    net TEXT NOT NULL,
    humanName TEXT DEFAULT ""
);

CREATE INDEX index_name ON account(pubKey);

CREATE TABLE account_group (
    id INTEGER PRIMARY KEY,
    name TEXT DEFAULT ""
);

CREATE TABLE account_group_assoc (
    id INTEGER PRIMARY KEY,
    accountID INTEGER,
    groupID INTEGER
);