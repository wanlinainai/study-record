# MallChat用户模块

腾讯云密钥：

![image-20230903205219515](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230903205219515.png)

![image-20230903205329378](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230903205329378.png)

## 初始化配置

application.yml

```yaml
spring:
  profiles:
    #运行的环境
    active: test
  application:
    name: mallchat
  datasource:
    url: jdbc:mysql://${mallchat.mysql.ip}:${mallchat.mysql.port}/${mallchat.mysql.db}?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai
    username: ${mallchat.mysql.username}
    password: ${mallchat.mysql.password}
    driver-class-name: com.mysql.cj.jdbc.Driver
  redis:
    # Redis服务器地址
    host: ${mallchat.redis.host}
    # Redis服务器端口号
    port: ${mallchat.redis.port}
    # 使用的数据库索引，默认是0
    database: 0
    # 连接超时时间
    timeout: 1800000
    # 设置密码
    password: ${mallchat.redis.password}
  jackson:
    serialization:
      write-dates-as-timestamps: true
```

application-prod.yml

```yaml
##################mysql??##################
mallchat.mysql.ip=124.222.22.118
mallchat.mysql.port=3306
mallchat.mysql.db=mallchat
mallchat.mysql.username=root
mallchat.mysql.password=123456
##################redis??##################
mallchat.redis.host=124.222.22.118
mallchat.redis.port=6379
mallchat.redis.password=123456
```

application-test.yaml

```yaml
##################mysql??##################
mallchat.mysql.ip=124.222.22.118
mallchat.mysql.port=3306
mallchat.mysql.db=mallchat
mallchat.mysql.username=root
mallchat.mysql.password=123456
##################redis??##################
mallchat.redis.host=124.222.22.118
mallchat.redis.port=6379
mallchat.redis.password=123456
```

## WebSocket连接过程

客户端依靠发起Http请求，告诉服务端进行webSocket协议通信，并告诉服务端的WebSocket协议版本。服务端确认协议版本，升级成WebSocket协议。之后如果有数据需要推送，会主动地告诉客户端。

![image-20231017104927414](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231017104927414.png)

连接开始的时候，客户端使用Http 协议和服务端进行升级，升级完成之后，后续的数据交换遵循WebSocket协议。看看请求头：

![image-20231017105641811](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231017105641811.png)

其中有两个最主要的字段：Upgrade和Connection，告诉服务器端我采用的是WebSocket连接并不是HTTP连接。下面的Sec-WebSocket-***代表的是请求的ID，主要是为了某一些HTTP请求可能会以假乱真，含义就是：我就是WebSocket，可以建立连接。

## netty实现web Socket编码

首先实现WebServerSocket服务端：

**NettyWebSocketServer.java**

```java
@Slf4j
@Configuration
public class NettyWebSocketServer {
    public static final int WEB_SOCKET_PORT = 8090;
    // 创建线程池执行器
    private EventLoopGroup bossGroup = new NioEventLoopGroup(1);
    private EventLoopGroup workerGroup = new NioEventLoopGroup(NettyRuntime.availableProcessors());

    /**
     * 启动 ws server
     *
     * @return
     * @throws InterruptedException
     */
    @PostConstruct
    public void start() throws InterruptedException {
        run();
    }

    /**
     * 销毁
     */
    @PreDestroy
    public void destroy() {
        Future<?> future = bossGroup.shutdownGracefully();
        Future<?> future1 = workerGroup.shutdownGracefully();
        future.syncUninterruptibly();
        future1.syncUninterruptibly();
        log.info("关闭 ws server 成功");
    }

    public void run() throws InterruptedException {
        // 服务器启动引导对象
        ServerBootstrap serverBootstrap = new ServerBootstrap();
        serverBootstrap.group(bossGroup, workerGroup)
                .channel(NioServerSocketChannel.class)
                .option(ChannelOption.SO_BACKLOG, 128)
                .option(ChannelOption.SO_KEEPALIVE, true)
                .handler(new LoggingHandler(LogLevel.INFO)) // 为 bossGroup 添加 日志处理器
                .childHandler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel socketChannel) throws Exception {
                        ChannelPipeline pipeline = socketChannel.pipeline();
                        //30秒客户端没有向服务器发送心跳则关闭连接
                        pipeline.addLast(new IdleStateHandler(30, 0, 0));
                        // 因为使用http协议，所以需要使用http的编码器，解码器
                        pipeline.addLast(new HttpServerCodec());
                        // 以块方式写，添加 chunkedWriter 处理器
                        pipeline.addLast(new ChunkedWriteHandler());
                        /**
                         * 说明：
                         *  1. http数据在传输过程中是分段的，HttpObjectAggregator可以把多个段聚合起来；
                         *  2. 这就是为什么当浏览器发送大量数据时，就会发出多次 http请求的原因
                         */
                        pipeline.addLast(new HttpObjectAggregator(8192));
                        //保存用户ip
//                        pipeline.addLast(new HttpHeadersHandler());
                        /**
                         * 说明：
                         *  1. 对于 WebSocket，它的数据是以帧frame 的形式传递的；
                         *  2. 可以看到 WebSocketFrame 下面有6个子类
                         *  3. 浏览器发送请求时： ws://localhost:7000/hello 表示请求的uri
                         *  4. WebSocketServerProtocolHandler 核心功能是把 http协议升级为 ws 协议，保持长连接；
                         *      是通过一个状态码 101 来切换的
                         */
                        pipeline.addLast(new WebSocketServerProtocolHandler("/"));
                        // 自定义handler ，处理业务逻辑
                        pipeline.addLast(new NettyWebSocketServerHandler());
                    }
                });
        // 启动服务器，监听端口，阻塞直到启动成功
        serverBootstrap.bind(WEB_SOCKET_PORT).sync();
    }

}

```

start方法使用了@PostConstruct注解来将WebSocket启动的过程提前到项目启动；

@PreDestroy注解是在对象销毁之前执行的方法注解，常用于清理工作，对于释放资源、关闭数据库非常有效。

```java
public class NettyWebSocketServerHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, TextWebSocketFrame msg) throws Exception {
        //获取到我们的发送的消息
        String text = msg.text();
        System.out.println("接收消息:" + text);
    }
}
```

**WSBaseReq.java**

```java
@Data
public class WSBaseReq {
    /**
     * @see com.zhangxh.mallchat.common.websocket.domain.enums.WSReqTypeEnum
     */
    private Integer type;
    private String data;
}
```

**WSReqTypeEnum.java**

```java
@AllArgsConstructor
@Getter
public enum WSReqTypeEnum {
    LOGIN(1, "请求登录二维码"),
    HEARTBEAT(2, "心跳包"),
    AUTHORIZE(3, "登录认证"),
    ;
    private final Integer type;
    private final String desc;

    private static Map<Integer, WSReqTypeEnum> cache;

    static {
        cache = Arrays.stream(WSReqTypeEnum.values()).collect(Collectors.toMap(WSReqTypeEnum::getType, Function.identity()));
    }

    public static WSReqTypeEnum of(Integer type) {
        return cache.get(type);
    }
}

```

**WSBaseResp.java**

```java
public class WSBaseResp<T> {
    /**
     * @see com.zhangxh.mallchat.common.websocket.domain.enums.WSRespTypeEnum
     */
    private Integer type;
    private T data;
}
```

**WSRespTypeEnum.java**

```java
@AllArgsConstructor
@Getter
public enum WSRespTypeEnum {
    LOGIN_URL(1, "登录二维码返回", WSLoginUrl.class),
    LOGIN_SCAN_SUCCESS(2, "用户扫描成功等待授权", null),
    LOGIN_SUCCESS(3, "用户登录成功返回用户信息", WSLoginSuccess.class),
    MESSAGE(4, "新消息", WSMessage.class),
    ONLINE_OFFLINE_NOTIFY(5, "上下线通知", WSOnlineOfflineNotify.class),
    INVALIDATE_TOKEN(6, "使前端的token失效，意味着前端需要重新登录", null),
    BLACK(7, "拉黑用户", WSBlack.class),
    MARK(8, "消息标记", WSMsgMark.class),
    RECALL(9, "消息撤回", WSMsgRecall.class),
    APPLY(10, "好友申请", WSFriendApply.class),
    MEMBER_CHANGE(11, "成员变动", WSMemberChange.class),
    ;

    private final Integer type;
    private final String desc;
    private final Class dataClass;

    private static Map<Integer, WSRespTypeEnum> cache;

    static {
        cache = Arrays.stream(WSRespTypeEnum.values()).collect(Collectors.toMap(WSRespTypeEnum::getType, Function.identity()));
    }

    public static WSRespTypeEnum of(Integer type) {
        return cache.get(type);
    }
}

```

下载安装ApiPost，然后配置local

![image-20230918113135544](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230918113135544.png)

启动整个项目，

使用ApiPost发送请求，发现是可以接通的。

后端可以接受得到。

重新添加上我们的处理类型：

```java
LOGIN
AUTHORIZE
HEARTBEAT
```

假设我们对于登录进行操作，前端请求后端会发送“**请求二维码**”这一字符串，后端返回给前端会有**123**的响应。

**WSBlack.java**

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WSBlack {
    private Long uid;
}
```

**WSFriendApply.java**

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WSFriendApply {
    @ApiModelProperty("申请人")
    private Long uid;
    @ApiModelProperty("申请未读数")
    private Integer unreadCount;
}
```

**WSLoginSuccess.java**

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WSLoginSuccess {
    private Long uid;
    private String avatar;
    private String token;
    private String name;
    //用户权限 0普通用户 1超管
    private Integer power;
}
```

**WSLoginUrl.java**

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WSLoginUrl {
    private String loginUrl;
}
```

**WSMemberChange.java**

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WSMemberChange {
    public static final Integer CHANGE_TYPE_ADD = 1;
    public static final Integer CHANGE_TYPE_REMOVE = 2;
    @ApiModelProperty("群组id")
    private Long roomId;
    @ApiModelProperty("变动uid集合")
    private Long uid;
    @ApiModelProperty("变动类型 1加入群组 2移除群组")
    private Integer changeType;
    /**
     * @see com.abin.mallchat.common.user.domain.enums.ChatActiveStatusEnum
     */
    @ApiModelProperty("在线状态 1在线 2离线")
    private Integer activeStatus;
    @ApiModelProperty("最后一次上下线时间")
    private Date lastOptTime;
}
```

**WSMessage.java （用户推送消息）**

```java
@Data
public class WSMessage{
}
```

**WSMsgMark.java ()**

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WSMsgMark {
    private List<WSMsgMarkItem> markList;

    @Data
    public static class WSMsgMarkItem {
        @ApiModelProperty("操作者")
        private Long uid;
        @ApiModelProperty("消息id")
        private Long msgId;
        /**
         * @see com.abin.mallchat.common.chat.domain.enums.MessageMarkTypeEnum
         */
        @ApiModelProperty("标记类型 1点赞 2举报")
        private Integer markType;
        @ApiModelProperty("被标记的数量")
        private Integer markCount;
        /**
         * @see com.abin.mallchat.common.chat.domain.enums.MessageMarkActTypeEnum
         */
        @ApiModelProperty("动作类型 1确认 2取消")
        private Integer actType;
    }
}

```

**WSMsgRecall.java (消息撤回的推送类)**

```java
@Data
public class WSMsgRecall {
}
```

**WSOnlineOfflineNotify.java (用户上下线变动的推送类)**

```java
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WSOnlineOfflineNotify {
//    private List<ChatMemberResp> changeList = new ArrayList<>();//新的上下线用户
    private Long onlineNum;//在线人数
}
```

### 心跳包

如果用户突然关闭网页，是不会有断开通知给服务端的。那么服务器永远感知不到用户下线。因此需要客户端维持一个心跳，当指定一个时间没有心跳，服务端自动断开，进行用户下线操作。

我们可以直接使用Netty的现有组件new IdleStateHandler(30, 0, 0)可以实现30秒没有读请求，就主动关闭连接，我们的web前端需要每10S发送一次心跳包。

## 用户表结构设计

user.sql

```sql
CREATE TABLE `user` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '用户id',
  `name` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户昵称',
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户头像',
  `sex` int(11) DEFAULT NULL COMMENT '性别 1为男性，2为女性',
  `open_id` char(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '微信openid用户标识',
  `active_status` int(11) DEFAULT '2' COMMENT '在线状态 1在线 2离线',
  `last_opt_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最后上下线时间',
  `ip_info` json DEFAULT NULL COMMENT 'ip信息',
  `item_id` bigint(20) DEFAULT NULL COMMENT '佩戴的徽章id',
  `status` int(11) DEFAULT '0' COMMENT '使用状态 0.正常 1拉黑',
  `create_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `update_time` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '修改时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uniq_open_id` (`open_id`) USING BTREE,
  UNIQUE KEY `uniq_name` (`name`) USING BTREE,
  KEY `idx_create_time` (`create_time`) USING BTREE,
  KEY `idx_update_time` (`update_time`) USING BTREE,
  KEY `idx_active_status_last_opt_time` (`active_status`,`last_opt_time`)
) ENGINE=InnoDB AUTO_INCREMENT=10086 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC COMMENT='用户表';
```

可视化图形界面表示网站：https://drawsql.app/teams/zhichao-liangs-team/diagrams/mallchat

介绍：

open_id：微信用户的唯一ID，由于我们采用的是公众号的方式，公众号会有用户的一个open_id，如果是小程序的话也会有open_id，这两个open_id其实是不同的，但是是同一个用户，所以说如果需要统一的话那么就需要接入微信开放公众平台。

name：这是登录用户的名字，必须存在，并且只能有一次修改的机会，如果想要修改名字，需要使用改名卡才可以。

然后加上MP的自动生成代码模板：

#### 引入依赖

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-generator</artifactId>
    <exclusions>
        <exclusion>
            <artifactId>mybatis-plus-extension</artifactId>
            <groupId>com.baomidou</groupId>
        </exclusion>
    </exclusions>
</dependency>
```

在项目中test包下创建一个类：

![image-20230918154131836](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230918154131836.png)

**MPGenerator.java**

```java
public class MPGenerator {
    public static void main(String[] args) {
        //代码生成器
        AutoGenerator autoGenerator = new AutoGenerator();

        //数据源配置
        DataSourceConfig dataSourceConfig = new DataSourceConfig();
        dataSourceConfig.setDbType(DbType.MYSQL);//指定数据库类型
        //---------------------------数据源-----------------------------------
        assembleDev(dataSourceConfig);//配置数据源
        autoGenerator.setDataSource(dataSourceConfig);

        //全局配置
        GlobalConfig globalConfig = new GlobalConfig();
        globalConfig.setOpen(false);
        //todo 要改输出路径
        globalConfig.setOutputDir(System.getProperty("user.dir") + "/mallchat-chat-server/src/main/java");
        //设置作者名字
        globalConfig.setAuthor("zhangxh");
        //去掉service的I前缀,一般只需要设置service就行
        globalConfig.setServiceImplName("%sDao");
        autoGenerator.setGlobalConfig(globalConfig);

        //包配置
        PackageConfig packageConfig = new PackageConfig();
        packageConfig.setParent("com.zhangxh.mallchat.common.user");//自定义包的路径
        packageConfig.setEntity("domain.entity");
        packageConfig.setMapper("mapper");
        packageConfig.setController("controller");
        packageConfig.setServiceImpl("dao");
        autoGenerator.setPackageInfo(packageConfig);

        //策略配置
        StrategyConfig strategyConfig = new StrategyConfig();
        //是否使用Lombok
        strategyConfig.setEntityLombokModel(true);
        //包，列的命名规则，使用驼峰规则
        strategyConfig.setNaming(NamingStrategy.underline_to_camel);
//        strategyConfig.setTablePrefix("t_");
        strategyConfig.setColumnNaming(NamingStrategy.underline_to_camel);
        //字段和表注解
        strategyConfig.setEntityTableFieldAnnotationEnable(true);
        //todo 这里修改需要自动生成的表结构
        strategyConfig.setInclude(
                "user"
        );
        //自动填充字段,在项目开发过程中,例如创建时间，修改时间,每次，都需要我们来指定，太麻烦了,设置为自动填充规则，就不需要我们赋值咯
        List<TableFill> list = new ArrayList<TableFill>();
        TableFill tableFill1 = new TableFill("create_time", FieldFill.INSERT);
        TableFill tableFill2 = new TableFill("update_time", FieldFill.INSERT_UPDATE);
        list.add(tableFill1);
        list.add(tableFill2);

//        strategyConfig.setTableFillList(list);
        autoGenerator.setStrategy(strategyConfig);

        //执行
        autoGenerator.execute();

    }
    //todo 这里修改你的数据源
    public static void assembleDev(DataSourceConfig dataSourceConfig) {
        dataSourceConfig.setDriverName("com.mysql.cj.jdbc.Driver");
        dataSourceConfig.setUsername("root");
        dataSourceConfig.setPassword("123456");
        dataSourceConfig.setUrl("jdbc:mysql://124.222.22.118:3306/mallchat?useUnicode=true&characterEncoding=utf-8&useSSL=true&serverTimezone=UTC");
    }
}
```

直接运行，然后就会发现common.user包下出现了几个包：controller、dao、domain.entity、mapper、service，对于其中的生成的文件进行修改：

- 对于UserDao中的实现就可以删除了。将Mapper中的xml文件放在resource下。

