# Mysql高级

## Day1  MySQL执行流程与架构

通信方式一般是同步的。

连接方式：长连接、短连接

Mysql通常是用的长连接，避免建立连接和断开连接的开销。通常为了复用，我们可以将MySQL长连接放入到连接池中。

并不意味着长连接越多越好，因为长连接是占用服务端内存的。

```sql
-- 查看连接情况
show gloable status like 'thread%';
```

![image-20230813185919419](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230813185919419.png)

查看我们的MySQL超时等待时间：

```sql
show GLOBAL VARIABLES like 'wait_timeout'; 
```

![image-20230813190238067](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230813190238067.png)

默认是查过了8个小时没有操作就进入了睡眠状态。

**MySQL默认的最大连接数是多少？**

```sql
show VARIABLES like 'max_connections';
```

结果是151个。

并发数（最大连接数）是100000个。官方文档可见。

修改参数

```sql
-- 动态的修改参数
set max_connections = ;
-- 自动提交
set autocommit = on;

-- 永久修改
-- my.ini文件
```

参数有两个级别：1、global（全局的范围）；2、Session（当前窗口的范围）

1会影响到其他地方的级别。

8版本出现了一个新的参数，**persit**，可以直接修改配置文件。



### 通信协议

- TCP/IP
- Socket

### 通信方式

单工、双工、半双工

![image-20230813191719505](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230813191719505.png)

MySQL中用到的是半双工，客户端发送给服务端之后需要等到服务端处理完成之后重新回访给客户端。

同时客户端可以向服务端发送的SQL语句大小不可以超过4M。

注意问题：

在查询数据库的数据时，一定要避免全查，要使用**limit**做限制。（limit （0，1000））。

此时我们客户端已经和服务端建立了连接。

然后如果我们的库中有许多数据，500万条数据。第一次使用select 时候，会很慢。

第二次也会很慢，那不应该啊？不是有缓存吗？

原因是MySQL默认的缓存并没有开启：

```sql
show variables like 'query_cache%';
```

为什么没有开启这个缓存呢？

原因是MySQL中如果一条sql语句出现了空格或者大小写修改，甚至是数据的更改，都会进行一次新的select ，所以MySQL默认就没有开启这个。

### 解析器（词法语法的分析）

做词法解析和语法解析。

解析树：

![image-20230813194759374](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230813194759374.png)

### 预处理（语义的分析）

你的表名、字段名不存在。

### 优化器

对我们的sql语句进行一个分析，得到一个执行计划（execution plans），使用的优化器叫做CBO。



### 执行计划



### 执行器



### 存储引擎

有哪些存储引擎？

Innodb、MyIsam、Memory、CSV、Archive、Blackhole等。



用户----->buffer pool------>DBFile。其实用户在提交一个请求的时候，并不是直接修改DBFile，而是先整一个BufferPool，然后对于这个BufferPool进行刷盘操作，在BufferPool中还没有持久化到磁盘上的数据页叫做脏页（Page dirty）。

![image-20230814191624461](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230814191624461.png)

> 内存丢失怎么办？

这个时间，我们的redo Log其实就登场了。它会记录下我们每一条在BufferPool中的命令（除了select ）。然后才会刷到DB文件中。

但是这个时间又有一个问题：我既然需要从buffer pool先执行到redolog，然后再刷新到磁盘文件中，那么我为什么不直接刷新到磁盘中呢？

> 为什么不直接刷新到磁盘，而需要一个redolog呢？

这就涉及到顺序读和随机读的概念了。顺序读的效率要高于随机读。



> undo log（逻辑日志）

为了保证ACID的A，原子性。就是为了对整个事务进行回滚。

> 更新一条数据的过程

假设我们的SQL语句：

```sql
update user set name = "pengyuyan" where id = '1';
```

1. 首先将磁盘、内存中的数据返回给Server。
2. 修改值为‘pengyuyan’。
3. 记录redo log和undo log
4. 调用存储引擎的接口，再Buffer Pool中修改我们的值为'pengyuyan'。
5. 事务提交

server层有一个文件叫做binlog日志。记录的是DDL、DML语句。

![image-20230814194131504](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230814194131504.png)

> 更新流程的执行流程

![image-20230814194533775](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230814194533775.png)

## Day2  Mysql索引的 原理以及使用的原则

> 索引的作用

> 索引是什么

是数据库管理系统中的一个排序的数据结构，以协助快速查询、更新数据库表中的数据。

![image-20230814210728239](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230814210728239.png)

> 对于索引的分类

唯一索引（Unique）

主键索引

全文索引（Full Text）

