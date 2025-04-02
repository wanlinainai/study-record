# RocketMQ

## MQ的介绍

### MQ的优点和缺点

优点：解耦、削峰、数据分发

缺点：

- 系统可用性降低

​		引入的外部依赖越多，那么系统一旦宕机出现的问题越大。

- 系统复杂度大大提高
- 一致性问题

### 1.2 各种MQ的比较

| ActiveMQ                                               | RabbitMQ                               | RocketMQ                 | Kafka                                                        |
| ------------------------------------------------------ | -------------------------------------- | ------------------------ | ------------------------------------------------------------ |
| java                                                   | erlang                                 | java                     | scala                                                        |
| 万级                                                   | 万级                                   | 10万级                   | 10万级                                                       |
| ms级                                                   | us级                                   | ms级                     | Ms级以内                                                     |
| 高（主从架构）                                         | 高（主从架构）                         | 非常高（分布式架构）     | 非常高（分布式架构）                                         |
| 成熟的产品，很多公司都在用；有较好的文档；支持各种协议 | 基于erlang开发，并发强、性能高、延时低 | MQ功能比较完备，扩展性好 | 主要应用与大数据领域，对于一些消息查询、消息回溯并没有直接提供支持 |

## RocketMQ快速入门

RocketMQ是阿里巴巴2016年的 MQ中间件，使用Java开发，在阿里公司的内部，已经抗住了双11  的高并发的消息流转。

### 2.1 准备下载

 















## 生产者

### 3.1 最基本的概念

- Topic：表示要发送的主题。
- body：表示消息的存储内容。
- properties：表示消息属性。
- transcationId：事务消息中使用。
- Tag：消息标签，方便服务器过滤使用。目前只支持每个消息设置一个。

### 3.2 普通消息发送

#### 3.2.1 向集群中创建Topic

发送消息之前，需要确保目标主题已经被创建和实例化。

RocketMQ部署安装包默认开启了 **autoCreateTopicEnable**配置，会自动发送消息并且创建一个Topic。仅仅建议在初期的测试时使用。

生产环境上检疫管理所有的主题的生命周期。关闭自动创建Topic。防止大量的垃圾主题导致集群注册压力增大。

#### 3.2.2 添加客户端依赖

```xml
<dependency>
  <groupId>org.apache.rocketmq</groupId>
  <artifactId>rocketmq-client</artifactId>
  <version>4.9.4</version>
</dependency>
```

### 3.3 消息的发送

#### 3.3.1 同步发送

指的是消息发送方发出一条指令后，会在收到服务端同步响应之后才会发送下一条消息。

```java
public class Producer {

    @Test
    public void test() throws Exception {
        DefaultMQProducer producer = new DefaultMQProducer("oneProducer");

        // 指定nameServer的地址
        producer.setNamesrvAddr("101.37.21.212:9876");
        // 设置超时时间
        producer.setSendMsgTimeout(10000);

        producer.start();

        // 消息体
        Message message = new Message("oneTopic", "tagA", "这是第一条消息".getBytes(RemotingHelper.DEFAULT_CHARSET));

        //发送消息并且获得消息返回结果
        SendResult result = producer.   send(message);
        System.out.printf("%s%n", result);

        // 关闭
        producer.shutdown();
    }
}
```

#### 3.3.2 异步发送

异步发送指的是发送方发出一条消息之后，不必等待服务端响应，继续发送下一条消息。

```java
public class AsyncProducer {
    public static void main(String[] args) throws Exception{
        DefaultMQProducer producer = new DefaultMQProducer("asyncProducerGroup");
        producer.setNamesrvAddr("101.37.21.212:9876");

        producer.start();

        producer.setRetryTimesWhenSendAsyncFailed(0);
        int messageCount = 100;
        final CountDownLatch countDownLatch = new CountDownLatch(messageCount);

        for (int i = 0; i < messageCount; i++) {
            try {
                final int index = i;
                Message msg = new Message("AsyncTopic", "TagA",
                        "gold Chain".getBytes(RemotingHelper.DEFAULT_CHARSET));
                producer.send(msg, new SendCallback() {
                    @Override
                    public void onSuccess(SendResult sendResult) {
                        System.out.printf("%-10d OK %s %n", index, sendResult.getMsgId());
                        countDownLatch.countDown();
                    }

                    @Override
                    public void onException(Throwable e) {
                        System.out.printf("%-10d Exception %s %n", index, e);
                        e.printStackTrace();
                        countDownLatch.countDown();
                    }
                });
            }catch (Exception e) {
                e.printStackTrace();
                countDownLatch.countDown();
            }
        }

        // 异步执行，如果要求不可靠，需要等到回调接口返回明确的结果才可以结束，
        countDownLatch.await(5, TimeUnit.SECONDS);
        // 关闭生产者
        producer.shutdown();
    }
}
```