- 修改实体类中的属性，将LocalDateTime类型转换成Date类型。
- 在启动上加上@MapperScan(basePackages = {"com.zhangxh.mallchat.**.mapper""})





## 微信登录

### 1、配置内网穿透

启动后端项目。登陆上cpolar，命令框输入：

```shell
cpolar.exe authtoken ODUyYTY5ZjAtM2MzNC00Nzg3LWEzOGMtYjM0MGQ3YTlmNGMw
cpolar.exe http 8080
```

得到的一个http的链接，复制到微信开发者平台，接口配置信息URL就是这个得到的Http链接。Token改成自定义的。

然后在application-test.properties文件中修改

```properties
mallchat.wx.callback=http://66205117.r11.cpolar.top
mallchat.wx.appId=wxe7a5698d385cb5a9
mallchat.wx.secret=97123871b6b0966874bd3ae7a7a29059
# ??????Token?
mallchat.wx.token=dssdfsdfs
```

注意报错：

1. 公众号端报错：该公众号提供的服务出现故障，请稍后再试。说明了你的内网穿透出现问题了，赶紧更换内网穿透工具吧。血的教训，花生壳服务器出现异常，导致我一直无法登陆，所以内网穿透要选择好。
2. 前端一直没有二维码，一直转圈，更换后端的Redis为腾讯云上的redis，不知道为什么。
3. 注意在网页账号处修改为我们的内网穿透的地址，但是要把http://删除。

### 2、登录二维码

主要是通过WxMpService这个最主要的类来获取QrCode，然后得到这个QrCode对应的Url，从这个url就可以得到用户登陆二维码。（可以通过草料二维码生成模拟）。

之后的登录处理，会在Scanhandler类中进行处理。我们可以在这个时候获取到用户的信息，比如：WxMpXmlMessage中存取着扫码用户的openId,就是FromUser。场景值ID等，但是其实绝大多数的信息都不会呈现在这个类中，因为微信的保密是比较严格的。

模拟实现：

模拟一个接口：(在WxPortalController)

```java
@Autowired
private WxMpService wxMpService;

@GetMapping("/test")
public String gtQrCode(@RequestParam Integer code) throws WxErrorException {
    WxMpQrCodeTicket wxMpQrCodeTicket = wxMpService.getQrCodeService().qrCodeCreateTmpTicket(code, 3);
    String url = wxMpQrCodeTicket.getUrl();
    System.out.println(url);
    return url;
}
```

#### 扫码登录的实现技术方案

当进入到我们的页面时，前后端就已经建立了WebSocket连接。我们将这个连接放入到一个map中进行管理。目前由于刚进入，所以状态是未登录。

![image-20231018151339731](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231018151339731.png)

#### 前端请求扫描二维码

前端点击登录，展示二维码的同时，后端做了三件事：

```java
public void handleLoginReq(Channel channel) {
    // 生成随机的登录码
    Integer code = generateLoginCode(channel);
    // 请求微信接口，返回一个登录码地址
    WxMpQrCodeTicket wxMpQrCodeTicket = wxMpService.getQrCodeService().qrCodeCreateTmpTicket(code, EXPIRE_SECONDS);
    // 返回给前端
    sendMsg(channel, WsAdapter.buildLoginResp(wxMpQrCodeTicket);
}
```

由于我们一开始进入，刚连接成功。触发NettyWebSocketServerHandler.channelActive()方法。但是由于只是触发一次，以后可以利用这个连接过程中的某一些属性来进行责任链编程，所以我们直接将用户（游客）的Channel和null的UID联系起来，用Map，并且可能会有多个游客。存在并发问题，使用ConcurrentHashMap来处理。

![image-20231018152239058](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231018152239058.png)将

**NettyWebSocketServerHandler**

```java
    private WebSocketService webSocketService;

    /**
     * 连接刚刚可用触发这个方法,由于我们只是在一开始调用一次即可
     * 获取与用户相连的Channel，创建之后责任链中的下一些步骤就可以得到这个Channel
     * @param ctx
     * @throws Exception
     */
    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        webSocketService = SpringUtil.getBean(WebSocketService.class);
        webSocketService.connect(ctx.channel());
    }
```

**WebSocketService**

```java
public interface WebSocketService {

    /**
     * 连接 Channel和UID
     * @param channel
     */
    void connect(Channel channel);
}
```

**WebSocketServiceImpl**

```java
@Service
public class WebSocketServiceImpl implements WebSocketService {
    private static final ConcurrentHashMap<Channel, WSChannelExtraDTO> ONLINE_WS_MAP = new ConcurrentHashMap<>();

    @Override
    public void connect(Channel channel) {
        ONLINE_WS_MAP.put(channel, new WSChannelExtraDTO());
    }
}
```

**WSChannelExtraDTO**类中暂时只是存在一个UID属性。



当用户扫码的时候，每一个人都是一个Channel，我们对于这个Channel进行处理。不同的用户所需要的Channel是不一样的，所以我们也要使用Map来进行存储吧，如果一段时间内有大量的人同时在登录，那么即使存在并发问题，同样也是存在OOM内存溢出的问题。

![image-20231018153521297](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231018153521297.png)

其实对于这个OOM的问题，最主要的还是删除一些Code--Channel之间的联系。

1. 我们可以在登录成功的时候将Code--Channel进行删除。但是有些人可能一直申请但是不登录。
2. 等到用户下线了可以将这个Map给剔除掉，但是这样的话由于我们的二维码没有一个下线机制，所以还是会一直存在。

最终我们决定使用某一个过期淘汰策略机制，既能保证并发，又能保证不发生OOM。我们采用了caffeine框架。

引入依赖：

```xml
		<dependency>
            <groupId>com.github.ben-manes.caffeine</groupId>
            <artifactId>caffeine</artifactId>
            <version>3.1.8</version>
        </dependency>
```

简单介绍一下这个框架，主要是解决并发和OOM的问题，其中的Cache<>中有一个方法是asMap()，可以将Cache转换成ConcurrentHashMap。解决OOM的问题就在于设置了最大值是10000，设置了一个小时的时间。

**WebSocketServiceImpl**的处理前端的登录请求的方法

```java
    @Override
    public void handleLoginReq(Channel channel) {
        WxMpQrCodeTicket wxMpQrCodeTicket = null;
                // 生成随机的码
        Integer code = generateLoginCode(channel);
        // 微信申请带参二维码
        try {
            wxMpQrCodeTicket = wxMpService.getQrcodeService().qrCodeCreateTmpTicket(code, (int) DURATION.getSeconds());
        } catch (WxErrorException e) {
            throw new RuntimeException(e);
        }
        // 二维码推送给前端
        sendMsg(channel, WebSocketAdapter.buildResp(wxMpQrCodeTicket));
    }
```

**WebSocketServiceImpl**的发送消息的方法

```java
    private void sendMsg(Channel channel, WSBaseResp<?> resp) {
        channel.writeAndFlush(new TextWebSocketFrame(JSONUtil.toJsonStr(resp)));
    }
```

此时可以生成一个访问的二维码的URL，利用这个URL就可以进行扫码登录。

用户在扫描二维码时候会有两种事件，一个是关注事件，另一个是扫码事件。即SubscribeHandler或者ScanHandler。

**SubscribeHandler.java**

```java
@Component
public class SubscribeHandler extends AbstractHandler {
    @Autowired
    private WxMsgService wxMsgService;

    /**
     * 用户关注通知，就是新用户扫码之后得到的新用户的信息，在wxMessage中基本上得到的信息很少，那么只能得到极少的用户信息
     * @param wxMessage      微信推送消息
     * @param context        上下文，如果handler或interceptor之间有信息要传递，可以用这个
     * @param weixinService    服务类
     * @param sessionManager session管理器
     * @return
     * @throws WxErrorException
     */
    @Override
    public WxMpXmlOutMessage handle(WxMpXmlMessage wxMessage,
                                    Map<String, Object> context, WxMpService weixinService,
                                    WxSessionManager sessionManager) throws WxErrorException {

        this.logger.info("新关注用户 OPENID: " + wxMessage.getFromUser());

        WxMpXmlOutMessage responseResult = null;
        try {
//            responseResult = this.handleSpecial(weixinService, wxMessage);
            responseResult = wxMsgService.scan(wxMessage);
        } catch (Exception e) {
            this.logger.error(e.getMessage(), e);
        }

        if (responseResult != null) {
            return responseResult;
        }

        return TextBuilder.build("感谢关注", wxMessage);
    }

    /**
     * 处理特殊请求，比如如果是扫码进来的，可以做相应处理
     */
    private WxMpXmlOutMessage handleSpecial(WxMpService weixinService, WxMpXmlMessage wxMessage)
            throws Exception {
        return null;
    }
}

```

**ScanHandler.java**

```java
@Component
public class ScanHandler extends AbstractHandler {
    @Autowired
    private WxMsgService wxMsgService;

    /**
     * 扫码登录通知
     * @param wxMpXmlMessage      微信推送消息, 这个是很重要的一个信息，主要的内容就是一些各种数据
     * @param map        上下文，如果handler或interceptor之间有信息要传递，可以用这个
     * @param wxMpService    服务类
     * @param wxSessionManager session管理器
     * @return
     * @throws WxErrorException
     */
    @Override
    public WxMpXmlOutMessage handle(WxMpXmlMessage wxMpXmlMessage, Map<String, Object> map,
                                    WxMpService wxMpService, WxSessionManager wxSessionManager) throws WxErrorException {
        return wxMsgService.scan(wxMpXmlMessage);
    }

}
```

### 3、用户扫码登录

当用户扫码之后进入到WXMsgServiceImpl中的scan方法。在这里边我们可以进行获取用户的openId和用户事件。

其中有两个判断，就是用户登录和用户注册，需要知道用户的信息是否存在，

```java
    @Override
    public WxMpXmlOutMessage scan(WxMpXmlMessage wxMpXmlMessage) {
        String openId = wxMpXmlMessage.getFromUser();
        Integer code = getEventKey(wxMpXmlMessage);
        if (Objects.isNull(code)) {
            return null;
        }else {
            User user = userDao.getUserByOpenId(openId);
            // 注册成功就是用户数据库用户不为空
            boolean registered = Objects.nonNull(user);
            // 认证成功就是可以获取用户的头像或者昵称等等

            boolean authorized = registered && StrUtil.isNotBlank(user.getAvatar());
            // 如果用户已经注册并且授权成功就成功
            if (registered && authorized) {
                // 走登录成功逻辑，通过Code来走Channel推动消息
                webSocketService.scanLoginSuccess(code, user.getId());
            }
            // 没有登录成功
            if (!registered) {
                User insert = UserAdapter.buildUserSave(openId);
                userService.register(insert);
            }
            WAIT_AUTHORIZED_MAP.put(openId, code);
            //最终的一个地址（授权URL）
            // 推送链接
            String authorizeUrl = String.format(URL, wxMpService.getWxMpConfigStorage().getAppId(), URLEncoder.encode(callback + "/wx/portal/public/callback"));

            return TextBuilder.build("请点击登录:<a href=\"" + authorizeUrl + "\">登录</a>", wxMpXmlMessage);
        }

    }
```

注意调用的返回接口URL一定正确，否则404.

如果登录成功，就调用登录模块，进行登录操作，并且将数据回显回前端。

在webScoketService.scanLoginSuccess(code, user.getId());处理：

```java
    @Override
    public void scanLoginSuccess(Integer code, Long id) {
        // 确认连接在机器上
        Channel channel = WAIT_LOGIN_MAP.getIfPresent(code);
        if (Objects.isNull(channel)) {
            return;
        }
        User user = userDao.getById(id);
        WAIT_LOGIN_MAP.invalidate(code);
        // 调用登录模块
        String token =loginService.login(id);
        // 用户登录
        sendMsg(channel, WebSocketAdapter.buildResp(user, token));
    }
```

这里的buildResp方法：(是向前端展示的数据)

```java
    public static WSBaseResp<?> buildResp(User user, String token) {
        WSBaseResp<WSLoginSuccess> resp = new WSBaseResp<>();
        resp.setType(WSRespTypeEnum.LOGIN_SUCCESS.getType());
        WSLoginSuccess build = WSLoginSuccess.builder()
                .avatar(user.getAvatar())
                .name(user.getName())
                .token(token)
                .uid(user.getId())
                .build();
        resp.setData(build);
        return resp;
    }
```

如果没有该用户，那么执行注册逻辑，将用户的信息注册到数据库中。最后推送一个callback的URL来回应调用callback接口。

经过测试，启动项目并且使用APIPost进行发送请求然后将得到的二维码使用草料二维码进行转换之后是可以跳转到callback的。

在用户注册的过程中，用户先是注册，之后保存一个临时的openid和前端事件码的映射。

在用户扫码注册过程中，如果用户一直停在登录页上迟迟没有登录，那么我们需要给前端一个相应。比如用户已经扫码，此时依然是需要加上一个响应状态给前端。

type是2.

此时我们重新进行操作上述的步骤，将项目重启，然后将请求重新发送，用户扫码之后发现可以得到type = 2的值。



### 4、用户认证技术Token方案

#### 4.1 cookie + Session登录

**cookie的设置原理**

cookie本身就是无状态的，对于前端是无感知的，不需要额外开发。后端可以通过返回的报文将cookie设置进网页，网页下一次也会自动携带。

缺点：

跨域问题：由于Cookie只能在同域名下访问，因此跨域访问时无法访问到对应的Cookie信息。这时应该采用其他的解决方案，比如JSONP、CORS等。

扩展性问题：由于Session存储在服务端，当系统扩展到多台服务器的时候，那么此时的Session会出现不一致或者丢失问题。

一些移动设备和浏览器可能会禁用Cookie或Session。

#### 4.2 JWT实现Token

简而言之，就是通过可逆加密算法，生成一段包含用户、过期时间等关键信息的Token。每次请求服务器都会拿着这个Token解密出来得到用户信息。判断用户状态。

![image-20231031090325004](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231031090325004.png)

优点：JWT最大的特点是服务器不保存会话状态，无论哪一个服务器解析出来都是一样的，因此不需要做任何查询操作。省掉了数据库/Redis的开销。

缺点：

1. 正是由于JWT的特点，使用期间不可能取消令牌和过期时间，一旦JWT签发，就会等到有效期过去之后失效。
2. 无法主动更新Token的时效性，其实也就是如果用户传过来的 Token没有过期服务器，浏览器就会一直认为这个用户是有效的。假设有一个场景：用户被封禁，但是他的Token没有过期，服务器仍然认为该用户操作是合法的，有一个解决方案是委会一张JWT黑名单表，只要没有在表上的JWT都是有效的，但是随之而来的 就是这个JWT黑名单表存在什么地方，如果存在服务端，那么又要搞多台服务器同步，存到关系型数据库，那么查询库的效率又低，存在缓存中，又回到了之前的Token丢失问题。
3. 解析Token也是消耗服务器CPU的资源。

#### 4.3  登录接口

```java
public interface LoginService {

    /**
     * 根据uid获取到用户的Token
     * @param id
     * @return
     */
    String login(Long id);

    /**
     * 校验Token是否过期
     */
    void verifyToken(String token);

    /**
     * 刷新token有效期
     */
    void renewalTokenIfNecessary(String token);

    /**
     * 如果Token有效，返回UID
     */
    Long getValidUid(String token);
}
```

实现类LoginServiceImpl.java

```java
@Service
public class LoginServiceImpl implements LoginService {
    public static final int TOKEN_EXPIRE_KEYS = 3;

    @Autowired
    private JwtUtils jwtUtils;
    @Override
    public String login(Long id) {
        String token = jwtUtils.createToken(id);
        RedisUtils.set(RedisKey.getKey(RedisKey.USER_TOKEN_STRING, id), token, TOKEN_EXPIRE_KEYS, TimeUnit.DAYS);
        return token;
    }

    @Override
    public void verifyToken(String token) {

    }

    @Override
    public void renewalTokenIfNecessary(String token) {

    }

    @Override
    public Long getValidUid(String token) {
        token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1aWQiOjIwMDEyLCJjcmVhdGVUaW1lIjoxNjk4NzIyNTkzfQ.h_f4-e4OdlBZvCFb1xdUBB9zaLdY1xixvFgnQniuxPg";
        Long uid = jwtUtils.getUidOrNull(token);
        if (Objects.isNull(uid)) {
            return null;
        }
        String oldToken = RedisUtils.get(getUserTokenKey(uid));
        if (StringUtils.isBlank(oldToken)) {
            return null;
        }
        return uid;
    }

    private String getUserTokenKey(Long uid) {
        return RedisKey.getKey(RedisKey.USER_TOKEN_STRING, uid);
    }
}

```

我们使用JWT来封装一个Token，用来存储我们用户的信息，然后将这个Token给前端返回过去，我们前端拿到这个Token之后就可以进行返回，后端接收到这个Token，将这个Token进行解密，拿到用户信息。getValidUid方法可以根据Token获取到用户的Uid。

#### 4.4  进行测试

```java
    @Test
    public void redisTest() {
        String token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1aWQiOjIwMDEyLCJjcmVhdGVUaW1lIjoxNjk4NzIyNTkzfQ.h_f4-e4OdlBZvCFb1xdUBB9zaLdY1xixvFgnQniuxPg";
        Long validUid = loginService.getValidUid(token);
        System.out.println(validUid);
    }
```

得到的结果：

![image-20231031133900188](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231031133900188.png)

![image-20231031133955458](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231031133955458.png)

数据库中正是20012，结果正确。



## Redis引入

### 1、整合Redis

#### 1.1  引用依赖

```xml
		<dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
```

#### 1.2  配置文件

```yaml
spring:
  redis:
    # Redis服务器地址
    host: ${mallchat.redis.host}
    # Redis服务器端口号
    port: ${mallchat.redis.port}
    # 使用的数据库索引，默认是0
    database: 0
    # 连接超时时间
    timeout: 1800000
    # 设置密码
    password: ${mallchat.redis.password}
  jackson:
    serialization:
      write-dates-as-timestamps: true
```

```properties
##################redis??##################
mallchat.redis.host=124.222.22.118
mallchat.redis.port=6379
mallchat.redis.password=123456
```

#### 1.3  实践

```java
@Autowired
private RedisTemplate redisTemplate;

@Test
public void redisTest() {
    redisTemplate.opsForValue().set("name", "卷心菜");
    String name = (String) redisTemplate.opsForValue().get("name");
    System.out.println(name);
}
```

测试成功。说明Redis引入成功。

但是我们的问题也就出现了，我们的值是：![image-20231031103104092](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231031103104092.png)

是序列化后的值，因为是使用默认的redisTemplate对象时，默认会将值抓换成byte类型。多以就出现了上述的结果。

原本我们打算使用自定义的序列化器来解决这个问题：

```java
@Configuration
public class RedisConfig {
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory)
            throws UnknownHostException {
        // 创建模板
        RedisTemplate<String, Object> redisTemplate = new RedisTemplate<>();
        // 设置连接工厂
        redisTemplate.setConnectionFactory(redisConnectionFactory);
        // 设置序列化工具
        GenericJackson2JsonRedisSerializer jsonRedisSerializer =
                new GenericJackson2JsonRedisSerializer();
        // key和 hashKey采用 string序列化
        redisTemplate.setKeySerializer(RedisSerializer.string());
        redisTemplate.setHashKeySerializer(RedisSerializer.string());
        // value和 hashValue采用 JSON序列化
        redisTemplate.setValueSerializer(jsonRedisSerializer);
        redisTemplate.setHashValueSerializer(jsonRedisSerializer);
        return redisTemplate;
    }
}
```

当配置好配置类的时候，再次执行上文的代码就不会出现这种情况，但是还有问题，如果我们的value是一个对象的时候，不仅仅是这个问题，由于我们的value是object类型，在反序列化的时候还是经常会出现将Long类型的值转换成int 值导致泛型转化失败等场景。

不推荐使用反序列器，直接使用StringRedisTemplate类来处理。但是使用StringRedisTemplate的话就只能处理String类型的redis，所以我们还是需要加上一个RedisUtils工具类（由于太长，不复制了，见项目中的common.utils包下的类）。

虽然我们使用的是StringRedisTemplate，但是代码中是支持Object类的，以及取出任意类型对象的值，工具类中封装了方法会对object的值转换成JSON。我使用的JackSon来处理，本来是可以使用Hutool工具包中的JSONUtil来处理的，但是由于Hutool中有BUG，所以我们使用的是自定义的JackSon反序列化器。

```java
// 使用的是JackSon，正确的结果    
@Test
    public void jsonTest() {
        Long obj = JsonUtils.toObj("1", Long.class);
        System.out.println(obj);
    }
```

![image-20231031104650350](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231031104650350.png)

![image-20231031104734920](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231031104734920.png)

### 2、引入Redisson

#### 2.1  引入依赖

```xml
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson-spring-boot-starter</artifactId>
</dependency>
```

#### 2.2  配置类

```java
@Configuration
public class RedissonConfig {
    @Autowired
    private RedisProperties redisProperties;

    @Bean
    public RedissonClient redissonClient() {
        Config config = new Config();
        config.useSingleServer()
                .setAddress("redis://" + redisProperties.getHost() + ":" + redisProperties.getPort())
                .setPassword(redisProperties.getPassword())
                .setDatabase(redisProperties.getDatabase());
        return Redisson.create(config);
    }
}
```

#### 2.3  测试Redisson

```java
    @Test
    public void redissonTest() throws Exception {
        RLock lock = redissonClient.getLock("123");
        lock.lock();
        System.out.println();
        lock.unlock();
    }
```

打上断点，测试成功。

## 项目的线程池同一管理

由于我们采用了双Token的设计，所以说存在一个Token的刷新操作，但是这个操作我想做成用户无感知的 ，前端无感知。并且对于整体的功能影响不大，所以我们采用异步来处理。

首先我们能够想到的是使用线程池来开一个线程。同时还有使用Spring自带的@Async注解来实现异步逻辑。

其实我们在这个项目中二者都是用到的。但是Spring自带的@Async注解存在弊端，

> @Async注解，本身采用的是默认的SimpleAsyncTaskExecutor线程池，有一个任务就会创建一个线程，会导致资源耗尽。所以我们需要使用自定义的线程池加到这个注解中。

```java
@Configuration
@EnableAsync
public class ThreadPoolConfig implements AsyncConfigurer {
    public static final String MALLCHAT_EXECUTOR = "mallchatExecutor";

    public static final String WS_EXECUTOR = "websocketExecutor";
    @Override
    public Executor getAsyncExecutor() {
        return mallchatExecutor();
    }

    @Bean(MALLCHAT_EXECUTOR)
    @Primary
    public ThreadPoolTaskExecutor mallchatExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setWaitForTasksToCompleteOnShutdown(true); // 优雅结束
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("mallchat-executor-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        // 执行初始化
        executor.initialize();
        return executor;
    }
}
```

我创建的线程池实现了AsyncConfigurer接口，在里面自定义了一份任务线程池，重写getAsyncExecutor方法将这个线程池返回。

![image-20231109165056430](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165056430.png)

> 优雅停止线程：点进源码中其实可以看到一部分是判断****shutdown是true，然后执行shutdown方法，其实这个参数默认就是false，没有优雅停机，我们需要设置成true，这样才会设置成优雅停机。

详细介绍一下各个参数：

1. setWaitForTasksToCompleteOnShutdown()是设置一个优雅停机
2. setCorePoolSize()是一个核心线程数大小
3. setMaxPoolSize()是最大线程数大小
4. setQueueCapacity()是设置阻塞队列为200
5. setThreadNamePrefix()是设置线程的名称前缀，通常在Thread.getName()中可以获取到
6. setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy())是设置拒绝策略，由于我们的数据价值是比较高的，所以我们决定将拒绝策略设置成该线程没有执行完成之后让主线程继续执行
7. 执行初始化

### 异常捕获

先执行我们的测试：

```java
@Test
    public void ExecutorTest() throws InterruptedException {
        executor.execute(() -> {
            if (1 == 1) {
                log.error("12345");
                throw new RuntimeException("错误");
            }
        });
        Thread.sleep(1000);
    }
```

运行结果:

![image-20231109165118835](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165118835.png)

其实这个异常只是JDK给我们报的异常，并不会存到日志中。但是我们需要捕获到这个异常，应该怎么做呢？

如果我们使用try  catch来进行异常捕获，其实会将异常进行捕获并加入到日志中。

![image-20231109165132984](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165132984.png)

> 原理：如果有一个异常没有被捕获，那么其实JVM就会回调dispatchUncaughtException方法，里调用uncaughtException方法，里边就有输出的内容。控制台打印的就是这一串内容。

**如何捕获线程异常？**

Thread中有两个属性：一个类静态变量，一个对象实例。都可以设置异常捕获。区别是一个是作用域单个对象，一个生效的是全局的线程。

通常我们使用的是单个线程，因为可以更好的控制日志的输出粒度。

但是我们的项目一般使用的是线程池来进行处理。

使用线程池的线程工厂，创建一个线程工厂，创建线程的时候给线程添加异常捕获。

```java
@AllArgsConstructor
public class MyThreadFactory implements ThreadFactory {
    private static final MyUncaughtExceptionHandler MY_UNCAUGHT_EXCEPTION_HANDLER = new MyUncaughtExceptionHandler();
    private ThreadFactory original;
    @Override
    public Thread newThread(Runnable r) {
        Thread thread = original.newThread(r);
        thread.setUncaughtExceptionHandler(MY_UNCAUGHT_EXCEPTION_HANDLER);
        return thread;
    }
}
@Slf4j
public class MyUncaughtExceptionHandler implements Thread.UncaughtExceptionHandler {
    @Override
    public void uncaughtException(Thread t, Throwable e) {
        log.error("Exception in thread " + t.getName(), e);
    }
}
```

在设置线程池参数的地方加上设置线程工厂，

```java
executor.setThreadFactory(new MyThreadFactory(executor));
```

再次启动测试类

![image-20231109165150403](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165150403.png)

成功打印日志。

## 握手认证

### 背景：由于我们的Channel连接需要进行认证，但是WebSocket是一个很不稳定的连接。

用户在首次扫码登录的时候，后端会将Channel关联上uid。后期需要进行推送的时候，我们便可以知道消息推送到那个Channel上。

Channel是一个很不稳定的东西，前端需要刷新一下页面，那么Channel就已经断开了，需要重连。重联的Channel谁知道他是什么东西呢？难道用户需要重新进行扫码吗?十分的不合适。

好在前端登录的时候就已经保存了Token，他只需要拿着Token从Channel中发送过来认证一下。我们就能建立起Channel和UID映射关系了。

我们在枚举类中已经定义了三种类型：**登录、心跳包、登录认证**

![image-20231109165205044](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165205044.png)

所以我们在  登录认证  的时候需要进行认证操作。需要将我们的Token进行解析出来UID。然后再推送给前端。

### 具体实现

NettyWebSocketServerHandler.java

```java
@Override
    protected void channelRead0(ChannelHandlerContext ctx, TextWebSocketFrame msg) throws Exception {
        //获取到我们的发送的消息
        String text = msg.text();
        WSBaseReq wsBaseReq = JSONUtil.toBean(text, WSBaseReq.class);
        switch (WSReqTypeEnum.of(wsBaseReq.getType())){
            case LOGIN:
                webSocketService.handleLoginReq(ctx.channel());
                // 前端认证
            case AUTHORIZE:
                webSocketService.authorize(ctx.channel(), wsBaseReq.getData());
                break;
            case HEARTBEAT:
                break;
        }
    }
```

WebSocketServiceImpl.java

```java
		@Override
    public void authorize(Channel channel, String token) {
        Long validUid = loginService.getValidUid(token);
        // 如果查询到这个Token有用户信息，就解析出这个用户信息，然后发送给前端消息
        if (Objects.nonNull(validUid)) {
            User user = userDao.getById(validUid);
            loginSuccess(channel, user, token);
        } else {
            sendMsg(channel, WebSocketAdapter.buildInvalidTokenResp());
        }
    }

		**/**
     * 用户上线成功
     * @param channel
     * @param user
     * @param token
     */
    private void loginSuccess(Channel channel, User user, String token) {
        // 保存Channel的UID
        WSChannelExtraDTO wsChannelExtraDTO = ONLINE_WS_MAP.get(channel);
        wsChannelExtraDTO.setUid(user.getId());

        // todo：用户上线成功的事件

        // 将用户信息传递到前端
        sendMsg(channel, WebSocketAdapter.buildResp(user, token));
    }**
```

对这个Token进行解析，如果有用户信息，就将这个用户的信息返回给前端。并且建立起Channel和用户的信道，存放在临时的Map中，这个Map中存放的都是在线的用户。如果没有用户信息，那么我们给前端返回一个状态6:（***INVALIDATE_TOKEN***）。

验证：

启动项目，发送type:1的请求，扫码，之后会发现传过来的数据是用户信息》

![image-20231109165223242](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165223242.png)

然后设置type:3,data: “token”的值请求，断开连接，再次建立连接，按照常理来说，应该会返回6，因为我们设置的6是无法得到用户信息才会出现的。测试：

![image-20231109165238312](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165238312.png)

还是可以得到用户的信息。这就省去了我们让用户重新扫码建立连接的过程。

## 用户背包表& 发放物品的幂等设计

### 表结构设计

***\**\*\*\*\*\*\*\*背包表\*\*\*\*\*\*\*\*\****

![image-20231109165359690](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165359690.png)

物品表

![image-20231109165414583](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165414583.png)

### 使用代码自动生成器来生成各个层的代码

修改代码中的表的名称,启动。

修改一下代码中的不需要的部分。

### 引入Swagger来和前端进行交互

***\**\*\*\*\*\*\*\*\*\*引入依赖\*\*\*\*\*\*\*\*\*\**\***

```xml
<dependency>
    <groupId>com.github.xiaoymin</groupId>
    <artifactId>knife4j-spring-boot-starter</artifactId>
    <version>2.0.9</version>
</dependency>
```

**添加配置**

```java
package com.zhangxh.mallchat.common.common.config;

import org.springframework.boot.actuate.autoconfigure.endpoint.web.CorsEndpointProperties;
import org.springframework.boot.actuate.autoconfigure.endpoint.web.WebEndpointProperties;
import org.springframework.boot.actuate.autoconfigure.web.server.ManagementPortType;
import org.springframework.boot.actuate.endpoint.ExposableEndpoint;
import org.springframework.boot.actuate.endpoint.web.*;
import org.springframework.boot.actuate.endpoint.web.annotation.ControllerEndpointsSupplier;
import org.springframework.boot.actuate.endpoint.web.annotation.ServletEndpointsSupplier;
import org.springframework.boot.actuate.endpoint.web.servlet.WebMvcEndpointHandlerMapping;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.RestController;
import springfox.documentation.builders.ApiInfoBuilder;
import springfox.documentation.builders.PathSelectors;
import springfox.documentation.builders.RequestHandlerSelectors;
import springfox.documentation.service.Contact;
import springfox.documentation.spi.DocumentationType;
import springfox.documentation.spring.web.plugins.Docket;
import springfox.documentation.swagger2.annotations.EnableSwagger2WebMvc;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * @author Zhangxh
 * @date 2023/11/01/001
 */
@Configuration
@EnableSwagger2WebMvc
public class SwaggerConfig {
    @Bean(value = "defaultApi2")
    Docket docket() {
        return new Docket(DocumentationType.SWAGGER_2)
                .apiInfo(new ApiInfoBuilder()
                        .title("mallchat接口文档")
                        .version("v1.0")
                        .description("mallchat接口文档")
                        .contact(new Contact("梁志超", "<https://www.baidu.com>", "zhangxh3670@126.com"))
                        .build())
                .select()
                .apis(RequestHandlerSelectors.withClassAnnotation(RestController.class))
                .paths(PathSelectors.any())
                .build();
    }
    @Bean
    public WebMvcEndpointHandlerMapping webEndpointServletHandlerMapping(WebEndpointsSupplier webEndpointsSupplier, ServletEndpointsSupplier servletEndpointsSupplier, ControllerEndpointsSupplier controllerEndpointsSupplier, EndpointMediaTypes endpointMediaTypes, CorsEndpointProperties corsProperties, WebEndpointProperties webEndpointProperties, Environment environment) {
        List<ExposableEndpoint<?>> allEndpoints = new ArrayList();
        Collection<ExposableWebEndpoint> webEndpoints = webEndpointsSupplier.getEndpoints();
        allEndpoints.addAll(webEndpoints);
        allEndpoints.addAll(servletEndpointsSupplier.getEndpoints());
        allEndpoints.addAll(controllerEndpointsSupplier.getEndpoints());
        String basePath = webEndpointProperties.getBasePath();
        EndpointMapping endpointMapping = new EndpointMapping(basePath);
        boolean shouldRegisterLinksMapping = this.shouldRegisterLinksMapping(webEndpointProperties, environment, basePath);
        return new WebMvcEndpointHandlerMapping(endpointMapping, webEndpoints, endpointMediaTypes, corsProperties.toCorsConfiguration(), new EndpointLinksResolver(allEndpoints, basePath), shouldRegisterLinksMapping, null);
    }
    private boolean shouldRegisterLinksMapping(WebEndpointProperties webEndpointProperties, Environment environment, String basePath) {
        return webEndpointProperties.getDiscovery().isEnabled() && (StringUtils.hasText(basePath) || ManagementPortType.get(environment).equals(ManagementPortType.DIFFERENT));
    }

}
```

注意一个点，我们创建配置类的时候使用了额外的MVC的相关配置。这是因为我们使用的SpringBoot是2.6版本，那么其实这个版本的boot已经将AntPathMatcher更改成PathPatternParser，所以我们启动swagger会报错，方法便是切回原本的AntPathMatcher。

我们还需要再yml文件中添加上：

```yaml
spring:
  mvc:
    pathmatch:
      matching-strategy: ant_path_matcher
```

代码中主要是将Bean进行替换。

启动项目，访问：localhost:8080/doc.html。出现：

![image-20231109165436443](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165436443.png)

说明了我们的swagger已经搭建成功。

但是此时我们的代码中接口、实体类属性并没有添加相关的注解，无法显示具体的注释

![image-20231109165450881](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165450881.png)

这是添加上注释的效果。

先写一个接口：

```java
@RestController
// 表示C端接口，方便网关的判断
@RequestMapping("/capi/user")
@Api(value = "用户相关接口")
public class UserController {

    // 如果接口中有public的就是说明都可以访问，没有登录态的限制
    @GetMapping("/userInfo")
    @ApiOperation("获取用户个人信息")
    public UserInfoResp getUserInfo(@RequestParam Long uid) {
        return null;
    }
}
```

这是获取用户相关信息的接口。

我们的返回值需要什么属性呢？

```java
@Data
public class UserInfoResp {
    @ApiModelProperty("用户id")
    private Long id;
    @ApiModelProperty("用户名称")
    private String name;
    @ApiModelProperty("用户头像")
    private String avatar;
    @ApiModelProperty("性别")
    private Integer sex;
    /**
     * 改名剩余的次数
     */
    @ApiModelProperty("剩余的改名次数")
    private Integer modifyNameChance;
}
```

> 类上的接口的位置，我们加上 /capi  原因是这是C端的应用，还有一个是  /bapi  是B端应用。还有一个方法的接口上有的会存在  /public  这样的，这样的是没有登录态的限制，也就是说明所有人，无论是否登录，都可以访问。还有的没有  /public  修饰的是存在登录态的限制的。用户必须登录。

### 与前端的交互

我们需要再页面中显示是否有问题以及问题的消息，比如 “您的访问频率过于频繁”  。那么我们需要封装一个实体类用来返回，

```java
@Data
@ApiModel("基础返回体")
public class ApiResult<T> {
    @ApiModelProperty("成功标识true or false")
    private Boolean success;
    @ApiModelProperty("错误码")
    private Integer errCode;
    @ApiModelProperty("错误消息")
    private String errMsg;
    @ApiModelProperty("返回对象")
    private T data;

    public static <T> ApiResult<T> success() {
        ApiResult<T> result = new ApiResult<T>();
        result.setData(null);
        result.setSuccess(Boolean.TRUE);
        return result;
    }

    public static <T> ApiResult<T> success(T data) {
        ApiResult<T> result = new ApiResult<T>();
        result.setData(data);
        result.setSuccess(Boolean.TRUE);
        return result;
    }

    public static <T> ApiResult<T> fail(Integer code, String msg) {
        ApiResult<T> result = new ApiResult<T>();
        result.setSuccess(Boolean.FALSE);
        result.setErrCode(code);
        result.setErrMsg(msg);
        return result;
    }

//    public static <T> ApiResult<T> fail(ErrorEnum errorEnum) {
//        ApiResult<T> result = new ApiResult<T>();
//        result.setSuccess(Boolean.FALSE);
//        result.setErrCode(errorEnum.getErrorCode());
//        result.setErrMsg(errorEnum.getErrorMsg());
//        return result;
//    }

    public boolean isSuccess() {
        return this.success;
    }
}
```

除了上述的东西之外，还有其他的请求、响应实体类来处理。

```java
@Data
@ApiModel("游标翻页请求")
@AllArgsConstructor
@NoArgsConstructor
public class CursorPageBaseReq {

    @ApiModelProperty("页面大小")
    @Min(0)
    @Max(100)
    private Integer pageSize = 10;

    @ApiModelProperty("游标（初始为null，后续请求附带上次翻页的游标）")
    private String cursor;

    public Page plusPage() {
        return new Page(1, this.pageSize);
    }

    @JsonIgnore
    public Boolean isFirstPage() {
        return StringUtils.isEmpty(cursor);
    }
}
@Data
@ApiModel("基础翻页请求")
public class PageBaseReq {

    @ApiModelProperty("页面大小")
    @Min(0)
    @Max(50)
    private Integer pageSize = 10;

    @ApiModelProperty("页面索引（从1开始）")
    private Integer pageNo = 1;

    /**
     * 获取mybatisPlus的page
     *
     * @return
     */
    public Page plusPage() {
        return new Page(pageNo, pageSize);
    }
}
@Data
@ApiModel("游标翻页返回")
@AllArgsConstructor
@NoArgsConstructor
public class CursorPageBaseResp<T> {

    @ApiModelProperty("游标（下次翻页带上这参数）")
    private String cursor;

    @ApiModelProperty("是否最后一页")
    private Boolean isLast = Boolean.FALSE;

    @ApiModelProperty("数据列表")
    private List<T> list;

    public static <T> CursorPageBaseResp<T> init(CursorPageBaseResp cursorPage, List<T> list) {
        CursorPageBaseResp<T> cursorPageBaseResp = new CursorPageBaseResp<T>();
        cursorPageBaseResp.setIsLast(cursorPage.getIsLast());
        cursorPageBaseResp.setList(list);
        cursorPageBaseResp.setCursor(cursorPage.getCursor());
        return cursorPageBaseResp;
    }

    @JsonIgnore
    public Boolean isEmpty() {
        return CollectionUtil.isEmpty(list);
    }

    public static <T> CursorPageBaseResp<T> empty() {
        CursorPageBaseResp<T> cursorPageBaseResp = new CursorPageBaseResp<T>();
        cursorPageBaseResp.setIsLast(true);
        cursorPageBaseResp.setList(new ArrayList<T>());
        return cursorPageBaseResp;
    }

}
@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel("基础翻页返回")
public class PageBaseResp<T> {

    @ApiModelProperty("当前页数")
    private Integer pageNo;

    @ApiModelProperty("每页查询数量")
    private Integer pageSize;

    @ApiModelProperty("总记录数")
    private Long totalRecords;

    @ApiModelProperty("是否最后一页")
    private Boolean isLast = Boolean.FALSE;

    @ApiModelProperty("数据列表")
    private List<T> list;

    public static <T> PageBaseResp<T> empty() {
        PageBaseResp<T> r = new PageBaseResp<>();
        r.setPageNo(1);
        r.setPageSize(0);
        r.setIsLast(true);
        r.setTotalRecords(0L);
        r.setList(new ArrayList<>());
        return r;
    }

    public static <T> PageBaseResp<T> init(Integer pageNo, Integer pageSize, Long totalRecords, Boolean isLast, List<T> list) {
        return new PageBaseResp<>(pageNo, pageSize, totalRecords, isLast, list);
    }

    public static <T> PageBaseResp<T> init(Integer pageNo, Integer pageSize, Long totalRecords, List<T> list) {
        return new PageBaseResp<>(pageNo, pageSize, totalRecords, isLastPage(totalRecords, pageNo, pageSize), list);
    }

    public static <T> PageBaseResp<T> init(IPage<T> page) {
        return init((int) page.getCurrent(), (int) page.getSize(), page.getTotal(), page.getRecords());
    }

    public static <T> PageBaseResp<T> init(IPage page, List<T> list) {
        return init((int) page.getCurrent(), (int) page.getSize(), page.getTotal(), list);
    }

    public static <T> PageBaseResp<T> init(PageBaseResp resp, List<T> list) {
        return init(resp.getPageNo(), resp.getPageSize(), resp.getTotalRecords(), resp.getIsLast(), list);
    }

    /**
     * 是否是最后一页
     */
    public static Boolean isLastPage(long totalRecords, int pageNo, int pageSize) {
        if (pageSize == 0) {
            return false;
        }
        long pageTotal = totalRecords / pageSize + (totalRecords % pageSize == 0 ? 0 : 1);
        return pageNo >= pageTotal ? true : false;
    }
}
```

那么我们在接口中就需要更改信息。

```java
@RestController
// 表示C端接口，方便网关的判断
@RequestMapping("/capi/user")
@Api(tags = "用户相关接口")
public class UserController {

    // 如果接口中有public的就是说明都可以访问，没有登录态的限制
    @GetMapping("/userInfo")
    @ApiOperation("获取用户个人信息")
    public ApiResult<UserInfoResp> getUserInfo(@RequestParam Long uid) {
        return null;
    }
}
```

此时已经完成了前后端的交互，来看看swagger页面

![image-20231109165515796](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165515796.png)

但是针对于我们的 获取个人信息接口而言，如果我们就是给设置成**Long uid**，那么问题就大了，如果一个用户随便色值一个UID，直接访问到别人的用户信息，所以我们的uid绝对不能让前端来传。由此我们引入了**拦截器**的概念。

### 登录拦截器

我们打算将用户获取接口的时候进行身份验证，我们新建一个TokenInterceptor.java

```java
@Component
public class TokenInterceptor implements HandlerInterceptor {
    public static final String AUTHORIZATION = "Authorization";
    public static final String BEARER_ = "Bearer ";
    public static final String UID = "uid";

    @Autowired
    private LoginService loginService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String token = getToken(request);
        Long validUid = loginService.getValidUid(token);
        if (Objects.nonNull(validUid)) { // 用户有登录态
            request.setAttribute(UID, validUid);
        } else { // 用户未登录
            // 判断是否是/public接口
            String requestURI = request.getRequestURI();
            String[] split = requestURI.split("/");
            boolean isPublicURI = split.length < 2 && "public".equals(split[3]);
            if (!isPublicURI) {
                // 返回401
                HttpErrorEnum.ACCESS_DENIED.sendHttpError(response);
                return false;
            }
        }
        return true;
    }

    private String getToken(HttpServletRequest request) {
        String header = request.getHeader(AUTHORIZATION);
        String token = Optional.ofNullable(header)
                .filter(h -> h.startsWith(BEARER_))
                .map(h -> h.replaceFirst(BEARER_, ""))
                .orElse(null);
        return token;
    }
}
```

当然，我们配置了这个拦截器并没有起到真正的拦截的作用，我们还需要写一个配置类：Interceptor.java

```java
@Configuration
public class InterceptorConfig implements WebMvcConfigurer {

    @Autowired
    private TokenInterceptor tokenInterceptor;

    @Autowired
    private CollectorInterceptor collectorInterceptor;
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tokenInterceptor)
                .addPathPatterns("/capi/**");
    }
}
```

接口：

```java
@GetMapping("/userInfo")
    @ApiOperation("获取用户个人信息")
    public ApiResult<UserInfoResp> getUserInfo(HttpServletRequest request) {
        System.out.println(TokenInterceptor.UID);
        return null;
    }
```

启动项目。访问接口。

我们将我们的Token放入到ApiPost中的全局变量：

![image-20231109165533068](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165533068.png)

访问接口，控制台打印我们的用户id。由于我们的 接口是没有/public修饰的。我们直接使用带有token的肯定是可以访问成功的，但是如果我们将Token删除之后重新请求的时候就会出现401错误，是我们设置的给前端返回的响应码以及响应信息。

我们思考，接口的位置时候可以不使用参数呢？直接在代码中获取request的UID呢？

我们又延伸了一层拦截器：CollectorInterceptor.java

```java
@Component
public class CollectorInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Long uid = Optional.ofNullable(request.getAttribute(TokenInterceptor.UID)).map(Object::toString).map(Long::parseLong).orElse(null);
        String ip = ServletUtil.getClientIP(request);
        RequestInfo requestInfo = new RequestInfo();
        requestInfo.setUid(uid);
        requestInfo.setIp(ip);
        RequestHolder.set(requestInfo);
        return true;
    }

    // 移除ThreadLocal，防止内存泄漏
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        RequestHolder.remove();
    }
}
```

我们封装一层包含用户 uid 和 用户 IP 的实体类。

```java
@Data
public class RequestInfo {
    // 用户UID
    private Long uid;
    // 用户ip
    private String ip;
}
```

我们使用ThreadLocal来将用户的一次请求的数据封装在其中，然后可以实现一个线程中的数据获取，

```java
public class RequestHolder {
    private static final ThreadLocal<RequestInfo> threadLocal = new ThreadLocal<>();

    public static void set(RequestInfo requestInfo) {
        threadLocal.set(requestInfo);
    }

    public static RequestInfo get() {
        return threadLocal.get();
    }

    /**
     * ThreadLocal移除
     */
    public static void remove() {
        threadLocal.remove();
    }
}
```

接口的信息：

```java
@GetMapping("/userInfo")
    @ApiOperation("获取用户个人信息")
    public ApiResult<UserInfoResp> getUserInfo(HttpServletRequest request) {
        return ApiResult.success(userService.getUserInfo(RequestHolder.get().getUid()));
    }
```

由此一来，代码便优雅了许多，各个层有各个层应该做的事情。

### 异常处理类

在我们处理修改用户名的接口的时候会出现我们两个异常：一个是用户名不能为空，另一个是用户名长度不能超过6个字符。一旦超过这个限制就要抛出异常，但是这异常我们不能直接在控制台打印输出，而需要拦截。

首先我们需要知道我们的参数限制加在哪里？直接加载实体类中，加上参数校验即可，不需要在代码中判断。

```java
@Data
public class ModifyNameReq {
    // 加上入参校验
    @ApiModelProperty("用户名")
    @NotBlank(message = "用户名不可以为空偶")
    @Length(max = 6, message = "用户名不可以太长偶")
    private String name;

    @NotNull()
    private Integer id;
}
```

发送请求：

会发现报错400，并且都是一些无聊的英文默认显示。并且后端控制台报错：MethodArgumentNotValidException。那肯定不合适，我们需要让前端看得懂我在传递什么参数，所以我们对这个异常进行捕获并将内容展示给前端。

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    @ExceptionHandler(value = MethodArgumentNotValidException.class)
    public ApiResult<?> methodArgumentNotValidException(MethodArgumentNotValidException e) {
        StringBuilder errorMsg = new StringBuilder();
        e.getBindingResult().getFieldErrors().forEach(f -> errorMsg.append(f.getField()).append(f.getDefaultMessage()).append(","));
        String message = errorMsg.toString();
        System.out.println();
        // 参数校验失败的异常
        return ApiResult.fail(CommonErrorEnum.PARAM_INVALID.getCode(), message.substring(0,message.length() - 1));
    }

    @ExceptionHandler(value = Throwable.class)
    public ApiResult<?> throwable(Throwable throwable) {
        log.error("system exception! The reason is:{}", throwable.getMessage());
        return ApiResult.fail(CommonErrorEnum.SYSTEM_ERROR);
    }
}
```

这是我们的异常枚举类

```java
@AllArgsConstructor
@Getter
public enum CommonErrorEnum implements ErrorEnum{
    PARAM_INVALID(-2, "参数校验失败"),
    SYSTEM_ERROR(-1, "系统出差去了，请稍后再试哦~~");

