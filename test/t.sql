SELECT owner_name 
FROM account INNER JOIN deposit ON account.account_id = deposit.account_id 
WHERE balance < 3000 OR balance > 4000;