# 	Docker

> Docker的学习
- Docker概述
- Docker安装
- Docker命令
  - 镜像命令
  - 容器命令
  - 操作指令
- Docker镜像
- 容器数据卷
- DockerFile
- Docker网络原理
- IDEA整合Docker
- Docker Compose
- Docker Swarm 
- CI/CD



# Docker概述

## 	Docker为什么出现？

一款产品中：开发-->上线 两套环境 ！ 应用环境，应用配置！

开发 --> 运维。问题：我在我的电脑上环境配置没有问题，由于版本升级，导致服务不可用，对于运维来说，考验非常大。

环境配置十分麻烦，每一台机器都需要部署环境！费事费力！！

发布一个项目（jar、（Redis、MySQL、jdk、ES）），那么项目可不可以带上环境安装呢？

## docker的历史

2010年，几个搞IT的年轻人，在美国成立了一家公司，dotCloud。做一些pass的云计算服务！

他们将自己的技术命名成Docker！Docker刚刚诞生的时候，没有引起行业的注意!dotCloud无法生存。

开源！

2013年，Docker开源！人们越来越发现Docker的好处，一个月更新一个版本。

2014年4月9号，Docker1.0发布！

在容器技术没有出现之前，虚拟机技术是占用大部分的市场的。

###### 虚拟机和容器

虚拟机：在Windows中可以安装Vmware来安装Linux来虚拟出多台计算机，但是笨重！

容器：也是一种虚拟化技术，可以保证线程之间的隔离性。

```bash
vm:是直接克隆出一整个电脑，系统中的所有的硬件以及软件都虚拟出来，可能占用10几个GB。
Docker:隔离性，镜像（最核心的环境 + 4m + jdk + mysql）十分的小巧，运行镜像就可以，通常占用的空间不超过几MB
```

> 聊聊Docker？

Docker是基于GO语言开发的

官网：https://www.docker.com/

文档地址：https://docs.docker.com/

仓库地址：https://hub.docker.com/

## Docker能干吗？

> 之前的虚拟机技术

![image-20230730224139175](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230730224139175.png)

> 现在Docker技术

![image-20230730225122087](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230730225122087.png)

比较Docker和虚拟机技术的不同：

- 传统的虚拟机，虚拟出一条硬件，运行一个完整的系统，然后在这个系统上可以安装和运行软件
- 容器中的应用直接在宿主机上运行，容器是没有自己的内核的，也没有虚拟机的硬件，所以轻便
- Docker中的每个容器都是隔离的，每一个容器中都有一个属于自己的文件系统

## Docker安装

### docker基本组成

![image-20230801223422738](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230801223422738.png)

**镜像（image）：**

docker 镜像就好像是一个模板，可以通过这个模板来创建容器服务，tomcat镜像==>run==>tomcat01容器（提供服务器），通过这个镜像可以创建多个容器。

**容器（container）：**

Docker利用容器技术，独立运行一个或者一组应用，通过镜像来创建。

启动、停止、删除等基本命令。

这个容器就是一个简易版的Linux系统。

**仓库（respository）：**

存放镜像的地方，仓库分为共有仓库和私有仓库，比如我们的DockerHub等。

### 安装Docker

> 环境准备

1. 需要有一台Linux服务器
2. Centos7
3. Finshell远程控制

> 环境查看

```bash
[root@iZmwqza0f24yvmZ ~]# uname -r
3.10.0-1160.90.1.el7.x86_64
```

> 安装

帮助文档：

```shell
# 卸载旧版本
yum remove docker \docker-client \docker-client-latest \docker-common \docker-latest \docker-latest-logrotate \docker-logratate \docker-engine

# 需要的安装包
yum install -y yum-utils

# 设置镜像的仓库
yum-config-manager \--add-repo \http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

# 安装docker相关的
yum install docker-ce docker-ce-cli containerd.io

# 启动Docker
systemctl start docker

# 查看docker版本
docker verison

# hello-world
docker run hello-world

# 查看docker下载的镜像
docker images

# 卸载Docker
yum remove docker-ce docker-ce-cli containerd.io
rm -rf /var/lib/docker
```