```sql
-- 使用全文索引,需要注意：against中的查询的最小是4位
SELECT * from fulltext_test where MATCH(content) against('模糊查询' IN NATURAL LANGUAGE MODE);
```

> 我们通过一个例子来说明情况

假设双十一刚过去，我要你猜一下我花了多少钱？你猜的是10000，我说小了，你又说30000，我说大了，那么你是不是应该猜20000，这难道不是一个二分法？

由此一来，我们思考一下，可不可以使用链表来实现二分法呢？答案是肯定的。二叉树就是我们想要的。

![image-20230814213148602](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230814213148602.png)

> AVL树、B树、B+树分别解决了什么问题？

AVL树：

![image-20230814213620207](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230814213620207.png)

其实MySQL的一个数据页本身是16KB，但是如果使用我们的 AVL平衡二叉树，那么每一个页大小也就几十个Byte。那么其实会大大降低我们的IO利用率，并且我们的数据都是存放在每一个节点上，那么如果要查询23这一条数据，那么我们需要从26-->19-->23，需要3次IO，那么如果数据量十分的大，那么会发生什么？将会有大量的IO操作，那性能可想而知，就不用玩了。

为了解决这个问题，我们需要对整体进行修改。我们考虑将我们的许多节点放在我们的同一个磁盘块上。那么这样子的话就不用每一次查找都进行一次IO了。性能大大提高。但是同时，我们的数据结构也会发生改变，有之前的 瘦高瘦高的AVL平衡树到我们的矮胖矮胖的**B树**

![image-20230815125013951](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230815125013951.png)

2千万的数据也只需要3层的结构，IO大大减少。

那么这个2000万的数据是怎么得到的呢？

我们假设我们的非叶子节点是14个字节，一张页大小是16KB，那么一个节点就是1170个单元，对于每一个单元分出的第二层，每一个单元都会有1170个单元，那么第二层就是1368900个数据，有意第三层就是2000万条数据。

![image-20230815183610301](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230815183610301.png)

**B+树**

叶子节点放数据的磁盘地址。

![image-20230815184029859](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230815184029859.png)

> 比较B树和B+树的却别

- B Tree能够解决的问题，B+ Tree都能解决。
- 扫库、扫表的能力更强
- 磁盘读写的能力更强
- 排序能力稳定
- 效率更加稳定

**Hash索引**

![image-20230815185045578](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230815185045578.png)

hash中索引的字段值是要经过一个hash运算，然后映射到我们的 磁盘中。既然如此，那么我们就没有办法按照 > , < 来查询。毕竟是经过了Hash运算的。

默认我们是不会使用到Hash索引的，并且InnoDB一般是不支持的，但是有一个地方用到了Hash，就是在Buffer Pool之间会自动创建一个Hash索引。目的就是为了将热点数据加上索引，更好的返回我们的查询结果。加快了查询效率。

![image-20230815190316275](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230815190316275.png)

索引是存储在存储引擎中的。

> MyIsam和Innodb的却别和联系

- MyISAM

myISAM的数据文件存放在MYD文件中，同样是使用的B+ 树，叶子节点存放磁盘的地址。

![image-20230815191045750](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230815191045750.png)

- InnoDB

主键索引

![image-20230815191522033](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230815191522033.png)

如果是主键索引，那么对应的数据也是直接跟在这个主键索引的后边。就不会有找到该索引之后找到对应的磁盘地址，然后进行一边查询。

> 创建联合索引

联合索引的最左匹配原则

```sql
ALTER TABLE user_innodb add INdex `comidx_name_phone`(`name`,`phone`);
```

基于第一个字段进行排序，将第一个字段排完序之后，如果第一个字段相同，那么我才可以使用到第二个字段进行排序。

```sql
-- 建立索引
ALTER TABLE	user_innodb ADD INDEX conidx_name_phone (name, phone);


-- 看是否走索引
EXPLAIN SELECT * FROM user_innodb WHERE name = 'qing' and phone = '18199876543'; -- 使用到了索引
EXPLAIN SELECT * FROM user_innodb WHERE name = 'qing'; -- 也是可以使用到索引
EXPLAIN SELECT * FROM user_innodb WHERE phone = '18199876543' and name = 'qing'; -- 使用到了索引，原因是我们的优化器对我们的顺序进行了调换
EXPLAIN SELECT * FROM user_innodb WHERE phone = '18199876543'; -- 使用不到索引
```

> 覆盖索引

消除回表操作。在主键上的。

> 索引是越多越好吗？

散列度：是一个字段用来区分重复度的概念。如果说散列读越高，那么说明越适合建立索引，而性别这一类的话并不适合做索引。

