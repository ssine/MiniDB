BEGIN;

CREATE TABLE bank (
    bank_id number,
    name    string
);

INSERT INTO bank VALUES
    (1, 'bank of china'),
    (2, 'bank of communications'),
    (3, 'china construction bank'),
    (4, 'postal savings bank of china'),
    (5, 'china citic bank')
;

CREATE TABLE account (
    account_id number,
    owner_name string
);

INSERT INTO account VALUES
    (1, 'sine'),
    (2, 'jill')
;

CREATE TABLE deposit (
    account_id number,
    bank_id    number,
    balance    number
);

INSERT INTO deposit VALUES
    (1, 1, 1000),
    (1, 1, 2000),
    (1, 3, 3000),
    (1, 4, 4000),
    (2, 1, 5000),
    (2, 4, 6000)
;

COMMIT;