## 阿里云镜像加速

1. 阿里云的容器镜像服务
2. 配置加速器![image-20230801231055556](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230801231055556.png)

3. 配置使用

```shell
    sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": ["https://7djl8kqg.mirror.aliyuncs.com"]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```



## Hello-world流程

docker run之后发生了什么？

![image-20230801231703887](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230801231703887.png)

## docker底层原理

1. **Docker的结构**

   docker是一个CS架构，Client-Server架构。

   ![image-20230801232314231](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230801232314231.png)

   **Docker为什么比VM快？**

   1. 容器比VM少了抽象层
   2. docker利用的是宿主机的内核，VM需要的是Guest OS。所以说，容器不需要使用加载一个新的操作系统内核，虚拟机是加载GuestOS，分钟级别的，docker利用了宿主机的操作系统，省略了这个复杂的步骤。



## Docker的常用命令

```shell
docker version		#显示Docker的版本信息
docker info			#显示Docker的系统信息，包括镜像和容器的数量
docker 命令 --help   # 帮助命令
```



### 镜像命令

```shell
docker images

# 可选项
-a, --all		#列出所有的镜像
-q, --quiet		#只显示镜像的id
```



docker search搜索镜像

```shell
[root@iZmwqza0f24yvmZ ~]# docker search mysql
NAME                            DESCRIPTION                                      STARS     OFFICIAL   AUTOMATED
mysql                           MySQL is a widely used, open-source relation…   14348     [OK]       
mariadb                         MariaDB Server is a high performing open sou…   5477      [OK]  
```

docker pull下载镜像

```shell
docker pull mysql

docker pull mysql:5.7
```

如果已经存在了MySQL容器，而你又重新下载了一个指定的版本MySQL，那么会有一个联合文件系统，将你的相同的数据信息不再重新下载，但是其余有冲突的文件需要重新下载。

**docker rmi**   删除镜像

```shell
docker rmi -f  c20987f18b13 		#强制删除某一个docker镜像
docker rmi -f [容器id] [容器id] [容器id]#强制删除某一些docker 镜像
docker rmi -f $(docker images -aq)	#递归删除所有的镜像
```



### 容器命令

说明：我们有了镜像才可以创建容器，LInux，下载一个centos镜像来学习。

```shell
docker pull centos
```

新建容器并启动

```shell
docker run [] image

#参数说明
--name="Name"		# 容器名字
-d					# 后台方式运行
-it					# 使用交互方式运行，进入容器查看内容
-p					# 指定容器的端口号 -p 8080:8080
	-p  主机端口:容器端口
-P					#随机指定端口
```

```shell
# 进入docker容器
[root@iZmwqza0f24yvmZ ~]# docker run -it centos /bin/bash
# 查看docker容器中的的centos
[root@5e88cd247c38 /]# ls
bin  dev  etc  home  lib  lib64  lost+found  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
# 退出容器
[root@5e88cd247c38 /]# exit
exit

# 容器不停止退出
Ctrl + p + q
# 列出当前正在运行的容器
[root@iZmwqza0f24yvmZ ~]# docker ps 
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
# 列出曾经运行的容器
[root@iZmwqza0f24yvmZ ~]# docker ps -a 
CONTAINER ID   IMAGE                                              COMMAND                   CREATED         STATUS                      PORTS                               NAMES
5e88cd247c38   centos                                             "/bin/bash"               2 minutes ago   Exited (0) 44 seconds ago                                       blissful_goldstine
93bb55848b1d   hello-world                                        "/hello"                  15 hours ago    Exited (0) 15 hours ago                                         hopeful_black
beef68b9316b   quay.io/minio/minio:RELEASE.2022-08-02T23-59-16Z   "/usr/bin/docker-ent…"   5 weeks ago     Exited (255) 4 weeks ago    0.0.0.0:9000-9001->9000-9001/tcp    minio
7e4c0eb544ed   3c3da61c4be0                                       "docker-entrypoint.s…"   5 weeks ago     Exited (255) 4 weeks ago    0.0.0.0:6379->6379/tcp              redis
1b622b187498   2be84dd575ee                                       "docker-entrypoint.s…"   5 weeks ago     Exited (255) 4 weeks ago    0.0.0.0:3306->3306/tcp, 33060/tcp   mysql


```