    private final Integer code;

    private final String msg;

    @Override
    public Integer getErrorCode() {
        return code;
    }

    @Override
    public String getErrorMessage() {
        return msg;
    }
}
```

这是我们的错误码的接口：

```java
public interface ErrorEnum {

    Integer getErrorCode();
    String getErrorMessage();
}
```

为什么这么设计呢？最主要的还是为了代码的简洁，我们在代码中尽量少的传递参数，并且尽量避免魔法值，所以我们就把这些单独封装出来，会好用的多。

在ApiResult类中添加上一个新的失败的方法：

```java
public static <T> ApiResult<T> fail(ErrorEnum errorEnum) {
        ApiResult<T> result = new ApiResult<T>();
        result.setSuccess(Boolean.FALSE);
        result.setErrCode(errorEnum.getErrorCode());
        result.setErrMsg(errorEnum.getErrorMessage());
        return result;
    }
```

其实在全局异常捕获器中还对throwable进行处理，为什么呢？其实也就是一个兜底的方法，我们的异常在这个捕获器中没有找到具体的异常处理，那么就会在这个throwable中进行处理。

### 自定义异常定义

当我们在执行更新名称的时候，需要判断用户更新的名称是否是已经存在过了。如果用户填写的名字是已经存在的，那么我们就需要给前端一个反馈，那么因为我们的这个更新名字的方法是void 没有返回值，所以我们需要在代码中设置上异常捕获。然后再全局异常捕获类中将这个异常捕获。

因为这个是个业务异常，我们需要自定义个异常。

```java
@Data
public class BusinessException extends RuntimeException{
    protected Integer errorCode;

