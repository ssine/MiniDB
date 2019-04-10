SELECT owner_name, name, balance
FROM account
INNER JOIN deposit ON account.account_id = deposit.account_id
INNER JOIN bank ON bank.bank_id = deposit.bank_id
WHERE balance > 2500 AND balance < 5000;