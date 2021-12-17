CREATE TABLE net (
    id INTEGER PRIMARY KEY,
    name TEXT,
);

INSERT INTO net (
    
)

CREATE TABLE account (
    id INTEGER PRIMARY KEY,
    pubkey TEXT NOT NULL,
    net_id INTEGER,
    human_name TEXT DEFAULT "",
);

CREATE TABLE account_group (
    id INTEGER PRIMARY KEY,
    name TEXT DEFAULT "",
)

CREATE TABLE account_group_assoc (
    id INTEGER PRIMARY KEY,
    account_id INTEGER,
    group_id INTEGER,
);