    protected String errorMsg;

    public BusinessException(String errorMsg) {
        super(errorMsg);
        this.errorCode = CommonErrorEnum.BUSINESS_ERROR.getErrorCode();
        this.errorMsg = errorMsg;
    }

    public BusinessException(Integer errorCode, String errorMsg) {
        super(errorMsg);
        this.errorMsg = errorMsg;
        this.errorCode = errorCode;
    }
}
    @ExceptionHandler(value = BusinessException.class)
    public ApiResult<?> businessException(BusinessException e) {
        log.info("businessException! The reason is :{}", e.getMessage());
        return ApiResult.fail(e.getErrorCode(), e.getErrorMsg());
    }
```

接口:

```java
	  @Override 
    public void modifyName(Long uid, String name) {
        // 我们的用户名已经做了限制了
        User oldUser = userDao.getByName(name);
        if (Objects.nonNull(oldUser)) {
            throw new BusinessException("名字重复，换个名字吧");
        }
    }
```

最终的实现类：

```java
@Override
    @Transactional(rollbackFor = Exception.class)
    public void modifyName(Long uid, String name) {
        // 我们的用户名已经做了限制了
        User oldUser = userDao.getByName(name);
        AssertUtil.isEmpty(oldUser, "名字已经被抢占了，请换一个~");
        UserBackpack modifyNameItem = userBackpackDao.getFirstValidItem(uid, ItemEnum.MODIFY_NAME_CARD.getId());
        // 该改名卡是null的，就返回改名卡不够了。
        AssertUtil.isNotEmpty(modifyNameItem, "改名卡不够了哦~");

        //使用改名卡
        boolean isSuccess = userBackpackDao.useItem(modifyNameItem);
        if (isSuccess) {
            // 改名
            userDao.modifyName(uid, name);

        } else{
            throw new BusinessException("后台出错!!");
        }
    }
```

## 使用SpringCache来缓存徽章（徽章接口的开发）

### 徽章展示

**业务逻辑：我们先找出所有的徽章列表，然后找到用户所拥有的徽章列表，最后将这两个列表进行结合展示给前端。**

```java
    @GetMapping("/badges")
    @ApiOperation("可选徽章预览")
    public ApiResult<List<BadgesResp>> badges() {
        return ApiResult.success(userService.badges(RequestHolder.get().getUid()));
    }
@Override
    public List<BadgesResp> badges(Long uid) {
        // 先获取所有的徽章列表
        List<ItemConfig> itemConfigs = itemCache.getByType(ItemTypeEnum.BADGE.getType());

        // 查询用户的徽章
        List<Long> collect = itemConfigs.stream().map(ItemConfig::getId).collect(Collectors.toList());
        List<UserBackpack> userBackpacks = userBackpackDao.getByItemIds(uid, collect);

        // 用户当前佩戴的徽章
        User user = userDao.getById(uid);
        return UserAdapter.buildBadgeResp(itemConfigs, userBackpacks, user);
    }
```

在UserAdapter.buildBadgeResp()中进行返回值的判断。

```java
public static List<BadgesResp> buildBadgeResp(List<ItemConfig> itemConfigs, List<UserBackpack> userBackpacks, User user) {
        // 防止用户为空
        if (ObjectUtil.isEmpty(user)) {
            return Collections.emptyList();
        }

        Set<Long> obtainItemSet = userBackpacks.stream().map(UserBackpack::getItemId).collect(Collectors.toSet());
        List<BadgesResp> result = itemConfigs.stream().map(a -> {
                    BadgesResp resp = new BadgesResp();
                    BeanUtil.copyProperties(a, resp);
                    resp.setObtain(obtainItemSet.contains(a.getId()) ? YesOrNoEnum.YES.getStatus() : YesOrNoEnum.NO.getStatus());
                    resp.setWear(ObjectUtil.equal(a.getId(), user.getItemId()) ? YesOrNoEnum.YES.getStatus() : YesOrNoEnum.NO.getStatus());
                    return resp;
                    // 还需要按照穿戴和拥有进行排序
                }).sorted(Comparator.comparing(BadgesResp::getWear, Comparator.reverseOrder())
                        .thenComparing(BadgesResp::getObtain, Comparator.reverseOrder()))
                .collect(Collectors.toList());
        return result;
    }
```

给前端的返回值类：

```java
@Data
public class BadgesResp {

    @ApiModelProperty("徽章id")
    private Long id;

    @ApiModelProperty("徽章图标")
    private String img;

    @ApiModelProperty("徽章描述")
    private String describe;

    @ApiModelProperty("是否拥有，0：未拥有，1：已拥有")
    private Integer obtain;

    @ApiModelProperty("是否穿戴，0：未穿戴，1：已穿戴")
    private Integer wear;
}
```

其中包含徽章ID、徽章图标、徽章描述、是否拥有和是否穿戴属性。

我们在最后处理的时候将前三项进行赋值，然后对比全部的徽章和用户拥有的，如果用户拥有的徽章包含在全部的徽章之中，那么进行下一项判断是否穿戴，是否穿戴的属性设置我们是放在User的实体类中，如果穿戴的话设置返回值是1，最后需要转换成List集合返回给前端。最后我们想在前端展示的时候是穿戴的在最前面，其次是获得的放在第一个之后，最后是没有获得的。

### 结合Spring Cache

由于我们的徽章一般是不会去随便改变的，所以我们打算使用Spring Cache来将这些徽章存储在内存中。

```java
@Component
public class ItemCache {

    @Autowired
    private ItemConfigDao itemConfigDao;

    @Cacheable(cacheNames = "item", key = "'itemsByType:'+#itemType")
    public List<ItemConfig> getByType(Integer itemType) {
        List<ItemConfig> byType = itemConfigDao.getByType(itemType);
        return byType;
    }

    @CacheEvict(cacheNames = "item", key = "'itemsByType:'+#itemType")
    public List<ItemConfig> evictByType(Integer itemType) {
        return null;
    }
}
```

> @Cacheable()是获取缓存中的信息，如果没有就加载进缓存中，之后获取的话直接从缓存中获取。

> @CacheEvict()是清除缓存的注解。

一切准备完成之后启动项目，

![image-20231109165602805](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165602805.png)

这是效果图。

## 物品发放幂等处理

> 我们发放改名卡的时机有两个：一个是我们用户新注册的时候会发放；另一个是一个用户的某一条消息被点赞超过了10次的时候会发放。

### 幂等设计

为什么我们会选择使用幂等来保证发放的可靠性呢？原因是我们发放改名卡的渠道不止一个，那么我们就需要保证分布式场景的事务一致性，目前我们的改名卡发放只是有两种方式，那么我们就需要对这两种方式考虑幂等边界，其实也不难想，边界就是同一个UID只能发送一次，同一条消息只能发送一次。我们之前在**user_backpack**表中做一个字段是**idempotent**的原因。

幂等号：itemId + source + business。

### 具体实现

实现一个判断幂等的接口：

```java
public interface IUserBackpackService {

    /**
     * 用户发放一个物品
     * @param id 用户id
     * @param itemId 物品id
     * @param idempotentEnum 幂等类型
     * @param businessId 幂等唯一标识
     */
    void acquireItem(Long id, Long itemId, IdempotentEnum idempotentEnum, String businessId);
}
```

这里的**IdempotentEnum**类。

```java
@AllArgsConstructor
@Getter
public enum IdempotentEnum {
    UID(1, "uid"),
    MSG_ID(2, "消息id");
    private final Integer type;
    private final String desc;
}
```

接口实现类：

```java
@Service
public class UserBackpackServiceImpl implements IUserBackpackService {

    @Autowired
    private RedissonClient redissonClient;

    @Autowired
    private UserBackpackDao userBackpackDao;
    @Override
    public void acquireItem(Long uid, Long itemId, IdempotentEnum idempotentEnum, String businessId) {
        // 设置幂等号
        String idempotent = getIdempotent(itemId, idempotentEnum, businessId);
        RLock lock = redissonClient.getLock("acquireItem" + idempotent);
        boolean b = lock.tryLock();
        AssertUtil.isTrue(b, "请求过于频繁");
        try {
            UserBackpack userBackpack = userBackpackDao.getByIdempotent(idempotent);
            if (Objects.nonNull(userBackpack)) { // 已经发送成功，不要再次发送
                return;
            }
            // 发放物品
            UserBackpack insert = UserBackpack.builder().uid(uid)
                    .itemId(itemId)
                    .status(YesOrNoEnum.NO.getStatus())
                    .idempotent(idempotent)
                    .build();
            userBackpackDao.save(insert);
        }catch (Exception e) {

        } finally {
            if (lock.isHeldByCurrentThread() && lock.isLocked()) {
                lock.unlock();
            }
        }

    }

    /**
     * 构建一个幂等号
     * @param itemId
     * @param idempotentEnum
     * @param businessId
     * @return
     */
    private String getIdempotent(Long itemId, IdempotentEnum idempotentEnum, String businessId) {
        return String.format("%d_%d_%s", itemId, idempotentEnum.getType(), businessId);
    }
}
```

我们进行一个自测：

```java
@Autowired
    private IUserBackpackService userBackpackService;
    @Test
    public void acquireItem() {
        userBackpackService.acquireItem(20010L, ItemEnum.PLANET.getId(), IdempotentEnum.UID, 20010L + "");

    }
```

数据库添加成功：

![image-20231109165625367](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165625367.png)

重新启动整个项目，

访问**{{url}}/capi/user/badges**接口。

![image-20231109165642960](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165642960.png)

obtain是1，也就是我们进行排序的标识之一。

成功。

但是如果一直使用这个Redisson的lock和释放锁的方法，其实是及其繁琐的。那么按照我们的尿性，我们肯定需要来构建一个模版。那么我们就要封装一个分布式锁的这么一个工具，使用起来更加方便。

我们在common包中的service包下创建一个LockService类。将整个RedissonLock封装在这个类中。然后在这个类中加上几个方法，我们想要实现枷锁的时候可以控制枷锁的过程，比如加锁的时间，时间单位以及Function，无入参但是有出参的Supplier函数，既没有入参也没有出参的函数Runnable。

```java
@Service
public class LockService {
    @Autowired
    private RedissonClient redissonClient;

    public <T> T executeWithLock(String key, int waitTime, TimeUnit timeUnit, Supplier<T> supplier) throws InterruptedException {
        RLock lock = redissonClient.getLock(key);
        boolean isSuccess = lock.tryLock(waitTime, timeUnit);
        if (!isSuccess) {
            throw new BusinessException(CommonErrorEnum.LOCK_LIMIT);
        }
        try {
            return supplier.get();
        } finally {
            lock.unlock();
        }
    }

    public <T> T executeWithLock(String key, Supplier<T> supplier) throws InterruptedException {
        return executeWithLock(key, -1, TimeUnit.MILLISECONDS, supplier);
    }