**删除容器**

```shell
docker rm 容器id				# 删除指定的容器
docker rm -f $(docker ps -aq)# 删除所有的容器
docker ps -a -qlxargs docker rm # 删除所有的容器
```

**启动和停止容器**

```shell
docker start 容器id			# 启动容器
docker restart 容器id			# 重启容器
docker stop 容器id			# 停止当前正在运行的容器
docker kill 容器id			# 强制停止当前容器
```



### 常用的其他命令

**后台启动容器**

```shell
docker run -d 镜像名
# 比如：
docker run -d centos
```

**查看日志**

```shell
docker logs -f -t --tail 10 容器id		# 显示条数

docker logs -f -t 容器id					# 显示所有的日志
```

**查看容器中进程的信息**

```shell
docker top 容器id
```

**查看进镜像的元数据**

```shell
docker inspect 容器id
```

**进入当前正在运行的容器**

```shell
docker exec -it 容器id /bin/bash

# 测试
[root@iZmwqza0f24yvmZ ~]# docker exec -it a291c25bf4c4 /bin/bash
[root@a291c25bf4c4 /]# 

# 方式2
docker attach 容器id

# docker exec		进入容器后开启一个新的终端，可以在里面进行操作
# docker attach		进入容器正在执行的终端，不会启动新的线程
```

**从容器中拷贝文件到主机上**

```shell
docker cp 容器id:容器

[root@iZmwqza0f24yvmZ home]# docker run -it centos /bin/bash
[root@0f9aca2c0d06 /]# cd /home
[root@0f9aca2c0d06 home]# touch test.java
[root@0f9aca2c0d06 home]# ll
bash: ll: command not found
[root@0f9aca2c0d06 home]# ls
test.java
[root@0f9aca2c0d06 home]# exit
exit
[root@iZmwqza0f24yvmZ home]# docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
[root@iZmwqza0f24yvmZ home]# docker ps -a
CONTAINER ID   IMAGE                                              COMMAND                   CREATED          STATUS                      PORTS                               NAMES
0f9aca2c0d06   centos                                             "/bin/bash"               52 seconds ago   Exited (0) 16 seconds ago                                       adoring_shamir
b716758eda1e   centos                                             "/bin/bash"               4 minutes ago    Exited (0) 2 minutes ago                                        relaxed_lamport
a291c25bf4c4   centos                                             "/bin/bash"               25 minutes ago   Exited (0) 5 minutes ago                                        awesome_tu
5e88cd247c38   centos                                             "/bin/bash"               2 hours ago      Exited (0) 2 hours ago                                          blissful_goldstine
93bb55848b1d   hello-world                                        "/hello"                  17 hours ago     Exited (0) 17 hours ago                                         hopeful_black
beef68b9316b   quay.io/minio/minio:RELEASE.2022-08-02T23-59-16Z   "/usr/bin/docker-ent…"   5 weeks ago      Exited (255) 4 weeks ago    0.0.0.0:9000-9001->9000-9001/tcp    minio
7e4c0eb544ed   3c3da61c4be0                                       "docker-entrypoint.s…"   5 weeks ago      Exited (255) 4 weeks ago    0.0.0.0:6379->6379/tcp              redis
1b622b187498   2be84dd575ee                                       "docker-entrypoint.s…"   5 weeks ago      Exited (255) 4 weeks ago    0.0.0.0:3306->3306/tcp, 33060/tcp   mysql
[root@iZmwqza0f24yvmZ home]# docker cp 0f9aca2c0d06:/home/test.java /home
                                               Successfully copied 1.54kB to /home
[root@iZmwqza0f24yvmZ home]# ll
总用量 8
drwx------ 2 redis redis 4096 5月  27 21:31 redis
-rw-r--r-- 1 root  root     0 8月   2 16:25 test.java
drwx------ 2 www   www   4096 5月  27 21:12 www
-rw-r--r-- 1 root  root     0 8月   2 16:21 zhangxh.java

```

