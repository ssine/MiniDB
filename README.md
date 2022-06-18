# MiniDB

- [Overview](https://ssine.ink/zh-cn/posts/dbms-implementation-1/)
- [Project Structure](https://ssine.ink/zh-cn/posts/dbms-implementation-2/)
- [SQL Parsing and Running](https://ssine.ink/zh-cn/posts/dbms-implementation-3/)
- [Persistence](https://ssine.ink/zh-cn/posts/dbms-implementation-4/)

## Setup

```bash
# Clone this repository
git clone https://github.com/ssine/MiniDB.git
# Go into the repository
cd MiniDB
# Install dependencies
npm install
# Generate SQL Parser
npm run cc
# Run the app
npm start
```

## CLI Usage

All the input beginning with `.` is a system command:

所有以 `.` 开头的输入均为系统指令：

```text
.exit                        | 退出
.file filename               | 将文件内容作为输入
.createdb database_name      | 创建数据库
.dropdb database_name        | 删除数据库
.usedb database_name         | 使用数据库
.showdb                      | 显示所有数据库
.showtb                      | 显示当前数据库所有表
.planon                      | 显示 SELECT 语句执行计划
.planoff                     | 不显示 SELECT 语句执行计划
```

All the SQL statements are ended by `;`, supported statements:

所有 SQL 语句输入以 `;` 结尾，目前支持的 SQL 语句：

```sql
CREATE TABLE tbl_name (
    prop1 number,
    prop2 string
);

DROP TABLE tbl_name;

SELECT col_name_1, col_name_2
FROM tbl_name_1
INNER JOIN tbl_name_2 ON expression
INNER JOIN ...
WHERE expression;

INSERT INTO tbl_name VALUES
    (val_1, val_2),
    (val_1, val_2)
;

DELETE FROM tbl_name WHERE expression;

UPDATE tbl_name
SET col = expression
WHERE expression;
```

## Showcase

System commands, database management:

系统指令，数据库管理：

<img src="doc/syscmd.png" alt="dbm" width=700px />

Sample table:

样例表：

<img src="doc/tables.png" alt="ins" width=700px />

Insert statement and complex query (projection, condition, multi-table join):

插入语句与复杂查询（投影，条件，多表连接）：

<img src="doc/insert_select.png" alt="sel" width=700px />

Physics plan visualization (corresponding to previous query):

自动绘制物理计划（对应上面的查询）：

<img src="doc/plan.png" alt="plan" width=300px />

Update statement:

更新语句：

<img src="doc/update.png" alt="upd" width=700px />