    public <T> T executeWithLock(String key, Runnable runnable) throws InterruptedException {
        return executeWithLock(key, -1, TimeUnit.MILLISECONDS, () -> {
            runnable.run();
            return null;
        });
    }
}
```

我们的设置徽章方法：

```java
    @Autowired
		private LockService lockService; 
    @Override 
    public void acquireItem(Long uid, Long itemId, IdempotentEnum idempotentEnum, String businessId) {
        // 设置幂等号
        String idempotent = getIdempotent(itemId, idempotentEnum, businessId);
        try {
            lockService.executeWithLock("acquireItem" + idempotent, () -> {
                UserBackpack userBackpack = userBackpackDao.getByIdempotent(idempotent);
                if (Objects.nonNull(userBackpack)) { // 已经发送成功，不要再次发送
                    return;
                }
                // 发放物品
                UserBackpack insert = UserBackpack.builder().uid(uid)
                        .itemId(itemId)
                        .status(YesOrNoEnum.NO.getStatus())
                        .idempotent(idempotent)
                        .build();
                userBackpackDao.save(insert);
            });
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }
```

我们打开方法DaoTest类中的acquireItem()将其中的ItemEnum.REG_TOP10_BADGE属性设置好，启动，入库成功。

其实这样已经够了，但是抱着学习的态度，我们打算继续将这个分布式锁设置成@Cachable注解类似的模样。

### 使用注解实现分布式锁

注解：**@RedissonLock**

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RedissonLock {
    /**
     * Key的前缀，默认取方法全限定名
     * @return
     */
    String prefixKey() default "";

    /**
     * 支持SpringEL表达式的Key
     * @return
     */
    String key();

    /**
     * 等待锁的排队时间， 默认快速失败
     * @return
     */
    int waitTime() default -1;

    /**
     * 等待时间单位，默认是毫秒
     * @return
     */
    TimeUnit unit() default TimeUnit.MILLISECONDS;
}
```

在这个注解中prefixKey + key可以组成一个 key，然后执行lockService中的executeWithLock方法，这个方法中需要一个key ，一个等待的时间，一个时间单位，一个执行的Function函数。

切面（Aspect）：

```java
@Component
@Aspect
@Order(0) // 确保比事务处理先执行，分布式锁在事务之外
public class RedissonLockAspect {

    @Autowired
    private LockService lockService;

    @Around("@annotation(redissonLock)")
    public Object around(ProceedingJoinPoint joinPoint, RedissonLock redissonLock) throws Throwable{
        Method method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        String prefix = StringUtils.isBlank(redissonLock.prefixKey())? SpElUtils.getMethodKey(method): redissonLock.prefixKey();
        String key = SpElUtils.parseSpEl(method, joinPoint.getArgs(), redissonLock.key());

        return lockService.executeWithLock(prefix + ":" + key, redissonLock.waitTime(), redissonLock.unit(), joinPoint::proceed);
    }
}
```

prefix—>是类的全限定名 + 方法名。

key——>入参名。

获取的具体方式：

```java
public class SpElUtils {
    private static final ExpressionParser PARSER = new SpelExpressionParser();
    // 使用Spring 的NameDiscover可以来获取到方法中的具体参数值
    private static final DefaultParameterNameDiscoverer PARAMETER_NAME_DISCOVERER = new DefaultParameterNameDiscoverer();

    public static String getMethodKey(Method method) {
        return method.getDeclaringClass() + "#" + method.getName();
    }

    public static String parseSpEl(Method method, Object[] args, String spEl) {
        String[] params = Optional.ofNullable(PARAMETER_NAME_DISCOVERER.getParameterNames(method)).orElse(new String[]{});
        EvaluationContext context = new StandardEvaluationContext();
        for (int i = 0; i < params.length; i++) {
            context.setVariable(params[i], args[i]);
        }
        Expression expression = PARSER.parseExpression(spEl);
        return expression.getValue(context, String.class);
    }
}
```

获取方法全限定名的方法：传入的参数是一个Method方法，这个方法是我们通过切面的切入点进行截获的，所以说最终获取到的是这个方法的相关的参数。

key指的是入参的参数名称。其实本身我们并不能直接通过Spring直接获取到参数名称。所以我们新开辟了一条路。使用Spring的NameDiscover来获取参数名。我们从获取到的名字加入到上下文，然后将这个上下文的内容进行解析存放到spEl中，最后返回这个得到的value值。

然后我们在需要添加这个锁的方法位置加上这个注解。即可完成注解式的分布式锁。

## 补充：将用户的注册事件中加上发放改名卡

先来一遍业务场景：我们需要在新用户注册的时候给用户发放改名卡，如果是前10名或者是前100名注册的，会发放徽章卡。

由于我们的 这个发放徽章卡的业务其实是与主业务相关性不大：理由

> 如果认为我们在用户注册之后必须要给用户一个改名卡，那么我们需要将二者合成一个事务，如果某一个失败了，那么整体都是失败的。

> 其实我认为的场景是用户可以自己注册，但是我们的发放徽章任务其实是不相关的，那么也就意味着其实是没有必要放在一个事务中。

```java
@Override
    @Transactional
    public Long register(User user) {
        userDao.register(user);
        // 用户注册的事件（发放改名卡）
        applicationEventPublisher.publishEvent(new UserRegisterEvent(this, user));
        return user.getId();
    }
```

用户注册的事件

```java
@Getter
public class UserRegisterEvent extends ApplicationEvent {

    private User user;

    public UserRegisterEvent(Object source, User user) {
        super(source);
        this.user = user;
    }
}
```

事件监听器

```java
@Component
public class UserRegisterListener {

    @Autowired
    private IUserBackpackService userBackpackService;

    @Autowired
    private UserDao userDao;

    @Async
    @TransactionalEventListener(classes = UserRegisterEvent.class, phase = TransactionPhase.AFTER_COMMIT)
    public void sendCard(UserRegisterEvent event) {
        User user = event.getUser();
        userBackpackService.acquireItem(user.getId(), ItemEnum.MODIFY_NAME_CARD.getId(), IdempotentEnum.UID, user.getId().toString());
        System.out.println();
    }

    /**
     * 事务之后，给前10名和前100名的注册徽章
     * @param event
     */
    @TransactionalEventListener(classes = UserRegisterEvent.class, phase = TransactionPhase.AFTER_COMMIT)
    public void sendBadge(UserRegisterEvent event) {
        User user = event.getUser();
        int registerCount = userDao.count();
        if (registerCount < 10) {
            userBackpackService.acquireItem(user.getId(), ItemEnum.REG_TOP10_BADGE.getId(), IdempotentEnum.UID, user.getId().toString());
        } else if (registerCount < 100) {
            userBackpackService.acquireItem(user.getId(), ItemEnum.REG_TOP100_BADGE.getId(), IdempotentEnum.UID, user.getId().toString());
        }
    }
}
```

## IP归属地

主要为了迎合现在需要IP展示归属地的需求。也是为了学习一下IP的使用。

### IP的获取

#### Http请求

我们对于Http请求的获取IP地址其实是比较简单的。可以直接设置一个拦截器，将IP地址拦截之后直接存入上下文即可。可以 使用Hutool工具类直接获取IP。此时有一个需要注意的点，就是我们的请求会经过NGINX代理。会隐藏我们的真实IP地址，但是我们存在了![image-20231109170552967](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109170552967.png)

这个位置，可以获取到真实的IP地址。

#### WebSocket请求

我们对于WebSocket请求处理其实就会复杂一点，我们有一个Http协议升级过程。我们需要在升级之前就要获取到这个IP地址。并且将这个IP保存起来。

其实获取起来也不是很复杂，我们在升级之前添加一个Handler处理器，

```java
public class MyHeaderCollectHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        if (msg instanceof HttpRequest) {
            HttpRequest request = (HttpRequest) msg;
            // 取用户IP
            String ip = request.headers().get("X-Real-IP");
            if (StringUtils.isBlank(ip)) {
                // 远端IP
                InetSocketAddress address = (InetSocketAddress) ctx.channel().remoteAddress();
                ip = address.getAddress().getHostAddress();
            }
            // 保存到Channel附件当中
            NettyUtil.setAttr(ctx.channel(), NettyUtil.IP, ip);
            // 处理器只需要使用一次，以后需要的话取出即可
            ctx.pipeline().remove(this);
        }
        ctx.fireChannelRead(msg);
    }
}
```

通过这个处理器，我们可以将获得的IP保存起来，正好我们的Channel有一个保存附件的函数，我们可以将这个IP保存到这个附件中，然后存在Channel中，如果使用的话，直接就可以使用同一个Channel中的附件取出IP就好了。

我们可以在登录成功的时候进行获取IP并且使用监听者的模式进行消费监听。

![image-20231109172001062](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109172001062.png)

### IP的更新

IP的更新时机其实也是一个话题，我们打算在用户首次认证的时候进行IP更新。

首次认证有两个场景：

1. 用户浏览有Token。前端可以拿着进行后端的认证。
2. 用户Token失效重新扫码登录。

对于第二种情况，扫码的时候微信会给我们回调，我们通过回调的Code，去找出Code对应的连接Channel，再从我们的Channel中拿到用户的信息。

#### IP的保存

我们存在数据库中的IP是一个JSON格式的字符串，我们可以取到这个JSON字符串来进行反序列化成对象。

实体类：

IpInfo（IP信息类）

```java
@Data
public class IpInfo implements Serializable {
    // 注册时的IP
    private String createIp;

    // 最新登录的IP
    private String updateIp;

    // 注册时的IP详情
    private IpDetail createIpDetail;

    // 最新登录的IP详情
    private IpDetail updateIpDetail;
}
```

IpDetail（IP细节类）

```java
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class IpDetail implements Serializable {
    private String ip;
    private String isp;
    private String ispId;
    private String city;
    private String city_id;
    private String country;
    private String country_id;
    private String region;
    private String region_id;
}
```

#### IP归属地的解析

##### 基于ip2region文件索引

github的开源的 IP地址库，地址：https://github.com/lionsoul2014/ip2region。

需要在项目启动的时候预加载文件数据，里面的地址不会更新，需要更新的话要自己写爬虫。

##### 基于淘宝的源

相较于上边的 ，淘宝的就显得会更智能一点，但是唯一的不足就是有频控，可以测试一下：

```java
curl --request GET \
  --url 'https://ip.taobao.com/outGetIpInfo?ip=112.96.166.230&accessKey=alibaba-inc' \
  --header 'content-type: application/json' 
```

![image-20231109174000668](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109174000668.png)

如果想要使用淘宝的接口，那么我们就需要自己设置频控。

#### 异步解析淘宝IP接口框架实现

![image-20231110084958937](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231110084958937.png)

对于我们的后台用户，其实结合起来的用户的操作都是并行的，如果直接设置成请求阻塞等待的话，其实会走我们的服务器，我们的服务器很容易被限流。也就意味着很容易就会达到淘宝的限流的次数。

基于淘宝的限流，我们有以下几点：

1. 把IP解析做成一个任务，加入到等待队列中，一个个排队解析，不要太快。
2. 针对某一个任务解析失败，需要可以重试，但是重试也是要有最大次数。
3. 淘宝解析接口很慢，我们需要让这个业务解耦，采用异步的方式来处理。

综上，我们可以使用**coreSize = 1**的线程池来处理，线程池的阻塞队列用来排队。

我们的IP解析的接口

![image-20231110090152038](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231110090152038.png)

我们的 线程池：

```java
private static ExecutorService executor = new ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS,
            new LinkedBlockingQueue<Runnable>(500), new NamedThreadFactory("refresh-ipDetail", false));
```

异步解析

```java
    @Autowired
    private UserDao userDao;
    @Override
    public void refreshIpDetailAsync(Long uid) {
        executor.execute(() -> {
            User user = userDao.getById(uid);
            IpInfo ipInfo = user.getIpInfo();
            if (Objects.isNull(ipInfo)) {
                return;
            }
            String ip = ipInfo.needRefreshIp();
            if (StringUtils.isBlank(ip)) {
                return ;
            }
            IpDetail ipDetail = tryGetIpDetailOrNullTreeTimes(ip);
            if (Objects.nonNull(ipDetail)) {
                ipInfo.refreshIpDetail(ipDetail);
                User update = new User();
                update.setId(uid);
                update.setIpInfo(ipInfo);
                userDao.updateById(update);
            }
        });
    }
```

重试策略：

```java
    private static IpDetail tryGetIpDetailOrNullTreeTimes(String ip) {
        for (int i = 0; i < 3; i++) {
            IpDetail ipDetail = getIpDetailOrNull(ip);
            if (Objects.nonNull(ipDetail)) {
                return ipDetail;
            }
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                log.error("tryGetIpDetailOrNullTreeTimes InterruptedException", e);
            }
        }
        return null;
    }
```

具体的解析任务

```java
    private static IpDetail getIpDetailOrNull(String ip) {
        try {
            String url = "https://ip.taobao.com/outGetIpInfo?ip=" + ip + "&accessKey=alibaba-inc";
            String data = HttpUtil.get(url);
            ApiResult<IpDetail> result = JsonUtils.toObj(data, new TypeReference<ApiResult<IpDetail>>() {
            });
            return result.getData();
        } catch (Exception e) {
            return null;
        }
    }
```

> 使用Hutool工具包发送get请求，获取到JSON数据之后使用我们自定义的JSON数据包进行解析。而这个自定义的JSON工具包其实是基于JackSon依赖，提供了一个objectMapper，然后对这个objectMapper进行readValue()处理。如果是Class类，那么直接调用toObj(String str, Class<?> clazz)，如果是泛型对象，那么我们就调用toObj(String str, TypeReference<T> clz);

由于这个线程池不是spring管理的线程池，所以我们需要自己进行优雅停机，同时我们海狮需要实现**DisposableBean**接口，重写destroy方法

```java
    @Override
    public void destroy() throws Exception {
        executor.shutdown();
        if(!executor.awaitTermination(30, TimeUnit.SECONDS)) {
            if(executor.isErrorEnabled()) {
                log.error("Time out while waiting for executor [{}] to termination", executor);
            }
        }
    }
```

现在唯一的 问题就是由于我们使用的是线程池，没用使用MQ，那么其实可靠性就没有办法保证，但是其实好像一次并没有那么重要，因为下一次登录的时候在记录不就好了吗，所以说引入MQ的意义并不大。

## 黑名单功能——抹茶守护者

作为一个聊天网站，最主要的就是言论的约束。如果跑进一个蔡徐坤，发出一些不恰当的言论，那么我们有两种手段来进行约束，**撤回**和**拉黑。**

拉黑功能是管理员的专属的功能。为了能够是前后端都可以有这个角色的权限界定。我们还需要故意设计一个权限管理系统。

当然这个权限管理的系统没有必要过于复杂，传统的权限设计是：一个用户可以有多个角色，一种角色也可以有多种权限，权限有多种比如接口、按钮、菜单。

![image-20231109165721759](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165721759.png)

权限管理更多的用于B端项目，对于我们的C端来说，权限没有必要设计的太过于复杂。我们和前端约定，权限做到角色的级别就够了。角色有啥特殊资源，前后端写死就行了。

我们设置了两个角色：超级管理员（撤回和拉黑） 和 抹茶管理员（撤回）。

![image-20231109165736114](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231109165736114.png)

一个用户有多个角色，一个角色也可以属于多个用户，

### 拦截时间点

对于拦截的时间点，我们决定采用对于每一个接口进行拦截，如果用户被拉黑了，那么任何一个接口都不能访问，算是惩罚。

### 数据源

黑名单是一个相对静态的数据，并且需要实时的判断，可以将它缓存在redis中。对于单机而言，也是可以缓存在本地缓存中。

### 实现细节

#### 1、返回角色信息

#### 2、管理员拉黑

1. **权限判断**

​	管理员调用拉黑接口，首先需要校验管理员是否拥有某个权限，简单点就是用户是否拥有某一个角色。 如果是超级管理员，默认有权	限。并且用户的角色，做了一层本地缓存。

2. **用户拉黑**

​	将用户的UID和IP入库。

3. **发出拉黑事件**

- 清除所有的缓存，拉黑立刻生效。
- 对该用户的所有的消息进行删除，以后不会出现在消息列表中。
- 给所有的 用户 推送用户拉黑事件。

#### 3、WebSocket推送拉黑事件

拉黑用户一般是会立马推送到所有的在线用户。前端接收到拉黑通知，会对消息列表和成员列表对拉黑的uid进行匹配，将该uid 下的 所有的消息从前端缓存中进行删除。

#### 4、拉黑用户拦截

被拉黑的用户以后再也没有办法访问该网站了，在拦截器中取出所有的黑名单列表Set，对请求者的UID和IP进行匹配，如果存在，就会拒绝访问。

### 具体实现

#### 1、权限系统

最首要的是我们先对整体的系统做一个权限认证部分，也就是判断某一个用户是否拥有某一个角色。也就是判断是否有角色ID？

Role.java

```java
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("role")
public class Role implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * id
     */
      @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 角色名称
     */
    @TableField("name")
    private String name;

    /**
     * 创建时间
     */
    @TableField("create_time")
    private LocalDateTime createTime;

    /**
     * 修改时间
     */
    @TableField("update_time")
    private LocalDateTime updateTime;
}
```

UserRole.java

```java
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("user_role")
public class UserRole implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * id
     */
      @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * uid
     */
    @TableField("uid")
    private Long uid;

    /**
     * 角色id
     */
    @TableField("role_id")
    private Long roleId;

    /**
     * 创建时间
     */
    @TableField("create_time")
    private LocalDateTime createTime;

    /**
     * 修改时间
     */
    @TableField("update_time")
    private LocalDateTime updateTime;


}
```

Black.java

```java
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("black")
public class Black implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * id
     */
      @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 拉黑目标类型 1.ip 2uid
     */
    @TableField("type")
    private Integer type;

    /**
     * 拉黑目标
     */
    @TableField("target")
    private String target;

    /**
     * 创建时间
     */
    @TableField("create_time")
    private LocalDateTime createTime;

    /**
     * 修改时间
     */
    @TableField("update_time")
    private LocalDateTime updateTime;


}

```

我们在拉黑用户之后其实有一个需求是向所有的用户发送一个消息。这是我们的第一个任务。

我们需要在调用拉黑的时候进行全局发送消息。我们的**UserBlackListener.java**

```java
@Component
public class UserBlackListener {
    
    @Autowired
    private WebSocketService webSocketService;
    
    @Async
    @TransactionalEventListener(classes = UserBlackEvent.class, phase = TransactionPhase.AFTER_COMMIT)
    public void sendMsg(UserBlackEvent event) {
        User user = event.getUser();
        webSocketService.sendMsgToAll(WebSocketAdapter.buildBlack(user));
    }
}
```

线程池webSocketExecutor:

```java
    @Bean(WS_EXECUTOR)
    public ThreadPoolTaskExecutor webSocketExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setWaitForTasksToCompleteOnShutdown(true); // 优雅结束
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("mallchat-executor-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy()); // 满了直接丢弃了
        executor.setThreadFactory(new MyThreadFactory(executor));
        // 执行初始化
        executor.initialize();
        return executor;
    }
```

```java
// 将我们的拉黑消息推送给所有的在线用户，传递的是当前的信道和具体的消息内容。
public void sendMsgToAll(WSBaseResp<?> msg) {
    ONLINE_WS_MAP.foreach((channel, ext) -> {
        threadPoolConfig.webSocketExecutor().execute(() -> sendMsg(channel, msg));
    });
}
```

```java
public static WSBaseResp<?> buildBlack(User user) {
    WSBaseResp<WSBlack> resp = new WSBaseResp<>();
    resp.setType(WSRespTypeEnum.BLACK.getType());
    WSBlack build = WSBlack.builder()
        .uid(user.getId())
        .build();
    resp.setData(build);
    return resp;
}
```

##### 权限控制

由于我们的用户权限并不会随便改变，所以我们决定将这个用户的UID和用户的角色ID存在本地缓存中。

```java
@Component
public class UserCache {
    @Autowired
    private UserRoleDao userRoleDao;
    
    @Autowired
    private BlackDao blackDao;
    
    @Cacheable(cacheNames = "user", key = "'blackList'")
    public Map<Integer, Set<String>> getBlackMap() {
        Map<Integer, List<Black>> collect=blackDao.list().stream().collect(Collectors.groupingBy(Black::getType));
        Map<Integer, Set<String>> result = new HashMap<>();
        collect.forEach((type, list) -> {
            result.put(type, list.stream().map(Black::getTarget).collect(Collectors.toSet()));
        });
        return result;
    }
}
```

```java
@Service
public class RoleServiceImpl implements IRoleService {

    @Autowired
    private UserCache userCache;
    @Override
    public boolean hasPower(Long uid, RoleEnum roleEnum) {
        // 获取到了用户的所有缓存了
        Set<Long> roleSet = userCache.getRoleSet(uid);
        return isAdmin(roleSet) || roleSet.contains((roleEnum.getId()));
    }

    private boolean isAdmin(Set<Long> roleSet) {
        return roleSet.contains(RoleEnum.ADMIN.getId());
    }
}
```

接下来就是黑名单的编写

在我们的 UserServiceImpl.java中

```java
    @Override
    @Transactional
    public void black(BlackReq req) {
        Long uid = req.getUid();
        Black user = new Black();
        user.setType(BlackTypeEnum.UID.getType());
        user.setTarget(uid.toString());
        blackDao.save(user);
        // 查找到用户并且将IP拉黑
        User userByUid = userDao.getById(uid);
        blackIP(Optional.ofNullable(userByUid.getIpInfo()).map(IpInfo::getCreateIp).orElse(null));
        blackIP(Optional.ofNullable(userByUid.getIpInfo()).map(IpInfo::getUpdateIp).orElse(null));
        // 发布事件
        applicationEventPublisher.publishEvent(new UserBlackEvent(this, userByUid));
    }
```

> 记得加上事务操作，为的就是将两个操作和成一个原子操作。

```java
    /**
     * 拉黑IP的方法
     * @param ip
     */
    private void blackIP(String ip) {
        if (StringUtils.isBlank(ip)) {
            return;
        }
        Black insert = new Black();
        insert.setType(BlackTypeEnum.IP.getType());
        insert.setTarget(ip);
        blackDao.save(insert);
        // 给前端通知
    }
```

在发布事件的时候时间监听器:

```java
@Component
public class UserBlackListener {

    @Autowired
    private WebSocketService webSocketService;

    @Autowired
    private UserDao userDao;

    @Autowired
    private UserCache userCache;

    @Async
    @TransactionalEventListener(classes = UserBlackEvent.class, phase = TransactionPhase.AFTER_COMMIT)
    public void sendMsg(UserBlackEvent event) {
        User user = event.getUser();
        webSocketService.sendMsgToAll(WebSocketAdapter.buildBlack(user));
    }

    @Async
    @TransactionalEventListener(classes = UserBlackEvent.class, phase = TransactionPhase.AFTER_COMMIT)
    public void changeUserStatus(UserBlackEvent event) {
        userDao.invalidUid(event.getUser().getId());
    }

    @Async
    @TransactionalEventListener(classes = UserBlackEvent.class, phase = TransactionPhase.AFTER_COMMIT)
    public void evictCache(UserBlackEvent event) {
        userCache.evictBlack();
    }
}
```

事件:

```java
@Getter
public class UserBlackEvent extends ApplicationEvent {

    private User user;

    public UserBlackEvent(Object source, User user) {
        super(source);
        this.user = user;
    }
}
```

其中有几个状态：1、给所有的在线成员发送消息。2、改变用户的状态。3、移除本地缓存。

对于2：

```java
    public void invalidUid(Long id) {
        lambdaUpdate()
                .eq(User::getId, id)
                .set(User::getStatus, YesOrNoEnum.YES.getStatus())
                .update();
    }
```

对于3：

```java
    @CacheEvict(cacheNames = "user", key = "'blackList'")
    public Map<Integer, Set<String>> evictBlack() {
        return null;
    }
```

#### 2、接下来就是要真正限制我们的接口访问权限了

设置我们的黑名单拦截器：BlackInterceptor.java

```java
@Component
public class BlackInterceptor implements HandlerInterceptor {

    @Autowired
    private UserCache userCache;
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Map<Integer, Set<String>> blackMap = userCache.getBlackMap();
        // 判断是否在黑名单中
        RequestInfo requestInfo = RequestHolder.get();
        if (inBlackList(requestInfo.getUid(), blackMap.get(BlackTypeEnum.UID.getType()))) {
            HttpErrorEnum.ACCESS_DENIED.sendHttpError(response);
            return false;
        }
        if (inBlackList(requestInfo.getIp(), blackMap.get(BlackTypeEnum.IP.getType()))) {
            HttpErrorEnum.ACCESS_DENIED.sendHttpError(response);
            return false;
        }
        return true;
    }

    private boolean inBlackList(Object target, Set<String> set) {
        if (Objects.isNull(target) || CollectionUtil.isEmpty(set)) {
            return false;
        }
        return set.contains(target.toString());
    }
}
```

拦截器配置类：

```java
@Configuration
public class InterceptorConfig implements WebMvcConfigurer {

    @Autowired
    private TokenInterceptor tokenInterceptor;

    @Autowired
    private CollectorInterceptor collectorInterceptor;

    @Autowired
    private BlackInterceptor blackInterceptor;
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tokenInterceptor)
                .addPathPatterns("/capi/**");
        registry.addInterceptor(collectorInterceptor)
                .addPathPatterns("/capi/**");
        registry.addInterceptor(blackInterceptor)
                .addPathPatterns("/capi/**");
    }
}
```

由此一来，我们便可以达到拦截黑名单用户的操作，同时我们也可以对某一个用户进行拉黑操作。

# IM顶层设计（重中之重  还未结束）

如下图，这是一个千万级IM系统的设计：

![image-20231114100836877](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231114100836877.png)

​																						**图1** 一个千万级的IM系统顶层设计

抛弃我们的mallchat，我们看看我们设计一个IM系统需要考虑那些那些方面：

![im常见问题.png](https://cdn.nlark.com/yuque/0/2023/png/26318626/1694947061200-ba2044dc-4697-4ca0-9537-6296e0037d65.png?x-oss-process=image%2Fwatermark%2Ctype_d3F5LW1pY3JvaGVp%2Csize_50%2Ctext_TWFsbENoYXQ%3D%2Ccolor_FFFFFF%2Cshadow_50%2Ct_80%2Cg_se%2Cx_10%2Cy_10%2Fresize%2Cw_937%2Climit_0)

​																					**图2** IM系统的顶层设计考虑方面

由于我们的IM是一个web项目，并非是传统的客户端项目，其实mallchat的一些实现方案并不是最好的，所以我们需要去思考一下具体的技术选型，针对图1 ，其实不难看出，这是一个微服务架构，其中IM服务指的是消息聊天服务，所有的消息都会走我们的这个IM服务；Logic服务指的是用户的添加好友、建群、处理心跳、上下线等操作；Auth服务指的是用户的登录认证；Router服务，指的是经过消息队列的消息处理之后的消息推送会走的服务器，主要负责消息的可靠性分析、处理消息重复等。

用户A在建立连接之后，发送一条**“你好”**，IM服务就会处理这个消息，将这个消息入库进行持久化，并且为了保证可靠性，我们将消息推给消息队列MQ，这样可以快速响应前端，并且MQ的消费者根据负载均衡进行慢慢的后续推送，写扩散的操作。

消费者有三个处理方式，一个是最基本的将消息推送给Router服务，Router服务会进行消息的各种推送、ACK机制确认消息可靠等等。另一个是处理写扩散的消息处理，由于我们的用户量可能是很大的，比如总共有10000个用户同时在线，那么如果每一个人都发送一条数据，那么消息的推送就是10000 * 10000，总量是十分巨大的，所以我们需要对这一部分进行处理。写扩散，我们考虑的是将热点数据放在一个单独的热点信箱中，然后通过一个排序将其他信箱和这个热点信箱结合起来，这也就是我们的第三个消息处理方式。

对于我们的这个消费者，我们会判断根据是否是热点群聊的消息做出不同的逻辑。如果是热点群聊，只写热点信箱。如果是单聊或者是普通群聊，会写扩散到每一个群成员的信箱。

将消息投递到信箱之后，需要将消息推送给用户，可以判断是否在线，在线的话进行WebSocket通信，离线的话进行push通知。由于用户的连接在不同的WebSocket上，需要使用Router服务推送到其他的WebSocket。

推送的时候需要判断消息的可靠性，如何保证一定推送成功，要做一层应用层的ACK。类似于TCP的ACK机制。

### 集群推送

http和WebSocket其实都是TCP连接进行通信的。他们的差别是：

- http是无状态的，每一次请求都会重新建立TCP连接进行发送消息，并获得响应。因此http可以随意的进行负载均衡，第一次发送给机器A，第二次发送给机器B。
- WebSocket是有状态的，其中会维持一个长连接，假设一开始连接上机器A，那么一整个请求一直都是在机器A。除非连接断开，重连之后才会更换链接。我们的用户模块就是一个uid对应着一个Channel信道。可以保持一个消息的畅通。

在我们的微信登录的设计中其实已经是用到了WebSocket，并且将uid和Channel存放在一个Map中，进行一个本地化存储。

但是我们的WebSocket其实是有瓶颈期的，集群环境下搭建WebSocket用本地化的Map就显得不太合适。

有很多解决方案：

#### Redis存储Channel

我们想，既然集群中无法使用本地的Map，那么我们把这个uid和Channel对应的Map存放在Redis中不就好了，

![image-20231124152040341](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231124152040341.png)

A想要发送给C，但是两个不在同一个WebSocket上，那么此时我们A需要向IM服务中发送一条消息，IM服务器通过Router转发到C端，已达到消息传递的效果。

看似可行，实则胡说八道。

```java
private void sendMsg(WSBaseResp<?> wsBaseReq, Long uid) {
    Channel channel = RedisUtils.get(uid.toString(), Channel.class);
    channel.writeAndFlush(new TextWebSocketFrame(JSONUtil.toJsonStr(wsBaseReq)));
}
```

**Channel其实就是一个本地的连接，只能存在本地，并不能够序列化和存储。**

<span style="color:red"><strong>这是加粗红</strong></span>

#### 精准投递消息

对比与上述的场景，本地仍然需要维护uid和Channel的关系，Redis维护的是uid和对应的机器的IP，这样Router在发送的时候就会知道消息发送到那一台机器上。

![image-20231124153141368](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231124153141368.png)

<span style="color:red"><strong>有什么问题?</strong></span>

主要的问题还是在WebSocket的连接数瓶颈上。

1. 由于用户可能会一直连接，那么WebSocket就会一直变，Redis就会一直更新用户的连接信息。
2. 连接数爆炸：一个Router就需要连接成千上万个WebSocket，本身WebSocket的连接数就是比较小的，那么全都让Router占用了，用户能够使用到的其实就是比较少的。

> 其实针对这个问题，可以有解决方案，就是再加一层Router，用来处理我们说的这个可能占用WebSocket连接的Router，采用分层路由的思想，中间加上一层路由，设定路由规则，可以有效减少连接数。

3. 实现比较复杂，因为需要IP的指定，维护TCP连接。
4. 消息发送开销：对于群聊而言，多个接受者需要发送多份消息的副本，增加了消息发送的开销
5. 延迟叠加：就算是开启了多线程，也依旧会存在一个单点写扩散的场景，会导致接收者接收到的消息叠加。

### 集群广播消息

![image-20231124155758416](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231124155758416.png)

我们在消息广播的时候，消息只会投递一次，由WebSocket自己进行广播消息的拉取和过滤。

##### 过滤流程

![image-20231124160025809](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231124160025809.png)

#### 优化1： 消息副本的优化

集群广播和精准投递相比，消息副本少了很多，

![image-20231124165114368](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231124165114368.png)

对于精准投递，我们是需要传递2* 3 = 6次，对于集群广播，我们将发送的消息放在一个消息队列中，有WebSocket自动拉取，然后每一个WebSocket对拉取的消息进行过滤，由此一来，需要传递的次数就是2*4=  8次。

既然是集群广播，那么我们需要利用好这个官博的特性，我们将这个消息封装到一起组成一个大消息。那么我们传递的是一个List<Long>的uids。

改造之后的效果：

![image-20231124170030857](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231124170030857.png)

假设我们有一万个用户同时发送消息。对于精准投递消息，

总共传输了1w * 3 = 3w份消息。1w * 3 = 3w个uid。

对于集群广播消息，

总共传输了1w + 1 + 1 * 2 = 1w + 3份。4w个uid。

整体来比较的话，在一个大群聊之中，集群广播会更适合，但如果是小群聊的话，精准投递可能会更适合。

##### 优化2：消息过滤优化

刚才的过滤过程，我们会将本地的Map中的uid取到，但是如果连接很多，不存在的话就会直接丢弃，那么会有很多的uid是无用的，浪费带宽，我们的消息在WebSocket中都是需要序列化和反序列化的。那么我们可否对于这个反序列化的过程进行一个过滤呢？

解决1：rocketMQ中其实存在一个header的方式，将推送的消息uids存储到headers中，我们在拉取消费端的时候就可以在序列化之前在MQ中过滤消息，这样一来，就减少了反序列化的性能瓶颈。

> header中存在长度限制，我们需要注意大群聊中的uid太多的话我们需要进行uid过多的分批发送。或者我们可以直接不考虑群聊场景，将这个场景设置到单聊场景中。

#### 总结（百万直播间推送的方案）



### 消息的时序性

消息的时序性，其实就是消息的展示顺序。

如果用户A给b用户同时发送了三条消息 aa bb cc，但是服务端接收到的顺序可能是 aa cc bb。就产生了发送方的顺序和接受方的顺序不一致的情况。

![image-20231114142419106](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231114142419106.png)

#### 客户端的时序性

我们可以让发送方发送消息的时候带上时间戳，服务存储a的消息时间戳，b展示的就是按照时间戳排序之后的消息。

![image-20231114142655224](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231114142655224.png)

但是此时如果是一个人多端登录，比如手机端、电脑端同时在线，并且同时发送了消息，那么此时的时间戳就已经失去了意义。我们可以采用在消息上加上自增ID的解决方案，一旦发现时间戳相同，那么就会使用自增id进行处理。![image-20231114142855931](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231114142855931.png)

但是对于群聊来说，客户端的时间很可能是不相同的，那么时间戳的意义其实也就不是很大。我们需要考虑其他策略。

#### 服务端的时序性

对于单表而言，我们可以直接采用主键ID 来进行排序，也可以通过消息的时间戳来进行排序。id肯定是严格自增了，时间戳要考虑经度问题。不过对于毫秒级别的时间戳经度，在业务上也是允许出现的。比如![image-20231114143817154](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231114143817154.png)

只需要保证444消息在111、222、333之后即可。

其实除了消息的顺序性，我们还需要考虑到消息的唯一性。就比如，一条消息只能拥有一个ID，因为我们的游标翻页需要使用到这个ID，![image-20231114143955017](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231114143955017.png)



综合而言，使用消息的主键id就是最好的情况。

#### 消息id

消息id被我们基于厚望，不仅要保证唯一，还要保证有序（递增）。

保证唯一其实是比较简单的，直接使用分布式id就可以实现。重点是如何保证消息的有序？

##### 全局递增

消息在整个IM系统中是唯一并且递增，一般的话对于单表直接使用主键id就可以保证单调递增。但是对于企业而言，免不了要使用分库分表，分库分表后端消息id，一般使用的是分布式id，但是分布式id是趋势递增，而并不是单调递增。

![image-20231114153230592](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231114153230592.png)

雪花id并不适用我们的IM系统。事实上，对于分布式系统，严格的单调递增，其实意味着严重的单点竞争问题。其实对于实现这个方案，是比较困难的。

#### 回话递增

我们需要这个单调递增的目的是什么呢？很明显是为了消息的顺序展示。那么对于一个会话而言，直接保证单个群组中的消息ID是有序并且唯一的即可。

如何保证回话ID是单调递增的？其实直接将每一个会话分成一张表即可。相同的会话都在一张表中，又重新回到了主键自增的ID。

#### 收信箱递增

收信箱递增，适用于写扩散的场景，所有人都有一个自己的收信箱，维护自己的时间线即可。

![image-20231114153817406](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231114153817406.png)

我们采用的是单表的id自增。

### 消息可靠ACK

IM消息主要分成两个场景：

1. 发送方发送消息给服务端，服务端入库成功之后返回ACK。
1. 服务端推送消息给接收方，接收方返回一个ACK。

#### 发送可靠

如何保证发送消息的可靠性？基本都是通过ACK来保证。有人会好奇，TCP三次握手中就有ACK的机制，为什么不能用呢？其实很明显，TCP是一个网络层的协议，业务层的ACK并不能依靠网络层来决定，

HTTP协议中，发送方和接收方的协议可以建立在TCP之上，通过收发数据包来进行请求和响应的关联。

而我们的项目中使用的就是HTTP协议来进行发送消息，通过返回的标识，判断是否发送成功即可。

如果发送方接收到的成功或者失败，可能是业务出错，提示用户消息发送失败即可。如果是超时的话，那么采用定时任务进行重新发送即可。

#### 推送可靠

推送可靠性一般是在服务端消息入库成功之后推送给接受方。需要保证消息可以达到消息的接收方。为了保证消息的可靠性，这些消息的ACK都是需要入库的，可以写到每个人的消息持久表持久化。接收到ACK后，修改状态。

![image-20231125231254544](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231125231254544.png)

**定时重试**：可靠性，基本离不开一个不断检查的重试节点。这个重试可能是后端，也可能是前端实现。如果信箱没有收到ACK。说明可以进行重试，重新推送。保证可靠的前提是信箱是持久化的。定时任务又是支持定时重试的。

![image-20231125232422934](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231125232422934.png)

> 问题：如果用户一直不在线，难道你的定时任务就一直拉取全部的消息吗？

我们加上一个在线推送，只给在线的人推送消息。并且我们将推送的消息保存在内存中，定时任务也只能拉取内存中的 ACK消息。进行推送重试。

**在线推送**：推送服务会加上一个判断，如果是在线的消息，才会进行推送，并且将消息记录在内存中。定时任务直接就从内存中拉取消息吗，推送重试。

![image-20231125233109745](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231125233109745.png)

这样的话，就解决了一直从数据库拉取重试的次数，减少了DB的压力。然后如果是接收到了ACK之后，内存队列就会移除对应的ack消息。因为我们的定时任务只会从这个内存队列中去拉取。如果内存队列中消息太多，可以采用lru方式，排除最早入队的消息。

![image-20231125234148099](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231125234148099.png)

其实这样的话，内存ack队列并不是可靠的，但只是为了加速我们可靠性推送的效率。最终还是有我们的收信箱做兜底方案。最后的保证，也就是我们的离线的推送。

**离线推送**

对于不在线的用户，我们可以确保要在下一次登录的时候通过push的方式提示消息到达。让他打开软件。

![image-20231125235237398](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231125235237398.png)

所有的复杂的操作都要在用户上线的时候进行推送，为ack的消息一股脑的全部推送给他。并且要拷贝一份到ack队列，确保可靠性。后面的流程其实查不了许多，定时任务继续，保证最终的一致性。**当然，一次性推送所有的消息，也可能会有瓶颈，对于一个很久没有上线的用户来说。**

![image-20231125235527595](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231125235527595.png)

这其实是一个完整的消息可靠性方案，做到了持久化，重试，就能达到最终一致性。

如果用户量一大，那么写扩散的场景会是十分复杂的，微信为了减少写扩散的场景，把群聊人数限制在了500人。

<span style="color:red">那么其实我们的项目中并没有做消息可靠性，一个方面是过于复杂，另一个方面是这是一个web项目，本身并不存储消息。像微信这样的客户端其实会将消息存储在本地，用户直接读取的是本地的消息，并没有服务器的压力。</span>

### 消息重复消费

#### 发送消息幂等性

消息发送的时候，如果遇到了网络波动，底层会帮忙自动重试。如何唯一的识别这条消息？靠的是发送端生成一个唯一的标识。如果重试的时候，相同的消息会携带相同的标识，保证幂等性。

一般保证1s内的去重保证即可。如果去重的范围太大了，涉及到的历史数据很多，发送端自动重试也要限制一下超过1s还没有成功的话就放弃重试。

#### 接收消息幂等性

接收消息的幂等实现，主要是通过消息的唯一ID保证，全局消息唯一的话，直接使用唯一ID就好了。

如果是会话级别的话，可以通过会话id + 消息id 唯一保证消息的幂等。

### 推拉结合

我们刚才讨论的消息的可靠性，其实都是后端主动推送给前端。实际上新消息的获取方案有很多。

#### 推模式

推模式，服务端主动推送给前端，需要使用到websocket，并且后台会维护一个定时任务，定时推送还没有接收到ack的接受，保证消息的实时性。

#### 拉模式

前端主动询问后端是否有新消息。以定时的任务频率访问。我们的项目用到了WebSocket。一般不用拉模式。拉模式可以用在历史消息列表。新消息，还是要保证消息的实时性。

缺点：拉模式需要主动请求数据，可能导致较高的延迟。

重复请求：如果消费者循环请求相同的数据，可能导致带宽的浪费和系统效率降低。

#### 推拉结合

正常情况下，保证消息的及时性，推模式就已经足够了，为什么还需要拉模式？推模式需要考虑到推送失败的场景，有需要服务端启动固定式任务，确保ACK，方案比较复杂，对服务器消耗也是很大。

采用推拉结合，主要是为了解决推送失败可以进行消息重试，**推保证了及时性，拉保证了最终一致性**。

![image-20231128103958952](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231128103958952.png)

1、推送消息到达，里面没有任何消息，仅仅是为了触发客户端的消息拉取动作，这个推是无状态的，也就可以任意调用。

2、客户端接收到新消息提醒，或者是定时任务到达指定时间，就会触发拉取的操作。

3、服务端携带了用户信箱的ACK消息，全部返回给客户端。达到返回增量数据的目的。

4、客户端接收到消息后，可以批量ACK，服务端收到ack，将信箱标记成已经ack。

假设有aa、bb两条消息，aa触发新消息提醒，由于网络异常丢失，bb消息入库时，进行消息通知，这时候a拉取新消息的时候，也能把aa拉到。

客户端在拉取消息的时候，需要指定的是uid和ack,我们拉取的是ack = false的。

为了能够快速拉取到消息，那么我们会将uid和ack组成一个联合索引。这样查询的时候会快得很。

### 单聊群聊

聊天的结构大概是这样的，有要发送给谁的uid，目标类型是单聊还是群聊，具体的消息内容，发送人uid。

![image-20231128133421768](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231128133421768.png)

那么其实我们用到了收信箱，需要存储我们接收的所有消息信息。

![image-20231128133623699](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231128133623699.png)

后续还有会话表需要关联这个目标类型和uid，那么对于这两个字段我们加上联合索引的话，其实在复用的时候也是会出现很多问题。没有办法将这两个字段做索引。

最终我们在单聊群聊的表中抽离出一张表：Room表（用来保存房间id和对应的房间类型关系）

![image-20231128134732221](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231128134732221.png)

整个表结构：

单聊、群聊表意义上可以说是Room表的扩展表，为了实现更好的复用，我们将Room表单独拎出来作为关系表解耦。

群聊的话需要有群聊天的名称和头像，还需要有群成员，

群成员表中最重要的是成员权限，成员角色属性：1 群主，2 管理员，3 普通成员。如果我们想要快速判断某一个人是群主，那么我们直接在群id和role做一个联合索引。

单聊表中我需要在添加好友完成之后，创建一个单聊的房间，后续好友可以在会话列表中找到这个房间，在好友列表中也是可以找到该好友对他发起聊天的，那么我们如何进行查找呢？最主要的是要对每一个单聊房间加上一个唯一的标识，既然我们的单聊框里只有两个人：uid1 和 uid2 ，那么我们就可以通过uid1 + uid2来进行作为房间的唯一标识，那么这个标识必须是唯一的，毕竟同一个房间，A登录之后uid是A，B登录之后uid是B，那么其实他们的uid并不一样，所以我们需要将这个uid进行排序之后将这个排序之后的uid和组合作为唯一标识。**uid1_uid2**,uid1是小的uid，uid2是大的uid。

### 消息的已读未读

为了模仿企业微信、钉钉的已读未读列表功能。我们决定在我们的项目也加上这个消息的已读未读功能。

#### 已读未读功能

主要是有几个主要元素，**多少人已读？多少人未读？已读未读列表**。

如何知道一个人是否已读？其实又是回到了ACK的问题。

![image-20231128145328652](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231128145328652.png)

1. 发送方发送一条消息，消息进入收信箱，此时都是未读状态
2. 通过推送服务将消息推送到用户会话中
3. 用户点击查看之后会携带一个ACK标识代表已经接收到消息，
4. 推送服务将收信箱中的A的消息标记成ACK。
5. ACK消息的需要同步推送给消息发送者。
6. 发消息的人可以看到具体的已读未读情况。

具体的SQL写法：

已读：select count(1) from 信箱 where msgId = xx and ack = true;

未读：select count(1) from 信箱 where msgId = xx and ack = false;

已读列表：select uid from 信箱 where msgId = xx and ack = true order by ack_time;

未读列表：select uid from 信箱 where msgId = xx and ack = false order by ack_time;

> 存在的问题：存在严重的写扩散问题，1万个人分别写1万次，其实就是1w * 1w。

那么其实这样做的做法是不完全合适的。

#### 收信箱的写扩散解决

上面的ACK会出现写扩散问题，那么我们将这个ACK存储的过程变成更新阅读时间字段，以后直接就将这个最新的阅读时间进行更新即可。

![image-20231128151305467](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231128151305467.png)

这样大大减少了写入的影响。

然后我们创建了contact表来作为用户信箱表。

![image-20231128151919827](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231128151919827.png)

我们知道消息的发送时间：

已读：select count(1) from 信箱 where room_id = xx and read_time > 消息时间;

未读：select count(1) from 信箱 where room_id = xx and read_time <= 消息时间；

已读列表：select uid from 信箱 where room_id = xx and read_time > 消息时间 order by create_time;

未读列表：select uid from 信箱 where room_id = xx and read_time <= 消息时间 order by create_time;

观察失sql语句，其实我们在room_id + read_time上做一个组合索引最好。

> 可以优化的点：由于我们的抹茶目前使用的是时间，但是我们项目的消息id是全局递增的，所以其实没有必要使用这个时间，使用消息id也是可以的。

#### 消息阅读推送

类似于钉钉的设计，发送完成每条信息，就能看到阅读数一直上涨。只要是有人阅读过，数量就加一。看起来是实时的。怎么设计呢？

最暴力的做法，每一次阅读完成之后就主动推送到后端，做一个阅读数 + 1。

最终采用的是前端起一个定时器，前端在定时任务到了之后主动去后端请求接口。在一个屏幕中请求发送的消息。

### 会话列表设计

会话表其实就是用户优化过后的收信箱，会话表记录的是某一个会话中的消息详情。比如最近一条消息的发送时间，读到的消息的时间等。

会话列表：需要根据会话表的active_time实现排序功能，以此来获取到会话列表。

```sql
select room_id from contact where uid = xx order by active_time;
```

会话的消息未读显示：根据read_time来将消息的未读进行显示。

```sql
select count(0) from msg where room_id = xx and create_time >= read_time
```

> 优化：如果我很久没有上线了，那么我们需要显示几十万条消息吗？很明显不需要，我们只需要显示99就可以。

### 热点群聊（写扩散问题）





















 













# 联系人模块

## 联系人表设计

其中包含两张表：

![image-20231116173004474](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231116173004474.png)

其中一张是 用户与好友的表，另一张是用户申请表。











## 游标翻页













## 前后端资源的懒加载











## 批量缓存框架

### 旁路缓存

我们通常用的是旁路缓存，

![image-20231122220854331](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231122220854331.png)

获取不到就从数据库中读取，传统的Spring Cache就是这样的框架。

```java
@Cacheable(cacheNames = "item", key = "'item:' + #itemId")
public ItemConfig getById() {
    return itemConfigDao.getById(itemId);
}
```

这种缓存框架虽说很好用呢，但是在极端情况下。我需要获取一批用户的信息。碰巧所有的用户缓存都失效了，就需要全部重新从数据库加载。那这跟没有缓存有什么区别呢？对于批量数据的重新查询是十分不友好的。

### 批量缓存

对于这种批量查询缓存的需求，传统的旁路缓存框架无法达到我们的需求。我们需要让他能够批量的get or load。

![image-20231122222754941](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231122222754941.png)

这样我们可以根据缓存中进行批量的查询、删除和设置。

我们可以通过RedisUtils.mget()来得到缓存中的批量数据。同样我们也可以根据mybatis-plus进行批量查询。即使一个列表中只有部分需要查库，那么也可以通过这个框架进行处理。这样的话redis和数据库的交互只有一次。

```java
public Map<Long, User> getUserInfoBatch(Set<Long> uids) {
    //批量组装key
    List<String> keys = uids.stream().map(a -> RedisKey.getKey(RedisKey.USER_INFO_STRING,a)).collect(Collectors.toList());
    //批量get
    List<User> mget = RedisUtils.mget(keys, User.class);
    Map<Long, User> map = mget.stream().filter(Objects::nonNull).collect(Collectors.toMap(User::getId, Function.identity()));
    //发现差集——还需要load更新的uid
    List<Long> needLoadUidList = uids.stream().filter(a ->!map.containsKey(a)).collect(Collectors.toList());
    if (CollUtil.isNotEmpty(needLoadUidList)) {
        //批量load
        List<User> needLoadUserList = userDao.listByIds(needLoadUidList);
        Map<String, User> redisMap = needLoadUserList.stream().collect(Collectors.toMap(a -> RedisKey.getKey(RedisKey.USER_INFO_STRING, a.getId()), Function.identity()));
        RedisUtils.mset(redisMap, 5 * 60);
        //加载回redis
        map.putAll(needLoadUserList.stream().collect(Collectors.toMap(User::getId, Function.identity())));
    }
    return map;
}
```

其实我们可以发现其中有很多的步骤已经是多余的了。那么我们可以根据这些公共的部分抽象出一层框架的。

#### 批量缓存框架

我们定义好缓存的接口：

```java
public interface BatchCache<IN, OUT> {
    /**
    * 获取单个
    */
    OUT get(IN req);
    /**
    * 获取批量
    */
    Map<IN, OUT> getBatch(List<IN> req);
    /**
    * 删除单个
    */
    void delete(IN req);
    /**
    * 删除批量
    */
    void deleteBatch(List<IN> req);
}
```

抽象类，定义骨架

```java
public abstract class AbstractRedisStringCache<IN, OUT> implements BatchCache<IN, OUT> {

    private Class<OUT> outClass;

    protected AbstractRedisStringCache() {
        ParameterizedType genericSuperclass = (ParameterizedType) this.getClass().getGenericSuperclass();
        this.outClass = (Class<OUT>) genericSuperclass.getActualTypeArguments()[1];
    }

    protected abstract String getKey(IN req);

    protected abstract Long getExpireSeconds();

    protected abstract Map<IN, OUT> load(List<IN> req);

    @Override
    public OUT get(IN req) {
        return getBatch(Collections.singletonList(req)).get(req);
    }

    @Override
    public Map<IN, OUT> getBatch(List<IN> req) {
        if (CollectionUtil.isEmpty(req)) {//防御性编程
            return new HashMap<>();
        }
        //去重
        req = req.stream().distinct().collect(Collectors.toList());
        //组装key
        List<String> keys = req.stream().map(this::getKey).collect(Collectors.toList());
        //批量get
        List<OUT> valueList = RedisUtils.mget(keys, outClass);
        //差集计算
        List<IN> loadReqs = new ArrayList<>();
        for (int i = 0; i < valueList.size(); i++) {
            if (Objects.isNull(valueList.get(i))) {
                loadReqs.add(req.get(i));
            }
        }
        Map<IN, OUT> load = new HashMap<>();
        //不足的重新加载进redis
        if (CollectionUtil.isNotEmpty(loadReqs)) {
            //批量load
            load = load(loadReqs);
            Map<String, OUT> loadMap = load.entrySet().stream()
                    .map(a -> Pair.of(getKey(a.getKey()), a.getValue()))
                    .collect(Collectors.toMap(Pair::getFirst, Pair::getSecond));
            RedisUtils.mset(loadMap, getExpireSeconds());
        }

        //组装最后的结果
        Map<IN, OUT> resultMap = new HashMap<>();
        for (int i = 0; i < req.size(); i++) {
            IN in = req.get(i);
            OUT out = Optional.ofNullable(valueList.get(i))
                    .orElse(load.get(in));
            resultMap.put(in, out);
        }
        return resultMap;
    }

    @Override
    public void delete(IN req) {
        deleteBatch(Collections.singletonList(req));
    }

    @Override
    public void deleteBatch(List<IN> req) {
        List<String> keys = req.stream().map(this::getKey).collect(Collectors.toList());
        RedisUtils.del(keys);
    }
}

```

我给后面实现的子类提供了三个抽象方法：getKey()、getExpireSeconds()、load()。

后续实现的子类就会非常省时间：

```java
@Component
public class UserSummaryCache extends AbstractRedisStringCache<Long, SummaryInfoDto> {

    @Autowired
    private UserInfoCache userInfoCache;

    @Autowired
    private ItemCache itemCache;
    @Autowired
    private UserBackpackDao userBackpackDao;

    @Override
    protected String getKey(Long uid) {
        return RedisKey.getKey(RedisKey.USER_SUMMARY_STRING, uid);
    }

    @Override
    protected Long getExpireSeconds() {
        return 10 * 60L;
    }

    @Override
    protected Map<Long, SummaryInfoDto> load(List<Long> uidList) {
        // 用户的个人信息
        Map<Long, User> userMap = userInfoCache.getBatch(uidList);
        // 徽章处理
        List<ItemConfig> itemConfigList = itemCache.getByType(ItemTypeEnum.BADGE.getType());
        List<Long> itemIds = itemConfigList.stream().map(ItemConfig::getId).collect(Collectors.toList());
        List<UserBackpack> userBackpacks = userBackpackDao.getByItemIds(uidList, itemIds);
        // 拿到用户和用户对应的背包map集合
        Map<Long, List<UserBackpack>> userBadgeMap = userBackpacks.stream().collect(Collectors.groupingBy(UserBackpack::getUid));
        Map<Long, SummaryInfoDto> result = uidList.stream().map(uid -> {
                    SummaryInfoDto dto = new SummaryInfoDto();
                    User user = userMap.get(uid);
                    if (Objects.isNull(user)) {
                        return null;
                    }
                    // 根据当前用户拿到用户的背包
                    List<UserBackpack> backpacks = userBadgeMap.getOrDefault(user.getId(), new ArrayList<>());
                    dto.setUid(user.getId());
                    dto.setName(user.getName());
                    dto.setAvatar(user.getAvatar());
                    dto.setWearingItemId(user.getItemId());
                    dto.setLocPlace(Optional.ofNullable(user.getIpInfo()).map(IpInfo::getUpdateIpDetail).map(IpDetail::getCity).orElse(null));
                    dto.setItemList(backpacks.stream().map(UserBackpack::getItemId).collect(Collectors.toList()));
                    return dto;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(SummaryInfoDto::getUid, Function.identity()));
        return result;
    }
}
```

#### 总结：

通过这个缓存框架的研究，我们了解了传统的旁路缓存的不足之处。由此引出了我们的批量框架。通过剖析缓存加载的流程，我们发现固定的套路，以及变化的位置，由此搭建了换存的骨架。其实这个也是一个**模版方法模式**的设计模式。将公共的部分拆分出来，让子类的功能更加聚集。

# 消息模块

## 消息模块的保存





## 本地消息表的搭建











## URL高亮显示内容解析与实现方案

我们了解有一些网页在你输入网站名之后，会将内容显示出来。比如![image-20231225090800770](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231225090800770.png)

其中会出现力扣的官网平台链接，其实就是一个可点击的url信息，只不过是将这个url的内容展示出来了。

### 调研

URL解析其实很简单，一般就是正则匹配就可以了，URL的标题想要得到其实也是很简单，直接模拟请求访问即可，然后得到title。

### 方案选型

我们要考虑的是什么时间去解析这个url，其实正则表达式匹配的耗费时间不是很长，时间长的是对这个网站的访问接收结果。

有三种方式来进行：

1. 发送消息，入库前进行解析。
2. 用户访问消息列表的时候，在后端对消息进行解析。
3. 让每一个访问消息的人进行自己解析，前端解析。

很明显第二条不现实，用户量一大，直接瘫痪了。第三条也是不太现实，如果所有用户对一条消息访问，我们的系统或许可以承受得住，但是毕竟我们需要去访问别人的网站，对别人的网站压力也很很大，所以我们就委屈一下发送者，在消息发送的时候就进行URL解析。

那么我们是否需要异步进行呢？答案是否定的，因为消息发送者自己也需要看到自己的消息被解析，所以还是同步进行。

### 技术实现

在技术实现之前，我们需要先进行最小粒度的验证，先验证我们是否可以识别url和标题解析，

```java
    /**
     * 解析URL
     */
    @Test
    public void url() {
        String content = "这是一个很长的字符串再来 www.github.com，其中包含一个URL www.baidu.com,, 一个带有端口号的URL http://www.jd.com:80, 一个带有路径的URL http://mallchat.cn, 还有美团技术文章https://mp.weixin.qq.com/s/hwTf4bDck9_tlFpgVDeIKg";
        Pattern pattern = Pattern.compile("((http|https)://)?(www.)?([\\w_-]+(?:(?:\\.[\\w_-]+)+))([\\w.,@?^=%&:/~+#-]*[\\w@?^=%&/~+#-])?");
        List<String> matchList = ReUtil.findAll(pattern, content, 0);//hutool工具类
        System.out.println(matchList);
    }
```

结果：![image-20231225145808934](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231225145808934.png)

说明可以识别到文本中的URL网址。

**尝试获取我们的 标题（title）**

```xml
<dependency>
    <groupId>org.jsoup</groupId>
    <artifactId>jsoup</artifactId>
    <version>1.15.3</version>
</dependency>
```

```java
    @Test
    public void jsoupTest() throws Exception {
        Connection connect = Jsoup.connect("http://www.baidu.com");
        Document document = connect.get();
        String title = document.title();
        System.out.println(title);
    }
```

结果：![image-20231225150106673](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231225150106673.png)

结果也是可以访问的到的。但是经过我们对各大博客、网站等的调查，发现其实有很多网站并没有直接使用title来表示标签，其中就包含我们的微信公众号文章。

像这种微信公众号文章的网页，其实就是对title进行了封装：

![image-20231225150654106](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231225150654106.png)

其中这个标题其实就是在<meta property="og:title" content="***************">中。

```java
    @Test
    public void wxJsoupTest() throws Exception {
        Connection connect = Jsoup.connect("https://mp.weixin.qq.com/s/Lj1mGcTcrQ-ZTAKftEkNow");
        Document document = connect.get();
        String title = document.getElementsByAttributeValue("property", "og:title").attr("content");
        System.out.println(title);
    }
```

结果：![image-20231225150500485](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231225150500485.png)

结果也是正确的。

**稍做总结**

不同的页面，标题在不同的标签内，需要不同的解析方式，我们其实也不知道会有哪些网站的哪一些不同的标签，我们只能打一个日志，然后再慢慢的添加更多的解析方式。

我们把标签的 解析方式做成一个解析器，每个解析器穿成一个链条，通用的解析器优先级更高，链条中直到解析出标题就返回。

解析器穿起的链条就是责任链模式，创建责任链的地方就是工厂模式，不同的类实现不同的url解析方法，这个就是策略模式。

![image-20231226095547634](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231226095547634.png)

### 实现

我们的URL解析出来的实体类：UrlInfo.java

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UrlInfo implements Serializable {

    public static final long serialVersionUID = 1L;

    /**
     * 标题
     */
    String title;

    /**
     * 描述
     */
    String description;

    /**
     * 网站LOGO
     */
    String image;
}
```

url解析接口：UrlDiscover.java

最主要的方法是getUrlContentMap，可以将title、description、image封装起来。

```java
public interface UrlDiscover {

    @Nullable
    Map<String, UrlInfo> getUrlContentMap(String content);

    @Nullable
    UrlInfo getContent(String url);

    @Nullable
    String getTitle(Document document);

    @Nullable
    String getDescription(Document document);

    @Nullable
    String getImage(String url, Document document);
}
```

模版抽象类：AbstractUrlDiscover.java。

这个模版类是提供给消息发送方在发送消息的时候提供的方法模版的。

```java
@Slf4j
public abstract class AbstractUrlDiscover implements UrlDiscover {
    public static final Pattern PATTERN = Pattern.compile("((http|https)://)?(www.)?([\\w_-]+(?:(?:\\.[\\w_-]+)+))([\\w.,@?^=%&:/~+#-]*[\\w@?^=%&/~+#-])?");

    @Nullable
    @Override
    public Map<String, UrlInfo> getUrlContentMap(String content) {
        if (StrUtil.isBlank(content)) {
            return new HashMap<>();
        }
        List<String> matchList = ReUtil.findAll(PATTERN, content, 0);

        // 如果用户发送的消息中存在许多网址需要解析，那么我们需要并行解析
        List<CompletableFuture<Pair<String, UrlInfo>>> matchUrlInfoList = matchList.stream().map(match -> CompletableFuture.supplyAsync(() -> {
            UrlInfo urlInfo = getContent(match);
            return Objects.isNull(urlInfo) ? null : Pair.of(match, urlInfo);
        })).collect(Collectors.toList());

        // 使用美团提供的一个可以将List类型的completableFuture转换成CompletableFuture类型的List
        CompletableFuture<List<Pair<String, UrlInfo>>> future = FutureUtils.sequenceNonNull(matchUrlInfoList);

        // 组装结果，得到url 和 urlInfo，如果相同就返回url
        return future.join().stream().collect(Collectors.toMap(Pair::getFirst, Pair::getSecond, (a,b) -> a));
    }

    @Override
    public UrlInfo getContent(String url) {
        Document document = getUrlDocument(assemble(url));
        if (Objects.isNull(document)) {
            return null;
        }
        return UrlInfo.builder()
                .title(getTitle(document))
                .description(getDescription(document))
                .image(getImage(assemble(url), document))
                .build();
    }

    private Document getUrlDocument(String matchUrl) {
        try {
            Connection connect = Jsoup.connect(matchUrl);
            connect.timeout(2000);
            return connect.get();
        } catch (IOException e) {
            log.error("find error:url:{}", matchUrl);
        }
        return null;
    }

    // 添加HTTP前缀或者是https前缀
    private String assemble(String url) {
        if (!StrUtil.startWith(url, "http")) {
            return "http://" + url;
        }
        return url;
    }

    /**
     * 判断链接是否有效
     *
     * @param href
     * @return
     */
    public static boolean isConnect(String href) {
        // 请求地址
        URL url;
        // 状态码
        int state;
        //下载的连接类型
        String fileType;
        try {
            url = new URL(href);
            HttpURLConnection httpURLConnection = (HttpURLConnection) url.openConnection();
            state = httpURLConnection.getResponseCode();
            fileType = httpURLConnection.getHeaderField("Content-Disposition");
            if ((state == 200 || state == 302 || state == 304) && fileType == null) {
                return true;
            }
        } catch (Exception e) {
            return false;
        }
        return false;
    }
}
```

责任链提供者、工厂类：PrioritizedUrlDiscover.java

```java
public class PrioritizedUrlDiscover extends AbstractUrlDiscover{
    // 现在因为有类似于天百度的那种 和 微信的公众号的网站，所以我们先设计成两个
    private final List<UrlDiscover> urlDiscoverList = new ArrayList<>(2);

    public PrioritizedUrlDiscover() {
        urlDiscoverList.add(new CommonUrlDiscover());
        urlDiscoverList.add(new WxUrlDiscover());
    }

    @Nullable
    @Override
    public String getTitle(Document document) {
        for (UrlDiscover urlDiscover : urlDiscoverList) {
            String urlTitle = urlDiscover.getTitle(document);
            if (StrUtil.isNotBlank(urlTitle)){
                return urlTitle;
            }
        }
        return null;
    }

    @Override
    public String getDescription(Document document) {
        for (UrlDiscover urlDiscover : urlDiscoverList) {
            String description = urlDiscover.getDescription(document);
            if (StrUtil.isNotBlank(description)){
                return description;
            }
        }
        return null;
    }

    @Override
    public String getImage(String url, Document document) {
        for (UrlDiscover urlDiscover : urlDiscoverList) {
            String image = urlDiscover.getImage(url, document);
            if (StrUtil.isNotBlank(image)) {
                return image;
            }
        }
        return null;
    }
}
```

平常的URL解析器：CommonUrlDiscover.java

```java
public class CommonUrlDiscover extends AbstractUrlDiscover{
    /**
     * 得到网站的title
     * @param document
     * @return
     */
    @Nullable
    @Override
    public String getTitle(Document document) {
        return document.title();
    }

    /**
     * 得到描述
     * @param document
     * @return
     */
    @Override
    public String getDescription(Document document) {
        String description = document.head().select("meta[name=description]").attr("content");
        String keyWords  =document.head().select("meta[name=keywords]").attr("content");
        String content = StrUtil.isNotBlank(description) ? description : keyWords;
        if (content.contains("。")) {
            return StringUtils.isNotBlank(content) ? content.substring(0, content.indexOf("。")) : content;
        }
        return content.substring(0, 30);
    }

    @Override
    public String getImage(String url, Document document) {
        String image = document.select("link[type=image/x-icon]").attr("href");
        // 如果没有的话,我们去匹配icon的属性的logo
        String href = StrUtil.isEmpty(image) ? document.select("link[rel$=icon]").attr("href") : image;
        if(StrUtil.containsAny(url, "favicon")){
            return href;
        }
        if (isConnect(!StrUtil.startWith(href, "http") ? "http:" + href : href)) {
            return href;
        }
        return StrUtil.format("{}/{}", url, StrUtil.removePrefix(href, "/"));
    }
}
```

微信的公众号需要的url解析器

```java
public class WxUrlDiscover extends AbstractUrlDiscover{
    public static final String key = "properties";
    public static final String content = "properties";
    @Override
    public String getTitle(Document document) {
        return document.getElementsByAttributeValue(key, "og:title").attr(content);
    }

    @Override
    public String getDescription(Document document) {
        return document.getElementsByAttributeValue(key, "og:description").attr(content);
    }

    @Override
    public String getImage(String url, Document document) {
        String href = document.getElementsByAttributeValue(key, "og:image").attr(content);
        return StrUtil.isNotBlank(href) ? href : null;
    }
}

```

**我们需要考虑到一种情况，就是一个人发的一条消息中其实很可能存在多个URL，那么我们就需要对这个消息进行多条URL解析，在解析的时候需要考虑到并行解析**

代码：

```java
// 如果用户发送的消息中存在许多网址需要解析，那么我们需要并行解析
        List<CompletableFuture<Pair<String, UrlInfo>>> matchUrlInfoList = matchList.stream().map(match -> CompletableFuture.supplyAsync(() -> {
            UrlInfo urlInfo = getContent(match);
            return Objects.isNull(urlInfo) ? null : Pair.of(match, urlInfo);
        })).collect(Collectors.toList());

        // 使用美团提供的一个可以将List类型的completableFuture转换成CompletableFuture类型的List
        CompletableFuture<List<Pair<String, UrlInfo>>> future = FutureUtils.sequenceNonNull(matchUrlInfoList);
```

因为我们是需要得到返回结果的，所以我们不能使用传统的Runable的线程方式，我们决定采用Future的扩展类CompletableFuture来实现，具体的优势是可以相较于Future具有编排能力，比如一堆Task任务，我们可以决定执行哪一些之后执行另一些。具体的见知识补充，同时又因为我们的CompletableFuture是一个List集合，但是我们想要得到一个Future对象，那么正好看过一篇美团的技术博文，我们将美团的博文内容拿过来。

```java
@Slf4j
public class FutureUtils {
    /**
     * 设置CF状态为失败
     */
    public static <T> CompletableFuture<T> failed(Throwable ex) {
        CompletableFuture<T> completableFuture = new CompletableFuture<>();
        completableFuture.completeExceptionally(ex);
        return completableFuture;
    }

    /**
     * 设置CF状态为成功
     */
    public static <T> CompletableFuture<T> success(T result) {
        CompletableFuture<T> completableFuture = new CompletableFuture<>();
        completableFuture.complete(result);
        return completableFuture;
    }

    /**
     * 将List<CompletableFuture<T>> 转为 CompletableFuture<List<T>>
     */
    public static <T> CompletableFuture<List<T>> sequence(Collection<CompletableFuture<T>> completableFutures) {
        return CompletableFuture.allOf(completableFutures.toArray(new CompletableFuture<?>[0]))
                .thenApply(v -> completableFutures.stream()
                        .map(CompletableFuture::join)
                        .collect(Collectors.toList())
                );
    }

    /**
     * 将List<CompletableFuture<List<T>>> 转为 CompletableFuture<List<T>>
     * 多用于分页查询的场景
     */
    public static <T> CompletableFuture<List<T>> sequenceList(Collection<CompletableFuture<List<T>>> completableFutures) {
        return CompletableFuture.allOf(completableFutures.toArray(new CompletableFuture<?>[0]))
                .thenApply(v -> completableFutures.stream()
                        .flatMap(listFuture -> listFuture.join().stream())
                        .collect(Collectors.toList())
                );
    }

    /*
     * 将List<CompletableFuture<Map<K, V>>> 转为 CompletableFuture<Map<K, V>>
     * @Param mergeFunction 自定义key冲突时的merge策略
     */
    public static <K, V> CompletableFuture<Map<K, V>> sequenceMap(
            Collection<CompletableFuture<Map<K, V>>> completableFutures, BinaryOperator<V> mergeFunction) {
        return CompletableFuture
                .allOf(completableFutures.toArray(new CompletableFuture<?>[0]))
                .thenApply(v -> completableFutures.stream().map(CompletableFuture::join)
                        .flatMap(map -> map.entrySet().stream())
                        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, mergeFunction)));
    }

    /**
     * 将List<CompletableFuture<T>> 转为 CompletableFuture<List<T>>，并过滤调null值
     */
    public static <T> CompletableFuture<List<T>> sequenceNonNull(Collection<CompletableFuture<T>> completableFutures) {
        return CompletableFuture.allOf(completableFutures.toArray(new CompletableFuture<?>[0]))
                .thenApply(v -> completableFutures.stream()
                        .map(CompletableFuture::join)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList())
                );
    }

    /**
     * 将List<CompletableFuture<List<T>>> 转为 CompletableFuture<List<T>>，并过滤调null值
     * 多用于分页查询的场景
     */
    public static <T> CompletableFuture<List<T>> sequenceListNonNull(Collection<CompletableFuture<List<T>>> completableFutures) {
        return CompletableFuture.allOf(completableFutures.toArray(new CompletableFuture<?>[0]))
                .thenApply(v -> completableFutures.stream()
                        .flatMap(listFuture -> listFuture.join().stream().filter(Objects::nonNull))
                        .collect(Collectors.toList())
                );
    }

    /**
     * 将List<CompletableFuture<Map<K, V>>> 转为 CompletableFuture<Map<K, V>>
     *
     * @Param filterFunction 自定义过滤策略
     */
    public static <T> CompletableFuture<List<T>> sequence(Collection<CompletableFuture<T>> completableFutures,
                                                          Predicate<? super T> filterFunction) {
        return CompletableFuture.allOf(completableFutures.toArray(new CompletableFuture<?>[0]))
                .thenApply(v -> completableFutures.stream()
                        .map(CompletableFuture::join)
                        .filter(filterFunction)
                        .collect(Collectors.toList())
                );
    }

    /**
     * 将List<CompletableFuture<List<T>>> 转为 CompletableFuture<List<T>>
     *
     * @Param filterFunction 自定义过滤策略
     */
    public static <T> CompletableFuture<List<T>> sequenceList(Collection<CompletableFuture<List<T>>> completableFutures,
                                                              Predicate<? super T> filterFunction) {
        return CompletableFuture.allOf(completableFutures.toArray(new CompletableFuture<?>[0]))
                .thenApply(v -> completableFutures.stream()
                        .flatMap(listFuture -> listFuture.join().stream().filter(filterFunction))
                        .collect(Collectors.toList())
                );
    }

    /**
     * 将CompletableFuture<Map<K,V>>的list转为 CompletableFuture<Map<K,V>>。 多个map合并为一个map。 如果key冲突，采用新的value覆盖。
     */
    public static <K, V> CompletableFuture<Map<K, V>> sequenceMap(
            Collection<CompletableFuture<Map<K, V>>> completableFutures) {
        return CompletableFuture
                .allOf(completableFutures.toArray(new CompletableFuture<?>[0]))
                .thenApply(v -> completableFutures.stream().map(CompletableFuture::join)
                        .flatMap(map -> map.entrySet().stream())
                        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> b)));
    }
}
```

我们上文讨论过URL解析的过程发生在消息的发送过程中，所以在消息发送的过程中需要加上

```java
public static final PrioritizedUrlDiscover URL_TITLE_DISCOVER = new PrioritizedUrlDiscover();        