![image-20230802163246545](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230802163246545.png)



 ## 作业练习

> docker安装Nginx

```shell
# 查找Nginx的镜像
docker search nginx
# 下载Nginx镜像
docker pull nginx
# 运行该容器
docker run -d --name nginx01 -p 3344:80 nginx
```

> 作业：docker	来安装一个tomcat

```shell
# 官方的使用
docker run -it --rm tomcat:9.0
# 之前我们使用的都是后台启动，停止了容器之后，容器还是可以查找得到的，  docker run -it --rm,一般用来测试，用完就删除

# 下载在启动
docker pull tomcat

# 启动运行
docker run -d -p 3355:8080 --name tomcat01 tomcat

# 测试访问

# 进入容器
docker exec -it tomcate01 /bin/bash

# 然后我们发现问题，Linux命令少了许多；没有webapps。
# 然后我们将webapps.dists中的所有的文件复制到webapps
cp -r webapps.dists/* webapps
# 然后就可以访问了
```

> 思考问题：我们以后要部署项目，如果每一次都需要进入到容器中是不是非常麻烦?我要是在外部指定一个映射路径，webapps，我们在外部放置项目，自动同步到内部就好了。

> 部署es + kibana

```shell
# es 暴露的端口十分多
# es 十分耗费内存
# es 数据一般放在安全目录

# 启动 es
docker run -d --name elasticsearch -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" elasticsearch:7.6.2
# 启动之后发现卡死了，因为十分耗费内存
# 查看docker的CPU等的占用
docker stats

# 测试一下es是否已经成功了
curl localhost:9002
{
  "name" : "512103edc9d1",
  "cluster_name" : "docker-cluster",
  "cluster_uuid" : "rz9TOczkRFab2EasVcRy4A",
  "version" : {
    "number" : "7.6.2",
    "build_flavor" : "default",
    "build_type" : "docker",
    "build_hash" : "ef48eb35cf30adf4db14086e8aabd07ef6fb113f",
    "build_date" : "2020-03-26T06:34:37.794943Z",
    "build_snapshot" : false,
    "lucene_version" : "8.4.0",
    "minimum_wire_compatibility_version" : "6.8.0",
    "minimum_index_compatibility_version" : "6.0.0-beta1"
  },
  "tagline" : "You Know, for Search"
}

# 更改es的启动配置
docker run -d --name elasticsearch -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" -e ES_JAVA_OPTS="-Xms64m -Xmx512m" elasticsearch:7.6.2



```

![image-20230802202451938](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230802202451938.png)



## 可视化

- portainer（先使用）

```shell
docker run -d --name portainerUI -p 9000:9000 -v /var/run/docker.sock:/var/run/docker.sock portainer/portainer
```

**什么是portainer?**

Docker图形化界面管理工具！提供一个后台的面板供我们使用，不详说了。



# Docker镜像讲解

## 镜像是什么?

镜像是一种轻量级、可执行的独立软件包，用来打包软件运行环境和基于运行环境开发的软件，它包含运行某个软件所需的所有内容，包括代码、运行时环境、库、环境变量以及配置文件。

## Docker镜像加载原理

> UnionFS（联合文件系统）

> 文件分层系统

bootfs(boot file system)主要包含bootloader和kernel，bootloader主要是引导加载kernel，Linux刚启动的时候会加载bootfs文件系统，在Docker镜像的最底层是bootfs。

rootfs(root file system)，在bootfs之上，包含的就是经典的 Linux系统中的/dev,/proc,/bin,/etc等标准目录和文件。rootfs就是各种不同的操作系统发行版，比如Ubuntu，Centos等等。

![image-20230802231028821](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230802231028821.png)

对于一个精简的OS，rootfs可以很小，只需要包含最基本的 命令，工具和程序库就可以了。因为底层使用的是Host 的kernel，自己只需要提供rootfs就可以了。由此可见对于不同的Linux发行版，bootfs基本上是一致的，rootfs会有差别，由此不同的发行版可以公用bootfs。