如果数据全部都是1，那么B+树怎么区分是左边的小的合适，还是右边的 大的合适呢？有歧义。

> 为什么推荐使用递增的 ID作为主键索引？

自增id可以保证每次插入B+树索引都是从右边扩展的，可以避免B+树 的聚合和分裂。而使用UUID的话，为了保证索引有序，MySQL需要将插入的数据放到合适的位置，这就需要耗费一些时间以及性能。



## Day3  Mysql事务与锁的详解

> 作业：事务的特性：原子性、隔离性、持久性，是通过什么技术来实现的？

### 什么是数据库事务？

事务是数据库管理系统执行过程中的一个逻辑单位，有一个有限的数据库操作序列构成。

### 事务的特性

ACID

原子性：要么全部成功吗，要么全部失败。全部成功好说，如果是全部失败，那么就需要依赖我们的undo Log日志来解决。

一致性：其实是靠着其他三个特性来实现的。

隔离性：不能让多个事务同时操作同时操作一个表，也就是每一个事务之间其实是不能互相干扰的。

持久性：持久化到我们的磁盘中。

其实我们在数据库中使用了update语句等等，发现其实是更新成功的，原因是autocommit参数默认是打开的。

```sql
show variables like 'autocommit'
```

自动的开启事务，自动提交。

### 事务并发会出现什么问题？

脏读：读到的是还没有提交的数据

![image-20230820201648524](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230820201648524.png)

不可重复读：读到的是已经提交的数据，并且是update/delete

![image-20230820202059794](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230820202059794.png)

幻读：读到的是已经提交的数据，并且是insert

![image-20230820202111678](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230820202111678.png)

其实事务并发三大问题都是数据库读一致性问题。

必须有数据库的隔离机制来处理读一致性的问题。



![image-20230820202730215](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230820202730215.png)

> 如果要解决读一致性问题，保证一个事务前后读取的事物数据结果一致，实现事务隔离，应该怎们做？

方案一：加锁

组织其他的事物进行修改。舍弃！

方案二：MVCC

生成的一个数据请求时间点的一致性数据快照，并使用这个快照来提供一定的数据的一致性读取功能。

Innodb为了每行记录都实现了三个隐藏字段。

DB_ROW_ID：行标识

DB_TRX_ID: 记录执行事务的id，自动递增

DB_ROLL_PTR: 回滚的指针（删除版本号）



### Innodb锁的基本类型

锁的粒度来说：行锁、表锁

锁的用途来说：乐观锁、悲观锁

锁的基本的模式：排他锁、共享锁、意向锁、自增锁

锁的算法：间隙锁、记录锁、意向锁、临键锁

> 行锁和表锁

粒度：表锁 > 行锁

效率：表锁 > 行锁

概率：表锁  > 行锁

并发性能：表锁 < 行锁

> 行锁：共享锁

又称为读锁，简称S锁。

```sql
select * from student where id = 1 LOCK IN SHARE MODE;
```

> 行锁：排他锁

又称为写锁，简称X锁。

排他锁不能与其他锁并存，如果一个事务获取了一个数据行的排他锁，其他事务就不能在获取该行的锁，只有加锁的事务是可以堆数据行进行修改和读取。

```sql
select * from student where id = 1 FOR UPDATE;
```

事务提交之后锁释放。

update和delete和insert都是自动加排他锁。

> 意向锁：是存储引擎自动加的，不需要我们自己操作。

> 锁的作用

锁到底锁的是？

- **t1表没有任何的索引**

如果我们对于某一行数据，

```sql
select * from t1 where id =1 for update;
```

那么不用想，我们对于这一行的数据进行select的话，会直接出错。

那么如果我们想要锁住id = 3的数据行，那么会发生什么呢？

```sql
select * from t1 where id =3 for update;
```

结果出人意料，竟然失败了。

这也就意味着锁了一行之后整张表全部被锁住了。

- **t2表加上了主键索引**

对于id = 1加锁

```sql
select * from t2 where id = 1 for update;
```

那么如果堆id = 1进行加锁，那么很明显，会加锁失败。

那么如果我对于id = 4进行加锁呢？

```sql
select * from t2 where id = 4 for update;
```

发现尽然可以加锁成功。

这也就意味着他加的锁是行级锁。

- **t3表上加上主键索引和唯一索引**

对于id = 1加锁

```sql
select * from t3 where id = 1 for update;
```

那么此时如果我们对于id = 4进行加锁，会发生什么？

```sql
select * from t3 where id = 4 for update;
```

发现加锁失败。