Map<String, UrlInfo> urlContentMap = URL_TITLE_DISCOVER.getUrlContentMap(body.getContent());
extra.setUrlContentMap(urlContentMap);
```

效果：

![image-20231226104408052](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231226104408052.png)

## 用户表情包模块

### 调研

我们借鉴了类似于微信、QQ、小飞机等主流的聊天工具，其实都是有表情包这一功能的，毕竟这是用于校园表白墙的一个项目，年轻有活力的同学们肯定会想要保存一些可爱又有趣的表情包促进情感的表达。我们决定要加上这一个功能。

这是我们微信的表情包。

![image-20231226140111835](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231226140111835.png)

其中是有可以进行表情包添加、表情包删除、表情包展示的功能。其实这个功能可以扩展成一个模块的，该有的增删改查一个不缺。

### 方案选型

**存储占用**

表情包最大的特点就是他的传播性，很可能一张表情包的年代比发表情包的人的年级都大。。。如果说对于这个表情包，用户每发一张都向Minio中保存的话，那么对于服务器的存储压力是很大的。所以我们决定将相同的表情包指向同一个地址。也就是同一张表情包只有一个存储地址。

**带宽占用**

一个10MB的图片上传到服务器，如果市面上比较流通，对于我们的应用来说，其实占用的带宽流量是很大的，所以我们会强制将照片进行压缩，这也是电子包浆产生的原因。由前端将图片进行压缩。

**保存表情包的时间点**

对于微信表情包而言，保存的时期有两个，一个是自己添加，另一个是将表情包添加。我们打算再加上一个，如果是一张图片的话，我们可以选择将这个图片保存为表情包。总共是3个保存，其实都是同一个保存接口。

**过期时间**

表情包不同于图片，表情包是高度流通的，如果时间长了，我们可以将这个表情包进行删除。

### 实现

表情包接口：UserEmojiController.java

```java
@RestController
@RequestMapping("/capi/user/emoji")
@Api(tags = "表情包接口")
public class UserEmojiController {
    @Autowired
    private UserEmojiService userEmojiService;