## 分层的理解

> 分层的镜像

我们可以去下载一个镜像，发现是一层一层的在下载。

![image-20230802232556314](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230802232556314.png)

思考：为什么docker采用了这种分层的结构呢？

做大的好处就是资源共享，如果有多个镜像都是从相同的base镜像构建而来，那么宿主机只需要在磁盘上保留一份base镜像，同时内存中也需要加载一份base镜像，这样的话，每一层都可以进行共享。

查看分层的方式可以通过：

```shell
docker image inspect redis:latest
```

![image-20230802232924622](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230802232924622.png)

如果第三层需要新添加一个文件，那么这种情况下上层的文件覆盖了底层镜像层的文件。这样就使得文件的 更新版本作为一个新的镜像层最外展示为统一的文件系统。

![image-20230802233151414](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230802233151414.png)

> 特点：Docker镜像都是只读的，当容器启动之后，一个新的可写层被加载到镜像的顶部，这一层就是我们说的容器层，容器之下是镜像层。

## Commit镜像

```shell
docker commit # 提交容器成为一个新的副本

# 命令和git 相似
docker commit -m="提交的描述信息" -a="作者" 容器id 目标镜像名:[tag]
```

实战测试：

```shell
# 启动一个默认的tomcat

# 将基本文件拷贝到webapps中

# 将我们操作的容器通过commit提交成一个镜像，
```

![image-20230803155331582](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803155331582.png)

# 容器数据卷

## 什么是容器数据卷？

**Docker的理念回顾**

将应用和环境打包成一个镜像！

如果说容器中的数据，在容器被删除之后，数据就会丢失！数据可以被持久化。

类似于Mysql，如果有人删库跑路了，那么MySQL的数据其实额可以存放在本地中。

容器之间也需要一个数据共享的技术，Docker容器中产生的数据，同步到本地。

这就是我们说的卷技术。

**总结一句话：容器的持久化和同步操作！容器之间也是可以数据共享的**

## 使用数据卷

> 方式一:直接使用命令来挂载 -v

```shell
docker run -it -v [LInux虚拟机中的目录:容器中的目录] 容器名 ...
docker run -it -v /home/ceshi:/home centos /bin/bash
```

![image-20230803162400741](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803162400741.png)

由于我们已经挂载成功，所以理论上说我们可以在Linux本地上操作数据，我们挂载的目录是：/home/ceshi。

我们进入Docker容器中，在/home目录下新增一个文件：test.java。

进入Linux中重新查看是否存在数据？

![image-20230803163711129](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803163711129.png)

发现新增成功。如果说在docker断开之后，我们在Linux中修改这个文件，重新启动容器，观察该文件是否已经修改？

![image-20230803164102515](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803164102515.png)

发现同步成功！说明挂载是成功的。

> 好处：我们以后只需要在本地修改文件，会自动同步到Docker。

### 安装MySQL

思考：MySQL的数据持久化问题

```shell
# 获取镜像
docker pull mysql:5.7
# 运行容器，需要做数据挂载！  安装启动MySQL，需要配置密码，这是注意点
docker run --name some-mysql -e MYSQL_ROOT_PASSWORD=my-secret-pw -d mysql:tag

docker run -d -p 3310:3306 -v /home/mysql/conf:/etc/mysql/conf.d -v /home/mysql/data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=root --name mysql01 mysql:5.7

```

如果我们删除容器，那么数据仍然是存在的。

### 具名和匿名挂载

```shell
# 匿名挂载
-v 容器内路径
docker run -d -P --name nginx01 -v /etc/nginx nginx

# 查看所有的volume的情况
docker volume ls
local     08f2f6a60df5047eae725208886ff0f5412fca30330dc2d8c401de86d07063bc
# 上面这种就是匿名挂载

# 具名挂载
docker run -d -P --name nginx02 -v juming-nginx02:/etc/nginx nginx
local     juming-nginx
# 上面这种就是具名挂载

# 查看一下这个卷
docker volume inspect juming-nginx
```

![image-20230803174757457](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803174757457.png)

