# MiniDB

* [概览](https://ssine.cc/2019-1-24/dbms-implementation-1)
* [项目结构](https://ssine.cc/2019-1-24/dbms-implementation-2)
* [SQL 解析与执行](https://ssine.cc/2019-1-24/dbms-implementation-3)
* [持久化](https://ssine.cc/2019-1-24/dbms-implementation-4)

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

所有以 `.` 开头的输入均为系统指令：

```text
.exit                        | 退出
.file [filename]             | 将文件内容作为输入
.createdb [database name]    | 创建数据库
.dropdb [database name]      | 删除数据库
.usedb [database name]       | 使用数据库
.showdb                      | 显示所有数据库
.showtb                      | 显示当前数据库所有表
```

所有 SQL 语句输入以 `;` 结尾，目前支持的 SQL 语句：

```sql
CREATE TABLE
DROP TABLE
SELECT
INSERT
DELETE
UPDATE
```

## TODO

* 显示执行计划
* npm 脚本只支持 windows
* 建立索引
* 更多的执行计划