#### 3.3.3 单向模式发送

```java
public class OnewayProducer {
    public static void main(String[] args) throws Exception {
        DefaultMQProducer producer = new DefaultMQProducer("onewayProducerGroup");

        producer.setNamesrvAddr("101.37.21.212:9876");

        producer.start();

        for (int i = 0; i < 100; i++) {
            Message message = new Message("onewayTopic", "TagA", ("onewayMessage" + i).getBytes(RemotingHelper.DEFAULT_CHARSET));
            producer.sendOneway(message);
        }

        // 结束之后关闭producer
        producer.shutdown();
    }
}
```

### 3.4 顺序消息发送

在消息的发送时候，有的场景其实是需要保证一定的顺序性。比如某一个电商网站，有如下的过程：订单创建、扣减库存、发送短信通知用户。如果这些操作不按照顺序执行，那么就会产生问题。比如订单已经扣减成功了，但是我们的订单创建还没有创建成功。RocketMQ的消息顺序性可以保证这些操作按照正确的顺序进行。

> 主要是通过在send方法中传入一个MessageQueueSelector的方法。

```java
public class OrderProducer {
    public static void main(String[] args) throws Exception {
        try {
            DefaultMQProducer producer = new DefaultMQProducer("orderProducerGroup");
            producer.setNamesrvAddr("101.37.21.212:9876");
            producer.start();
            String[] tags = new String[]{"TagA", "TagB", "TagC", "TagD"};
            for (int i = 0; i < 100; i++) {
                int orderId = i % 10;
                Message message = new Message("orderTopic", tags[i % tags.length], "KEY" + i, ("OrderMessage" + i).getBytes(RemotingHelper.DEFAULT_CHARSET));
                SendResult sendResult = producer.send(message, new MessageQueueSelector() {
                    @Override
                    public MessageQueue select(List<MessageQueue> list, Message message, Object arg) {
                        Integer id = (Integer) arg;
                        int index = id % list.size();
                        return list.get(index);
                    }
                }, orderId);

                System.out.printf("%s%n", sendResult);
            }

            // 关闭
            producer.shutdown();
        }catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

> 详解：send方法中的orderId指的是要传递的额外参数，对应的就是select方法中的Object arg，那么也就说明了我们可以根据这个实现顺序性。
>
> list指的是Topic的所有队列，默认是2的幂次方，4 8 16 等，我这边是4.

##### 顺序一致性

如果一个broker宕机了，消息就会发送到其他队列，导致乱序。如果不发生改变，那么消息直接就失败了。如果要保证严格顺序而不是可用性，创建Topic是要指定-o 参数为true。

### 3.5 延迟消息

由于我们框架设置了一个延迟时间等级，![image-20231122133808997](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231122133808997.png)

我们在消息中设置上delayTimeLevel()为上述登记即可。

```java
public class ScheduledMessageProducer {
    public static void main(String[] args) throws Exception{
        DefaultMQProducer producer = new DefaultMQProducer("ScheduleMessageProducerGroup");

        producer.setNamesrvAddr("101.37.21.212:9876");
        producer.start();

        int totalMessageToSend = 100;

        for (int i = 0; i < totalMessageToSend; i++) {
            Message msg = new Message("scheduleMessageTopic", ("scheculeMessage" + i).getBytes(RemotingHelper.DEFAULT_CHARSET));

            // 设置延迟等级：3级代表10s
            msg.setDelayTimeLevel(3);

            producer.send(msg);
        }
        producer.shutdown();
    }
}
```

延迟消息指的是消费者在消费消息的时候消费者会等待时间，时间到了之后就会进行消费。

### 3.6 批量消息发送

因为我们的生产者是支持批量发送的，所以说我们可以直接将一整个消息加入到producer。

```java
public class SimpleBatchProducer {
    public static void main(String[] args) throws Exception {
        DefaultMQProducer producer = new DefaultMQProducer("simpleBatchProducer");
        producer.setNamesrvAddr("101.37.21.212:9876");
        producer.start();

        // 生产者支持list发送
        String topic = "BatchTestTopic";
        List<Message> messages = new ArrayList<>();

        messages.add(new Message(topic, "Tag1", "KEY1", "message1".getBytes(RemotingHelper.DEFAULT_CHARSET)));
        messages.add(new Message(topic, "Tag2", "KEY2", "message2".getBytes(RemotingHelper.DEFAULT_CHARSET)));
        messages.add(new Message(topic, "Tag3", "KEY3", "message3".getBytes(RemotingHelper.DEFAULT_CHARSET)));

        producer.send(messages);

        producer.shutdown();
    }
}
```

### 3.7 事务消息发送

以下是流程图：

![image-20231122140829952](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231122140829952.png)

#### 3.7.1 步骤

1. 消息生产者会生产消息，生产的是半消息。将这条半消息发送给Broker。
2. Broker将消息持久化成功之后，向生产者发送一个ACK代表确认消息已经成功发送，但是此时的消息是不能够消费的。
3. 生产者开始执行本地事务。
4. 本地事务执行完成之后，生产者向Broker端发送一个事务成功或者失败的二次确认结果，即commit或rollback。
5. Broker端在一段时间内没有接收到生产者的确认之后会进行回查。
6. 生产者在得到回查的请求之后会进行本地事务的回查，将状态重新通过第四步，
7. 服务端在接收到commit或者rollback之后进行相应的操作。commit的消息可以被消费者消费。
8. 如果服务端回查也没有收到消息，那么一定时间之后会强制回滚。

代码：

```java
public class TransactionProducer {
    public static void main(String[] args) throws Exception {
        TransactionListener transactionListener = new TransactionImpl();
        TransactionMQProducer producer = new TransactionMQProducer("transactionGroup");
        producer.setNamesrvAddr("101.37.21.212:9876");
        ThreadPoolExecutor executor = new ThreadPoolExecutor(2, 5, 100, TimeUnit.SECONDS, new ArrayBlockingQueue<>(2000), new ThreadFactory() {
            @Override
            public Thread newThread(Runnable r) {
                Thread thread = new Thread(r);
                thread.setName("transaction-msg-check-thread");
                return thread;
            }
        });
        // 设置线程池
        producer.setExecutorService(executor);
        producer.setTransactionListener(transactionListener);
        producer.start();

        String[] tags = {"TagA", "TagB", "TagC", "TagD", "TagE"};
        for (int i = 0; i < 10; i++) {
            try {
                Message message = new Message("transactionTopic", tags[i % tags.length], "KEY" + i,
                        ("transaction" + i).getBytes(RemotingHelper.DEFAULT_CHARSET));
                SendResult sendResult = producer.sendMessageInTransaction(message, null);
                System.out.printf("%s%n", sendResult);

                Thread.sleep(1000);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        for (int i = 0; i < 100; i++) {
            Thread.sleep(1000);
        }
        producer.shutdown();
    }

    static class TransactionImpl implements TransactionListener {

        private AtomicInteger transactionIndex = new AtomicInteger(0);

        private ConcurrentHashMap<String, Integer> localTrans = new ConcurrentHashMap<>();

        /**
         * 执行本地事务
         *
         * @param msg Half(prepare) message
         * @param arg Custom business parameter
         * @return
         */
        @Override
        public LocalTransactionState executeLocalTransaction(Message msg, Object arg) {
            int value = transactionIndex.getAndIncrement();
            int status = value % 3;
            localTrans.put(msg.getTransactionId(), status);
            return LocalTransactionState.UNKNOW;
        }

        @Override
        public LocalTransactionState checkLocalTransaction(MessageExt msg) {
            Integer status = localTrans.get(msg.getTransactionId());
            if (status != null) {
                switch (status) {
                    case 0:
                        return LocalTransactionState.UNKNOW;
                    case 1:
                        return LocalTransactionState.COMMIT_MESSAGE;
                    case 2:
                        return LocalTransactionState.ROLLBACK_MESSAGE;
                    default:
                        return LocalTransactionState.UNKNOW;
                }
            }
            return LocalTransactionState.COMMIT_MESSAGE;
        }
    }
}
```

最终的结果：

![image-20231122151731269](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231122151731269.png)

只有1、4、7三个消息是可以正常产生的，因为其他的都被TransactionListener过滤了。那么为什么是1、4、7呢？其实是因为我们在executeLocalTransaction方法中有一个对状态%3的操作。因为有10条消息，也就只有1、4、7可以取余变成1，所以说也就是这个结果了。



