如果是具名挂载，没有指定目录的情况下都是在`/var/lib/docker/volumes/****/_data`下。

我们通过具名挂载可以方便的找到我们的 一个卷，大多数情况下使用的都是具名挂载。

拓展：

```shell
# 通过 -v 容器内路径：ro rw 改变读写权限
ro		# readonly 只读
rw		# 可读可写

# 一旦设置了容器权限，容器对于我们挂载出来的内容就有了限定
docker run -d -P --name nginx03 -v juming-nginx:/etc/nginx:ro nginx
docker run -d -P --name nginx03 -v juming-nginx:/etc/nginx:rw nginx

# ro 只要看到ro说明了这个路径上只能通过宿主机来操作，容器内部无法操作！
```

### Dockerfile

dockerfile就是用来构建docker镜像构建文件。命令脚本。

```shell
# 创建一个dockerfile文件，建议dockerfile
# 文件中的指令参数
FROM centos

VOLUME ["volume01","volume02"]

CMD echo "------end------"
CMD /bin/bash

# 构建镜像
docker build -f /home/docker-test-volume/dockerfile1 -t zhangxh/centos:1.0 .(注意最后的点)

```

启动我们自己创建的镜像：

![image-20230803181204059](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803181204059.png)

发现有volume01和volume02两个卷

我们进入其中一个卷：volume01

新建一个文件：container.txt。在我们的主机上查看挂载位置：

```shell
docker inspect 容器id
```

找到Mounts![image-20230803190018284](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803190018284.png)

在Linux中进入到该目录，发现有container.txt文件，说明挂载是成功的。

### 数据卷容器

> 主要就是一个命令：--volumes-from 一个容器名字(docker01)

多个MySQL同步数据！

启动三个容器，通过我们刚才的写镜像启动。

```shell
docker run -it --name docker01 zhangxh/centos:1.0
```

![image-20230803220338641](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803220338641.png)

在docker01容器下创建一个文件，观察到docker02也已经存在了这个文件

![image-20230803220437920](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803220437920.png)

那我如果在增加一个docker03呢？

![image-20230803220520597](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803220520597.png)

发现docker03中的文件也存在![image-20230803220607091](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803220607091.png)

如果我们断开docker01，那么其他的容器中的文件还是否存在呢？答案是存在的。其实就象是拷贝一样，docker01和docker03将文件拷贝到自己的目录下，不会随着docker01的更改变换。

在断开docker01的情况下，docker02新增了文件之后docker03仍然可以接收到。

> 结论：
>
> 容器之间配置信息的传递，数据卷容器的声明周期一直持续到没有容器使用为止。
>
> **如果一旦持久化到本地，那么本地数据是没有办法删除的。**



# Dockerfile

dockerfile是用来构建docker镜像的文件！命令参数脚本！

> 构建步骤

1. 编写一个dockerfile文件
2. docker build构建成为一个镜像
3. docker run 运行镜像
4. docker push 发布镜像（Docker Hub、阿里云镜像仓库）





## Dockerfile的构建过程

基础知识:

1. 每个保留关键指令必须是大写字母
2. 执行从上到下的顺序
3. #表示注释
4. 每一个指令都会对应一个新的镜像层，并提交！

![image-20230803223223995](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803223223995.png)

dockerfile是面向开发的，我们以后需要发布项目，做镜像，需要编写dockerfile文件，十分重要！

Docker镜像 逐渐成为了企业交付的标准，必须要掌握！

Dockerfile：构建文件，定义了一切步骤，源代码。

DockerImages：通过DockerFile构建生成的镜像，最终发布和运行的产品！

Docke容器：容器就是镜像运行起来提供的服务器。

**dockerfile指令**

```shell
FROM			#基础镜像，一切从此开始
MAINTAINER		#镜像是谁写的，姓名 + 邮箱
RUN				#镜像构建的时候需要运行的命令
ADD				#步骤：tomcat镜像，这个tomcat压缩包！添加内容那个
WORKDIR			#镜像的工作目录
VOLUME			#挂载的目录
EXPOSE			#暴露端口配置，相同与 -p
CMD				#指定容器启动的时候要运行的命令，只有最后一个会生效
ENTRYPOINT		#指定这个容器启动的时候要运行的命令，可以追加命令
ONBUILD			#当构建一个被继承的  Dockerfile  这个时候就会运行ONBUILD指令。触发指令。
COPY			#类似于ADD，将我们的文件拷贝到镜像中
ENV				#设置	环境变量
```

