SELECT *
FROM account INNER JOIN deposit ON account.id = deposit.account_id;