    @GetMapping("/list")
    @ApiOperation("表情包列表")
    public ApiResult<List<UserEmojiResp>> getEmojiPage() {
        return ApiResult.success(userEmojiService.list(RequestHolder.get().getUid()));
    }

    @PostMapping()
    @ApiOperation("新增表情包")
    public ApiResult<IdRespVO> insertEmojis(@Valid @RequestBody UserEmojiReq req) {
        return userEmojiService.insert(req, RequestHolder.get().getUid());
    }

    @DeleteMapping()
    @ApiOperation("删除表情包")
    public ApiResult<Void> removeEmojis(@Valid @RequestBody IdReqVO vo) {
        return userEmojiService.removeEmojis(vo.getId(), RequestHolder.get().getUid());
    }
}

```

实现类:

```java
@Service
@Slf4j
public class UserEmojiServiceImpl implements UserEmojiService {

    @Autowired
    private UserEmojiDao userEmojiDao;

    @Override
    public List<UserEmojiResp> list(Long uid) {
        return userEmojiDao.listByUid(uid)
                .stream()
                .map(a -> UserEmojiResp.builder()
                        .id(a.getId())
                        .expressionUrl(a.getExpressionUrl())
                        .build())
                .collect(Collectors.toList());
    }

    @RedissonLock(key = "#uid")
    @Override
    public ApiResult<IdRespVO> insert(UserEmojiReq req, Long uid) {
        // 一个人只能保存最多30个表情包
        int count = userEmojiDao.countByUid(uid);
        AssertUtil.isFalse(count > 30, "表情包已达上限了");
        // 校验表情包是否存在
        Integer existCount = userEmojiDao.existCount(uid, req.getExpressionUrl());
        AssertUtil.isFalse(existCount > 0, "已经存在表情包了");
        UserEmoji emoji = UserEmoji.builder().uid(uid).expressionUrl(req.getExpressionUrl()).build();
        userEmojiDao.save(emoji);
        return ApiResult.success(IdRespVO.builder().id(emoji.getId()).build());
    }