> 创建一个自己的Centos

```shell
# 1 编写DockerFile的文件 
# 注意：由于2021年已经把centos停止维护，所以直接使用yum -y install vim 等命令会出错，需要添加上一下的配置
# RUN cd /etc/yum.repos.d/
# RUN sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*
# RUN sed -i 's|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-*
# RUN yum makecache
# RUN yum update -y

FROM centos
MAINTAINER zhangxh<zhangxh3670@126.com>

ENV MYPATH /usr/local
WORKDIR $MYPATH

RUN cd /etc/yum.repos.d/
RUN sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*
RUN sed -i 's|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-*
RUN yum makecache
RUN yum update -y
RUN yum -y install vim
RUN yum -y install net-tools
EXPOSE 80
CMD echo $MYPATH
CMD echo "-----end-----"
CMD /bin/bash

# 2 通过文件构建镜像
docker build -f mydockerfile-centos -t mycentos:0.1 .

```

正常的安装的centos阉割版的是有很多的命令不可以使用：比如：

![image-20230803234228085](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803234228085.png)

但是经过我们自定义设置的容器是可以使用vim 和ifconfig 等命令的。

![image-20230803234323649](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230803234323649.png)

> CMD和ENTRYPOINT

```shell
CMD			# 指定这个容器启动的时候要运行的命令，只有最后一个会生效
ENTRYPOINT	# 指定这个容器启动时候要运行的命令，可以追加命令
```

测试CMD

```shell
FROM centos

CMD ["ls","-a"]

# 构建镜像
docker build -f dockerfile-cmd-test -t cmdtest .

# 启动镜像
docker run 7d202bdf002b

# 执行结果
.
..
.dockerenv
bin
dev
etc
home
lib
lib64
lost+found
media
mnt
opt
proc
root
run
sbin
srv
sys
tmp
usr
var
# 拼接后续命令
docker run 7d202bdf002b -l
# 报错
docker: Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: exec: "-l": executable file not found in $PATH: unknown.
ERRO[0000] error waiting for container: 
```

测试ENTRYPOINT	

```shell
FROM centos

ENTRYPOINT ["ls","-a"]

# 构建镜像
docker build -f dockerfile-cmd-entrypoint -t entrypoint-test .

# 启动镜像
docker run **********

# 执行结果
.
..
.dockerenv
bin
dev
etc
home
lib
lib64
lost+found
media
mnt
opt
proc
root
run
sbin
srv
sys
tmp
usr
var

# 拼接命令
docker run *********** -l

# 执行结果
total 56
drwxr-xr-x   1 root root 4096 Aug  4 07:16 .
drwxr-xr-x   1 root root 4096 Aug  4 07:16 ..
-rwxr-xr-x   1 root root    0 Aug  4 07:16 .dockerenv
lrwxrwxrwx   1 root root    7 Nov  3  2020 bin -> usr/bin
drwxr-xr-x   5 root root  340 Aug  4 07:16 dev
drwxr-xr-x   1 root root 4096 Aug  4 07:16 etc
drwxr-xr-x   2 root root 4096 Nov  3  2020 home
lrwxrwxrwx   1 root root    7 Nov  3  2020 lib -> usr/lib
lrwxrwxrwx   1 root root    9 Nov  3  2020 lib64 -> usr/lib64
drwx------   2 root root 4096 Sep 15  2021 lost+found
drwxr-xr-x   2 root root 4096 Nov  3  2020 media
drwxr-xr-x   2 root root 4096 Nov  3  2020 mnt
drwxr-xr-x   2 root root 4096 Nov  3  2020 opt
dr-xr-xr-x 122 root root    0 Aug  4 07:16 proc
dr-xr-x---   2 root root 4096 Sep 15  2021 root
drwxr-xr-x  11 root root 4096 Sep 15  2021 run
lrwxrwxrwx   1 root root    8 Nov  3  2020 sbin -> usr/sbin
drwxr-xr-x   2 root root 4096 Nov  3  2020 srv
dr-xr-xr-x  13 root root    0 Aug  3 10:11 sys
drwxrwxrwt   7 root root 4096 Sep 15  2021 tmp
drwxr-xr-x  12 root root 4096 Sep 15  2021 usr
drwxr-xr-x  20 root root 4096 Sep 15  2021 var


```

