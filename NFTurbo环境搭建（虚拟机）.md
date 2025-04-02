# NFTurbo环境搭建（虚拟机）

1. RocketMQ启动：直接docker ps -a 然后docker start *****，之后需要将NameServer和Broker部署起来：（有的时候会不成功，重新部署Docker环境即可。启动不了可能还是端口站用的问题，lsof -i :9876）

```shell
安装dashboard：docker pull apacherocketmq/rocketmq-dashboard:latest
```

```shell
docker run -d --name rocketmq-dashboard -e "JAVA_OPTS=-Drocketmq.namesrv.addr=192.168.129.128:9876" -p 8080:8080 -t apacherocketmq/rocketmq-dashboard:latest
```

以上的安装情况只是在启动docker的时候报错添加。

```shell
nohup sh bin/mqnamesrv -n "192.168.129.128:9876" &
```

```shell
nohup ./bin/mqbroker -n localhost:9876 -c conf/broker.conf autoCreateTopicEnable=true &
```

2. xxl-job启动

```shell
nohup java -jar xxl-job-admin-2.4.1.jar > log.out 2>&1 &
```

访问：http://192.168.129.128:7980/xxl-job-admin	

3. ES && kibana启动

```shell
docker start ***
```

每一次启动的时候ES的内网IP都有可能变化，所以每一次都需要进行重新构建docker。

> 1. 查看ES的IP地址：docker inspect 3981174ed6df |grep IPAddress
> 2. 需要把刚刚查到的es的ip设置到elasticsearch.hosts中，其他的配置自己适当调整即可
>
> ```yaml
> elasticsearch.hosts: [ "http://172.17.0.2:9200" ] # 改成 es 的内网 ip
> ```
>
> 3. 启动容器：
>
> ```shell
> sudo docker run --name kibana -d -p 5601:5601 -v /root/package/es/config/kibana.yml:/usr/share/kibana/config/kibana.yml kibana:8.13.0
> ```

访问：http://192.168.129.128:5601/app/home#/

4. canal&binlog监听(可以不用做。已经启动了)

```shell
./startup.sh
```

5. nacos配置

需要先将上一个nacos实例删除。docker rm *

我已经将nacos中的/root/package/nacos/nacos-docker/example/standalone-mysql-8.yaml文件中的Port设置成了7777。

> 报错案例：
>
> 1. ```shell
>    [root@localhost example]# docker-compose -f standalone-mysql-8.yaml up
>    /usr/local/lib/python3.6/site-packages/paramiko/transport.py:32: CryptographyDeprecationWarning: Python 3.6 is no longer supported by the Python core team. Therefore, support for it is deprecated in cryptography. The next release of cryptography will remove support for Python 3.6.
>      from cryptography.hazmat.backends import default_backend
>    Recreating mysql ... 
>             
>    ERROR: for mysql  'ContainerConfig'
>             
>    ERROR: for mysql  'ContainerConfig'
>             
>    ```
>
>    说明了有一个docker的mysql已经被启动了，需要删除，docker rm *****
>
> 2. 如果启动之后报错：链接不上数据库，说明需要将nacos-standlone-mysql.env文件中的MYSQL_SERVICE_HOST=localhost修改成MYSQL_SERVICE_HOST=********（IP地址），不能使用localhost

访问地址：http://192.168.129.128:8848/nacos/index.html#

启动的时候直接：docker start <containerID>

6. Sentinel部署启动

只需要在package包下找到sentinel文件夹中的jar包，之后运行：

```shell
nohup java -Dserver.port=6877 -Dcsp.sentinel.dashboard.server=localhost:6877 -Dproject.name=sentinel-dashboard -jar sentinel-dashboard-2.0.0-alpha-preview.jar &
```

访问：http://192.168.129.128:6877

账号和密码都是：sentinel

7. seata部署启动

在/root/package/seata/bin目录下执行：

```shell
sh seata-server.sh -h 192.168.129.128
```

访问：http://192.168.129.128:7091