    @Override
    public ApiResult<Void> removeEmojis(Long id, Long uid) {
        UserEmoji emoji = userEmojiDao.getById(id);
        AssertUtil.isNotEmpty(emoji, "表情包不能为空");
        AssertUtil.equal(emoji.getUid(), uid, "不能删除别人的表情包");
        userEmojiDao.removeById(id);
        return ApiResult.success();
    }
}
```



# 群聊模块











# 会话模块

## 1、会话列表

































# 项目部署上线

Java后台运行命令:

```shell
nohup java -jar /data/java/mallchat-chat-server-1.0-SNAPSHOT.jar > /dev/null2>&1 &
```

写一个自动运行jar包的shell脚本

```shell
APP_NAME=mallchat-chat-server
# jar包路径
JAR_PATH='/data/java'
# jar包名称
JAR_NAME=mallchat-chat-server-1.0-SNAPSHOT.jar
# 日志路径
LOG_PATH='/data/logs'
# PID文件
PID=$JAR_NAME\.pid
# 使用说明，用来提示输入参数
usage(){
	echo "Usage: sh 执行脚本.sh [start|stop|restart|status]"
	exit 1
}
# 检查程序是否在运行
is_exists(){
	pid=`ps -ef|grep $JAR_NAME|grep -v grep|awk '{print $2}' `
	# 如果不存在返回1 ，存在返回0
	if [ -z "${pid}" ]; then
		return 1
	else
		return 0
	fi
}
# 启动方法
start(){
	is_exists
	if [ $? -eq "0" ]; then
		echo ">>> $APP_NAME is already running PID=${pid} <<<"
	else
		nohup java -jar $JAR_PATH/$JAR_NAME > /dev/null2>&1 &
		echo $! > $PID
		echo ">>> start $APP_NAME successed PID=$! <<<"
	fi
}
# 停止方法
stop(){
	pidf=$(cat $PID)
	echo ">>> PID = $pidf begin kill $pidf <<<"
	kill $pidf
	rm -rf $PID
	sleep 2
	is_exists
	if [ $? -eq "0" ]; then
		echo ">>> PID = $pidf begin kill -9 $pid <<<"
		kill -9 $pid
		sleep 2
		echo ">>> $APP_NAME process stopped <<<"
	else
		echo ">>> $APP_NAME is not running <<<"
	fi
}
# 输出运行状态
status(){
	is_exists
	if [ $? -eq "0" ]; then
		echo ">>> $APP_NAME is running PID is ${pid} <<<"
	else 
		echo ">>> $APP_NAME is not running <<<"
	fi
}
# 重启restart
restart(){
	stop
	start
}
# 根据输入参数执行相应的方法
case "$1" in
	"start")
		start
		;;
	"stop")
		stop
		;;
	"status")
		status
		;;
	"restart")
		restart
		;;
	*)
		usage
		;;	
esac
exit 0
```

需要注意我们使用的是Windows回车空格处理方式，但是我们的项目是运行在centosLinux上的 ，所以我们需要将整个文件进行格式化，执行：(默认已经安装好dos2unix，如果没有安装的话，使用 **yum install dos2unix**安装 )

```shell
dos2unix mallchat-chat-server.sh
```











# 知识补充

### 1、 Optional类

是一个容器类，代表着一个值存在或者不存在，原本是使用null来表示对象的存在状态，现在使用Optional可以更好的表达这个概念。并且可以避免空指针异常。

常用方法：

- Optional.of()：创建一个Optional实例。
- Optional.empty()：创建一个空的Optional实例
- Optional.ofNullable(T t)：如果t不为空，创建Optional实例，否则创建空实例
- isPresent()：判断是否包含null值
- orElse(T t)：如果调用对象包含值，返回该值，否则返回s获取的值
- orElseGet(Supplier s)：如果调用对象包含值，那么返回该值，否则返回s中获取的值
- map(Function f)：如果有值就对其进行处理，并返回处理后的Optional，否则返回Optional.empty()；
- flatMap(Function mapper)：与map类似，要求返回值必须是Optional。

### 2、微信开发者平台

https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Access_Overview.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5%EF%BC%9A%E9%AA%8C%E8%AF%81%E6%B6%88%E6%81%AF%E7%9A%84%E7%A1%AE%E6%9D%A5%E8%87%AA%E5%BE%AE%E4%BF%A1%E6%9C%8D%E5%8A%A1%E5%99%A8。

### 3、微信扫描带参二维码参数





### 4、Redis中的LUA脚本

主要命令：

- EVAL
- EVALSHA
- SCRIPT LOAD - SCRIPT EXISTS
- SCRIPT FLUSH
- SCRIPT KILL

#### 4.1  EVAL

命令格式：EVAL script numkeys key [key1 ...] arg [arg ...]。

```shell
eval "return KEYS[1]" 1 key1
"key1"

eval "return ARGV[1]" 0 value1
"value1"
-- 这个地方的ARGV[]和KEYS[]意义相似但不同，KEYS[]指的是Redis的键，ARGV[]指的是全局的附加属性，可以通过ARGV[]数组进行访问

eval "return {KEYS[1], KEYS[2], ARGV[1], ARGV[2]}" 2 key1 key2 first second
"key1"
"key2"
"first"
"second"

eval "redis.call('set', KEYS[1], ARGV[1]);redis.call('expire', keys[1], ARGV[2]); return 1;" 1 userAge 10 60

get userAge
"10"
ttl userAge
"45"
```

我们可以通过redis.call()来调用我们的redis命令。

### 5 Mysql的芝士

我们出错的SQL函数

```sql
insert into contact(`room_id`, `uid`, `last_msg_id`,`active_time`) 
values(2, 20008, 32, '2023-12-01 16:34:49.541'),(2, 20008, 32, '2023-12-01 16:34:49.541') ON DUPLICATE KEY 
update `last_msg_id`=values(32), `active_time`=values('2023-12-01 16:34:49.541');
```

> 注意：values()函数要添加的是列名，而不是具体的值。以下为正确的SQL

```sql
INSERT INTO contact (`room_id`, `uid`, `last_msg_id`, `active_time`) 
VALUES (2, 20008, 32, '2023-12-01 16:34:49.541'), (2, 20008, 32, '2023-12-01 16:34:49.541') 
ON DUPLICATE KEY UPDATE 
`last_msg_id` = VALUES(`last_msg_id`), `active_time` = VALUES(`active_time`);
```