由此可见，CMD命令并不能将命令进行拼接，但是ENTRYPOINT确实可以进行拼接。

# 实战：Tomcat镜像

1. 准备Tomcat

2. 将tomcat和jdk的包放到/home/tomcat目录下
3. 编写Dockerfile文件
4. 构建镜像
5. 启动镜像

```shell
Dockerfile

FROM centos
MAINTAINER zhangxh<zhangxh36702126.com>

ADD jdk-8u371-linux-x64.tar.gz /usr/local/
ADD apache-tomcat-9.0.78.tar.gz /usr/local/

RUN cd /etc/yum.repos.d/
RUN sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-*
RUN sed -i 's|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-*
RUN yum makecache
RUN yum update -y
RUN yum -y install vim
RUN yum -y install net-tools

ENV MYPATH /usr/local
WORKDIR $MYPATH

ENV JAVA_HOME /usr/local/jdk1.8.0_371
ENV CLASSPATH $JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar
ENV CATALINA_HOME /usr/local/apache-tomcat-9.0.78
ENV CATALINA_BASH /usr/local/apache-tomcat-9.0.78
ENV PATH $PATH:$JAVA_HOME:$CATALINA_HOME/lib:$CATALINA_HOME/bin

EXPOSE 8080

CMD /usr/local/apache-tomcat-9.0.78/bin/startup.sh && tail -F /usr/localapache-tomcat-9.0.78/bin/logs/catalina.out

# 构建镜像
docker build -t Dockerfile .

# 启动镜像，同时挂载目录，于本地进行映射
docker run -d -p 9090:8080 --name zhangxhTomcat -v /home/tomcat/test:/usr/local/apache-tomcat-9.0.78/webapps/test -v /home/tomcat/logs:/usr/local/apache-tomcat-9.0.78/logs diytomcat

# 由于已经设定好了映射路径，所以说我们的本地目录和容器中的目录是相同步的
# 我们在本地test目录下新增web.xml和index.html文件
```

访问9090之后就会到我们的页面。

## 提交Docker

> 提交到DockerHub上

首先需要先登录我们的docker

```shell
docker login -u liangzhichao11
Password:Zhang123454321
```



```shell
docker push liangzhichao11/tomcat:1.0
```

很可能遇到的情况，我们的镜像已经存在了，所以说我们需要更改名字

```shell
docker tag 容器id liangzhichao/tomcat:1.0
```

之后等待镜像上传到DockerHub上就好了

```shell
[root@iZmwqza0f24yvmZ tomcat]# docker push liangzhichao11/tomcat:1.0
The push refers to repository [docker.io/liangzhichao11/tomcat]
5f70bf18a086: Pushed 
4e86a6b4d7b8: Pushing [=================================================> ]  28.03MB/28.59MB
e702a2ef9eb8: Pushing [=============>                                     ]  17.82MB/67.08MB
cd8d4b55e495: Pushing [===>                                               ]  21.42MB/275.6MB
7f242ab55da4: Pushing [====================>                              ]   10.9MB/27.22MB
604350ccf893: Pushed 
3fa38e7a6875: Pushed 
c8a596b16a57: Pushing [=========================>                         ]  8.377MB/16.28MB
c43adbf6185b: Waiting 
74ddd0ec08fa: Waiting 

```

> 提交到阿里云容器

1. 登录阿里云

2. 开通容器镜像服务
3. ![image-20230804183132750](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230804183132750.png)



4. 根据阿里云提供的命令便可以推送到阿里云仓库















​	