如果我们仔细观察，会发现其实锁的是index，而不是什么行或者表。

> 那么为什么不加索引会出现锁表现象呢？

其实本质上是表中有一个row_id的隐藏索引，其实根据的就是这个隐藏的ROW索引进行加锁操作，因为没有索引可以走，所以走的是全表扫描，所以就锁柱了整张表。

### 锁住了什么范围？

我们使用的还是t2，就是有一个主键索引的表。

![image-20230820213439334](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230820213439334.png)

> 记录锁：锁定记录

![image-20230820213546038](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230820213546038.png)

> 间隙锁：锁定范围

间隙锁，就是用来阻塞插入操作的。

我们的表中数据：

| id   | name |
| ---- | ---- |
| 1    | 1    |
| 4    | 4    |
| 7    | 7    |
| 10   | 10   |

如果我们对

```sql
select * from t2 where id = 6 for update;
select * from t2 where id > 4 and id < 7 for update;
select * from t2 where id > 20 for update;
```

那么我们

```sql
insert into t2(id, name) values(5, '5');
```

会执行失败 。因为加了间隙锁。锁的范围是：

(-∞,1),(1,4),(4,7),(7,10),(10,+∞);

> 临键锁：锁定范围+记录

```sql
select * from t2 where id >5 and id < 9 for update;
```

那么锁住的范围是:(4,7],(7,10]。

那么我们最终使用这样的锁的作用是什么？就是为了解决RR级别下的幻读问题。



## Day4 Mysql性能优化的总结

本身我们的整个MySQL执行流程中是分成这样几个过程的：

![image-20230821201910299](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230821201910299.png)

那么其实对于最大连接数‘max_connections’和等待释放时间'wait_timeout'来说其实是不合理的。如果正常的公司并发量比较大的话，向我们默认的max_connections：151需要增加到更大的数量。同样8个小时的等待超时时间也需要调校一点。、

我们可以在客户端设置一个连接池来处理。

### 优化措施

> 数据库配置、操作系统配置参数的优化

> 硬件的优化

> 架构的优化

通常我们也可以在客户端和数据库中添加一层缓存层。

如果并发量非常大，我们可以使用集群来处理。

写操作在master节点中，读的操作在slave节点中。

分库分表

#### 慢查询日志

默认都是关闭的。

```sql
show profiles; -- 直接观察SQL语句的执行情况，比如执行时间、
```

开启标准监控和锁监控

```sql
set global innodb_status_output = ON;
set global innodb_status_output_locks=ON;
-- 查看这条语句的加锁情况
show engine innodb status;
```

如何分析慢sql呢？就是在执行计划中使用**explain**

> explain

![image-20230821210620058](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230821210620058.png)

**id**：是执行的select的个数。那么对于上边这种情况，先回查询c表，然后是t表，最后查询tc表。是按照子查询的顺序进行的。

![image-20230821210839746](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230821210839746.png)

如果是连接查询的话，那么就是一个一个表进行查询即可。有一个驱动表的概念，就是小表驱动大表。

**select type**：最外层的查询叫做PRIMARY,里边的叫做SUBMARY。

**type**：

- const：性能非常好的查询，通常用于查询主键等于一个常数的列，查到一行数据的表。

- system：是const的一个特例，只不过查询的是系统中的表，也是查询只有一行数据的表。

- eq_ref：也是非常好的一种查询，

  ```sql
  explain select * from teacher t,teacher_contact tc where t.tcid = tc.tcid;
  ```

  ![image-20230821212122575](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230821212122575.png)

​		由于tc是依赖于t表，并且查询的是主键或者唯一索引，所以说tc表是eq_ref。

- ref：在表中有一个普通索引的话，就是ref
- range：范围查询。没有用到索引。创建一个索引，对于索引使用范围查询是range。
- index：扫描索引的全部数据。
- all：没有任何字段使用索引，全表扫描。

> possible_keys和key

可能的索引，使用到的索引

> key_len：索引的长度

> ref

> rows

> filtered：过滤百分比，过滤得到的数据占用总数据量的百分比

> extra：额额外的信息，比如using index就是覆盖索引；using where 存储引擎层没有做处理，返回给Server层的时候做了处理，

### 数据类型和长度和存储过程和视图和触发器等

数据类型的选择和长度：根据不同的情况来选择数据的不同类型和长度。

尽量不要使用存储过程和视图，MySQL只专注于数据的存储。

像文章、详情等需要单独存储一张表。

字段冗余：比如一张表中有客户id，同时我在给一个字段客户名称。

**到此时，我们实现的一直都是MySQL的**

![image-20230821221458896](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230821221458896.png)









