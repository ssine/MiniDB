SELECT owner_name, balance
FROM account INNER JOIN deposit ON account.account_id = deposit.account_id
WHERE balance > 2500;