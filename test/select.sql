SELECT owner_name, balance
FROM account INNER JOIN deposit ON account.account_id = deposit.account_id
WHERE balance > 2500 AND balance < 5000;