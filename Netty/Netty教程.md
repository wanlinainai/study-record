# Netty教程

## NIO基础

### 1、三大组件

#### 1.1  Channel和Buffer

#### 1.2  Selector

##### 1.2.1  多线程版的设计

![image-20230830164416989](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230830164416989.png)

由此图看来，多线程版本的缺点显而易见了：

1. 内存占用高
2. 线程的上下文切换成本高
3. 适合连接数少的情况下

##### 1.2.2  线程池版本的设计

![image-20230830164831438](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230830164831438.png)

缺点：

1. 阻塞模式下，线程仅仅能处理一个socket连接
2. 适合用于短连接

阻塞模式下，一个线程连接在socket1中，那么他就会被阻塞，被禁止连接socket3。

##### 1.2.3  selector版的设计

![image-20230830165817148](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230830165817148.png)

selector的作用就是配合一个线程来管理多个Channel，获取这些Channel上发生的事件。这些channel工作在非阻塞模式下，不会让线程吊死在一个channel上。适合连接数特别多，但是流量低的情况下。

调用selector的select()会阻塞直到channel发生了读写就绪事件，这些事件发生之后，select()方法就会返回这些给Thread。

###  2、ByteBuffer

#### 2.1  ByteBuffer

主要就是一些API的使用。

如果我们提前设置好一个用例文件data.txt。

```java
public class TestByteBuffer {
    public static void main(String[] args) {
        //FileChannel
        //1、输入输出流；2、通过RandomAccessFile

        FileChannel channel = null;
        try {
            channel = new FileInputStream("data.txt").getChannel();
            //缓冲区：ByteBuffer-->10个字节作为缓冲区
            ByteBuffer buffer = ByteBuffer.allocate(10);
            while (true) {
                //从Channel读取数据,向Buffer写入
                int len = channel.read(buffer);
                if (len == -1) {
                    break;
                }
                //打印Buffer的内容
                buffer.flip();//切换到读模式
                //检查是否还有剩余的数据
                while (buffer.hasRemaining()) {
                    byte b = buffer.get();//无参就是读一个字节
                    System.out.println((char) b);
                }
                //切换成写模式
                buffer.clear();
            }

        } catch (Exception e) {
            throw new RuntimeException(e);
        }finally {

        }
    }
}

```

使用的API介绍：

> ByteBuffer.allocate(Integer capcity);//开辟一个capacity大小的缓冲区。

>读模式和写模式：buffer.flip()和buffer.clear()分别是开启读模式和开启写模式

>buffer.get();没有参数的就是读取一个字节

![image-20230830175814981](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230830175814981.png)

#### 2.2  ByteBuffer 结构

ByteBuffer有几个比较重要的属性：

1. position：当前位置
2. limit：写入的限制
3. capacity：容量

一开始，

![image-20230830180226257](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230830180226257.png)

写模式下，position是写入位置，limit等于容量，下图是写入4个字节的 状态。

![image-20230830181059615](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230830181059615.png)

flip切换之后，position切换成读取位置，limit切换成读取限制。

![image-20230831111226585](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230831111226585.png)

读取四个字节之后，状态变成

![image-20230831111414855](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230831111414855.png)

读取结束，调用clear()方法。

![image-20230831111448621](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230831111448621.png)

compact方法，是把未读完的部分向前压缩，然后切换到写模式。

![image-20230831111653270](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230831111653270.png)

#### 2.3  ByteBuffer常用方法

调试工具类：

```java
public class ByteBufferUtil {
    private static final char[] BYTE2CHAR = new char[256];
    private static final char[] HEXDUMP_TABLE = new char[256 * 4];
    private static final String[] HEXPADDING = new String[16];
    private static final String[] HEXDUMP_ROWPREFIXES = new String[65536 >>> 4];
    private static final String[] BYTE2HEX = new String[256];
    private static final String[] BYTEPADDING = new String[16];

    static {
        final char[] DIGITS = "0123456789abcdef".toCharArray();
        for (int i = 0; i < 256; i++) {
            HEXDUMP_TABLE[i << 1] = DIGITS[i >>> 4 & 0x0F];
            HEXDUMP_TABLE[(i << 1) + 1] = DIGITS[i & 0x0F];
        }

        int i;

        // Generate the lookup table for hex dump paddings
        for (i = 0; i < HEXPADDING.length; i++) {
            int padding = HEXPADDING.length - i;
            StringBuilder buf = new StringBuilder(padding * 3);
            for (int j = 0; j < padding; j++) {
                buf.append("   ");
            }
            HEXPADDING[i] = buf.toString();
        }

        // Generate the lookup table for the start-offset header in each row (up to 64KiB).
        for (i = 0; i < HEXDUMP_ROWPREFIXES.length; i++) {
            StringBuilder buf = new StringBuilder(12);
            buf.append(NEWLINE);
            buf.append(Long.toHexString(i << 4 & 0xFFFFFFFFL | 0x100000000L));
            buf.setCharAt(buf.length() - 9, '|');
            buf.append('|');
            HEXDUMP_ROWPREFIXES[i] = buf.toString();
        }

        // Generate the lookup table for byte-to-hex-dump conversion
        for (i = 0; i < BYTE2HEX.length; i++) {
            BYTE2HEX[i] = ' ' + StringUtil.byteToHexStringPadded(i);
        }

        // Generate the lookup table for byte dump paddings
        for (i = 0; i < BYTEPADDING.length; i++) {
            int padding = BYTEPADDING.length - i;
            StringBuilder buf = new StringBuilder(padding);
            for (int j = 0; j < padding; j++) {
                buf.append(' ');
            }
            BYTEPADDING[i] = buf.toString();
        }

        // Generate the lookup table for byte-to-char conversion
        for (i = 0; i < BYTE2CHAR.length; i++) {
            if (i <= 0x1f || i >= 0x7f) {
                BYTE2CHAR[i] = '.';
            } else {
                BYTE2CHAR[i] = (char) i;
            }
        }
    }

    /**
     * 打印所有内容
     * @param buffer
     */
    public static void debugAll(ByteBuffer buffer) {
        int oldlimit = buffer.limit();
        buffer.limit(buffer.capacity());
        StringBuilder origin = new StringBuilder(256);
        appendPrettyHexDump(origin, buffer, 0, buffer.capacity());
        System.out.println("+--------+-------------------- all ------------------------+----------------+");
        System.out.printf("position: [%d], limit: [%d]\n", buffer.position(), oldlimit);
        System.out.println(origin);
        buffer.limit(oldlimit);
    }

    /**
     * 打印可读取内容
     * @param buffer
     */
    public static void debugRead(ByteBuffer buffer) {
        StringBuilder builder = new StringBuilder(256);
        appendPrettyHexDump(builder, buffer, buffer.position(), buffer.limit() - buffer.position());
        System.out.println("+--------+-------------------- read -----------------------+----------------+");
        System.out.printf("position: [%d], limit: [%d]\n", buffer.position(), buffer.limit());
        System.out.println(builder);
    }

    private static void appendPrettyHexDump(StringBuilder dump, ByteBuffer buf, int offset, int length) {
        if (isOutOfBounds(offset, length, buf.capacity())) {
            throw new IndexOutOfBoundsException(
                    "expected: " + "0 <= offset(" + offset + ") <= offset + length(" + length
                            + ") <= " + "buf.capacity(" + buf.capacity() + ')');
        }
        if (length == 0) {
            return;
        }
        dump.append(
                "         +-------------------------------------------------+" +
                        NEWLINE + "         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |" +
                        NEWLINE + "+--------+-------------------------------------------------+----------------+");

        final int startIndex = offset;
        final int fullRows = length >>> 4;
        final int remainder = length & 0xF;

        // Dump the rows which have 16 bytes.
        for (int row = 0; row < fullRows; row++) {
            int rowStartIndex = (row << 4) + startIndex;

            // Per-row prefix.
            appendHexDumpRowPrefix(dump, row, rowStartIndex);

            // Hex dump
            int rowEndIndex = rowStartIndex + 16;
            for (int j = rowStartIndex; j < rowEndIndex; j++) {
                dump.append(BYTE2HEX[getUnsignedByte(buf, j)]);
            }
            dump.append(" |");

            // ASCII dump
            for (int j = rowStartIndex; j < rowEndIndex; j++) {
                dump.append(BYTE2CHAR[getUnsignedByte(buf, j)]);
            }
            dump.append('|');
        }

        // Dump the last row which has less than 16 bytes.
        if (remainder != 0) {
            int rowStartIndex = (fullRows << 4) + startIndex;
            appendHexDumpRowPrefix(dump, fullRows, rowStartIndex);

            // Hex dump
            int rowEndIndex = rowStartIndex + remainder;
            for (int j = rowStartIndex; j < rowEndIndex; j++) {
                dump.append(BYTE2HEX[getUnsignedByte(buf, j)]);
            }
            dump.append(HEXPADDING[remainder]);
            dump.append(" |");

            // Ascii dump
            for (int j = rowStartIndex; j < rowEndIndex; j++) {
                dump.append(BYTE2CHAR[getUnsignedByte(buf, j)]);
            }
            dump.append(BYTEPADDING[remainder]);
            dump.append('|');
        }

        dump.append(NEWLINE +
                "+--------+-------------------------------------------------+----------------+");
    }

    private static void appendHexDumpRowPrefix(StringBuilder dump, int row, int rowStartIndex) {
        if (row < HEXDUMP_ROWPREFIXES.length) {
            dump.append(HEXDUMP_ROWPREFIXES[row]);
        } else {
            dump.append(NEWLINE);
            dump.append(Long.toHexString(rowStartIndex & 0xFFFFFFFFL | 0x100000000L));
            dump.setCharAt(dump.length() - 9, '|');
            dump.append('|');
        }
    }

    public static short getUnsignedByte(ByteBuffer buffer, int index) {
        return (short) (buffer.get(index) & 0xFF);
    }
}

```

我们写我们的测试类：

```java
public class TestByteBufferReadWrite {
    public static void main(String[] args) {
        ByteBuffer buffer = ByteBuffer.allocate(10);

        buffer.put((byte) 0x61); //'a'
        debugAll(buffer);

        buffer.put(new byte[]{0x62, 0x63, 0x64, 0x62});
        debugAll(buffer);

        buffer.flip();
        System.out.println(buffer.get());
        debugAll(buffer);
    }
}
```

##### 2.3.1  从buffer中写入数据

- 调用channel中的read方法
- 调用buffer中的put方法

```java
int readBytes = channel.read(buf);
```

```java
buf.put((byte) 127);
```



##### 2.3.2  从Buffer中读取数据

- 调用channel的write方法
- 调用buffer的get方法

```java
int wirteBytes = channel.write(buf);
```

```java
byte b = buf.get();
```

get方法会让position读指针向后走，如果想重复读取数据，

- 可以调用rewind方法使得position置为0
- 调用get(int i)方法获取索引  i  的内容，但是并不会移动指针

##### 2.3.3  mark方法和reset方法

mark方法是标记方法，将我们的position位置记录好，然后不会重置我们的position为0.

reset方法是将位置重置到position上，而我们的position指的是我们经过mark方法之后的位置。

##### 2.3.4 字符串和ByteBuffer互相转换

将String类型转换成ByteBuffer();

```java
//1
buffer.put("hello".getBytes());

//2 
ByteBuffer buffer = StanderdCharsets.UTF_8.encode("hello");

//3 
ByteBuffer.wrap("hello".getBytes());
```

将ByteBuffer转换成String。

```java
String str = StanderCharsets.UTF_8.decode(buffer);
```

由于我们的StandersCharsets类的encode是自动进行读操作，所以我们不需要手动进行flip()操作，但是针对与第一种情况，使用put方法需要进行手动修改读模式，没有设置的话是：

![image-20230901170316042](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230901170316042.png)

加上就可以看到hello:

![image-20230901170404404](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230901170404404.png)

```java
public class TestByteBufferString {
    public static void main(String[] args) {
        //1 字符串转化成ByteBuffer
        ByteBuffer buffer1 = ByteBuffer.allocate(16);
        buffer1.put("hello".getBytes());
        debugAll(buffer1);

        //2 charset
        ByteBuffer buffer2 = StandardCharsets.UTF_8.encode("hello");
        debugAll(buffer2);

        //3 wrap方法
        ByteBuffer buffer3 = ByteBuffer.wrap("hello".getBytes());
        debugAll(buffer3);

        //4 buffer转化成字符串的方法
        String str2 = StandardCharsets.UTF_8.decode(buffer2).toString();
        System.out.println(str2);

        //但是如果是buffer1的话，那么会失败，因为没有开启读模式
        buffer1.flip();
        String str1 = StandardCharsets.UTF_8.decode(buffer1).toString();
        System.out.println(str1);
    }
}
```

#### 2.4  分散读和集中写

**分散读：**

假定我们有一个文本文件words.txt。其中是  onetwothree内容。

我们可以通过设置每一个buffer的大小来设置读取的内容。

```java
public class TestScatteringReads {
    public static void main(String[] args) {
        try {
            FileChannel channel = new RandomAccessFile("words.txt", "r").getChannel();
            ByteBuffer buffer1 = ByteBuffer.allocate(3);
            ByteBuffer buffer2 = ByteBuffer.allocate(3);
            ByteBuffer buffer3 = ByteBuffer.allocate(5);
            //read(ByteBuffer[] bytes)将ByteBuffer的多个数组
            channel.read(new ByteBuffer[]{buffer1, buffer2, buffer3});

            buffer1.flip();
            buffer2.flip();
            buffer3.flip();

            debugAll(buffer1);
            debugAll(buffer2);
            debugAll(buffer3);
        } catch (IOException e) {
            throw new RuntimeException(e);
        } {

        }
    }
}
```

**集中写：**

我们有三个ByteBuffer，分别是"hello"，"world"，"你好",由于我们选用的是UTF-8。

通过channel.write(new ByteBuffer[]{buffer1, buffer2, buffer3});

```java
public class TestGatheringWrites {
    public static void main(String[] args) {
        ByteBuffer buffer1 = StandardCharsets.UTF_8.encode("hello");
        ByteBuffer buffer2 = StandardCharsets.UTF_8.encode("world");
        ByteBuffer buffer3 = StandardCharsets.UTF_8.encode("你好");

        try {
            FileChannel channel = new RandomAccessFile("words2.txt", "rw").getChannel();
            channel.write(new ByteBuffer[]{buffer1, buffer2, buffer3});
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
```

了解概念即可，不会用的。

#### 2.5 练习（黏包半包分析）

![image-20230901172622859](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230901172622859.png)

```java
public class TestByteBufferExam {
    public static void main(String[] args) {
        ByteBuffer source = ByteBuffer.allocate(32);
        source.put("Hello,world\nI'm zhangsan\nHo".getBytes());
        split(source);
        source.put("w are you?\n".getBytes());
        split(source);
    }

    private static void split(ByteBuffer source) {
        source.flip();
        for(int i = 0; i < source.limit(); i++) {
            if(source.get(i) == '\n'){
                //将原来的source中的每一个元素块儿取出来
                int length = i + 1 - source.position();
                ByteBuffer target = ByteBuffer.allocate(length);
                for(int j = 0; j < length; j++) {
                    target.put(source.get());
                }
                debugAll(target);
            }
        }
        source.compact();
    }
}

```

> 注意点：调用source.get()方法和source.get(int index)方法不一样，虽说都可以得到一个值，但是使用source.get(int index)并不会改变position的值。compact方法是让上一条没有加载完成的部分添加到第二部分，position不会重置。

###  3、文件编程

#### 3.1  FileChannel

#### 3.2  两个Channel传输数据

数据传输的API就是transferTo(int position, int size, FileChannel to);

效率比较高，底层会有操作系统的零拷贝（之后会讲）来处理。

```java
@Slf4j
public class TestFileChannelTransferTo {
    public static void main(String[] args) {
        try {
            FileChannel from = new FileInputStream("data.txt").getChannel();
            FileChannel to = new FileOutputStream("to.txt").getChannel();

            from.transferTo(0, from.size(), to);
            log.info("数据迁移完成");

        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
```

#### 3.3  Path

jdk7引入了Path和Paths类

遍历文件夹的案例：我们需要将D:\\Java_JDK\\jdk1.8目录下的所有的文件进行遍历。

```java
public class TestFileSWalkFileTree {
    public static void main(String[] args) throws IOException {
        //m1();
        //将只包含.jar的文件拿出来
        AtomicInteger jarCount = new AtomicInteger();
        Files.walkFileTree(Paths.get("D:\\Java_JDK\\jdk1.8"), new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (file.toString().endsWith(".jar")) {
                    jarCount.incrementAndGet();
                    System.out.println(file);
                }
                return super.visitFile(file, attrs);
            }
        });
        System.out.println("总jar包数量:" + jarCount);
    }

    private static void m1() throws IOException {
        AtomicInteger dirCount = new AtomicInteger();
        AtomicInteger fileCount = new AtomicInteger();
        Files.walkFileTree(Paths.get("D:\\Java_JDK\\jdk1.8"), new SimpleFileVisitor<Path>(){
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                System.out.println("===============>" + dir);
                dirCount.incrementAndGet();
                return super.preVisitDirectory(dir, attrs);
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                System.out.println(file);
                fileCount.incrementAndGet();
                return super.visitFile(file, attrs);
            }
        });

        System.out.println(dirCount);
        System.out.println(fileCount);
    }
}
```

以上有两个方法，一个是将所有的文件夹和文件的数量统计出来，另一个是将.jar结尾的文件数量统计出来。

> 注意点：我们在判断结尾是不是.jar的时候需要注意使用的是toString()之后的endsWith(".jar").

#### 3.4  Files类

##### 3.4.1  delete

这个类有很多API，拿着几个说说。

加入我们想要删除一个文件夹，如果是空的还好，那么如果不是空的，直接使用Files.delete()方法会报错，但是空的是可以删除的，那么我们如何删除一个不为空的文件夹呢？

使用Files.walkFileTree()可以完美的完成这个问题。

```java
public class TestFilesWalkTree {
    public static void main(String[] args) {
        try {
//            Files.delete(Paths.get("D:\\snipaste - 副本"));
            Files.walkFileTree(Paths.get("D:\\snipaste - 副本"), new SimpleFileVisitor<Path>(){
                @Override
                public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                    System.out.println("=======>进入:" + dir.toString());
                    return super.preVisitDirectory(dir, attrs);
                }

                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    //System.out.println("文件:" + file.toString());
                    Files.delete(file);
                    return super.visitFile(file, attrs);
                }

                @Override
                public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
//                    System.out.println("<======反出:" + dir.toString());
                    Files.delete(dir);
                    return super.postVisitDirectory(dir, exc);
                }
            });
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}

```

重写方法pre、post和visit，

visit方法中的就是将具体的某一个文件进行处理，所以我们在visit方法中进行删除文件，当退出到post方法中的时候，其实已经将文件删除完了，所以可以直接使用Files.delete()方法进行删除。

##### 3.4.2  copy

```java
public class TestFileCopy {
    public static void main(String[] args) throws IOException {
        String source = "D:\\snipaste";
        String target = "D:\\snipaste副本";

        Files.walk(Paths.get(source)).forEach(path -> {
            String targetName = path.toString().replace(source, target);
            try {
                //如果是目录
                if (Files.isDirectory(path)) {
                    Files.createDirectory(Paths.get(targetName));
                }
                //如果是文件
                else if (Files.isRegularFile(path)) {
                    Files.copy(path, Paths.get(targetName));
                }
            }catch (IOException e) {
                throw new RuntimeException(e);
            }
        });
    }
}
```

给定一个具体的目标目录，将原始目录的所有的文件内容可以拷贝到目标目录中。

需要进行一个判断，将目录的进行一个新增，如果是文件就进行拷贝。

### 4、网络编程

#### 4.1  阻塞模式

服务器端：**Server.java**

```java
@Slf4j
public class Server {
    public static void main(String[] args) throws IOException {
        //使用NIO来理解阻塞模式
        ByteBuffer buffer = ByteBuffer.allocate(16);
        //1、创建了服务器
        ServerSocketChannel ssc = ServerSocketChannel.open();

        //2、绑定监听端口
        ssc.bind(new InetSocketAddress(8080));

        List<SocketChannel> channels = new ArrayList<>();
        while (true) {
            //3、accept建立与客户端的连接，SocketChannel用来与客户端之间通信
            log.info("Connecting........");
            //accept默认就是阻塞的，等待客户端连接，线程停止运行
            SocketChannel sc = ssc.accept();
            log.info("Connected.........{}", sc);
            channels.add(sc);
            //接收客户端给我们发送的数据
            for (SocketChannel channel : channels) {
                log.info("Before read.........", channel);

                //read也是一个阻塞方法，线程停止运行，没有收到数据就会干等着
                channel.read(buffer);
                buffer.flip();
                debugRead(buffer);
                buffer.clear();
                log.info("After read........");
            }
        }
    }
}
```

1. 先创建一个服务器
2. 绑定监听的端口
3. 建立与客户端的连接
4. 接收客户端传递的数据

客户端：**Client.java**

```java
public class Client {
    public static void main(String[] args) throws IOException {
        SocketChannel sc = SocketChannel.open();
        sc.connect(new InetSocketAddress("localhost", 8080));
        System.out.println("waiting...");
    }
}
```

启动服务端，然后启动客户端，在![image-20230902212157549](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230902212157549.png)

输入：

```java
sc.write(Charset.*defaultCharset*().encode("hello"))
```

便可以将数据写入，然后服务端监听到8080端口之后进行处理，将数据写入到Buffer中，开启读模式之后可以读取到数据。

因为一开始服务端并没有接收到客户端的连接，所以一致阻塞在accept()方法中，如果一个客户端连接上服务器之后，就会走到channel.read()方法上继续阻塞，直到有客户端发送消息之后才会继续执行。

当然，如果一个客户端都已经执行完成了，如果你继续使用这个客户端发送数据，那么服务器并不会区接收你的消息，但是如果你再重新启动一个客户端，那么就会将你刚才这个客户端的消息进行执行，你就会看到你的上一个客户端的消息进行输出了。

#### 4.2  非阻塞模式

> 阻塞模式的缺点

只有等到客户端连接之后才会进行接收消息，并且accept()方法和read()方法都会阻塞程序的运行，所以说效率极其低下，那么非阻塞模式就显得必要了。

开启的方式也是极其简单，调用AbstractSelectableChannel类的configureBlocking方法，设置为false即可。

然后再次调用客户端类，发现同一个客户端连接成功之后如果发送消息可以连续发送消息，不会吞消息。就算再加一个客户端，也是相同的。

**Server.java**

```java
@Slf4j
public class Server {
    public static void main(String[] args) throws IOException {
        //使用NIO来理解阻塞模式
        ByteBuffer buffer = ByteBuffer.allocate(16);
        //1、创建了服务器
        ServerSocketChannel ssc = ServerSocketChannel.open();
        //切换成非阻塞模式
        ssc.configureBlocking(false);

        //2、绑定监听端口
        ssc.bind(new InetSocketAddress(8080));

        List<SocketChannel> channels = new ArrayList<>();
        while (true) {
            //3、accept建立与客户端的连接，SocketChannel用来与客户端之间通信
            //log.info("Connecting........");
            //accept默认就是阻塞的，等待客户端连接，线程停止运行
            SocketChannel sc = ssc.accept();
            if (sc != null) {
                log.info("Connected.........{}", sc);
                sc.configureBlocking(false);
                channels.add(sc);
            }
            //接收客户端给我们发送的数据
            for (SocketChannel channel : channels) {
                //log.info("Before read.........", channel);
                //read也是一个阻塞方法，线程停止运行，没有收到数据就会干等着
                int read = channel.read(buffer);
                if (read > 0) {
                    buffer.flip();
                    debugRead(buffer);
                    buffer.clear();
                    log.info("After read........");
                }

            }
        }
    }
}

```

客户端不变。

但是就算是非阻塞式的，新的问题也跟着来了，每一次开始，都是while(true)，任谁来都累了，所以说，需要对while无限循环进行优化。

#### 4.3  Selector

为了避免CPU空转，造成单核的处理器的占用过高问题，我们需要加一个可以控制这个空转的方法。

Selector就是一个十分完美的类，专门用来处理没有任务的时候就会阻塞，有任务并且执行之后就会唤醒并且执行。

**Server.java**

```java
@Slf4j
public class Server {
    public static void main(String[] args) throws IOException {
        Selector selector = Selector.open();
        ByteBuffer buffer = ByteBuffer.allocate(16);
        ServerSocketChannel ssc = ServerSocketChannel.open();
        ssc.configureBlocking(false);
        // 建立selector和channel的联系(注册)
        //selectionKey-->事件发生后可以知道事件和哪个channel的事件
        SelectionKey sscKey = ssc.register(selector, 0, null);
        //这个key 只关注accept事件
        sscKey.interestOps(SelectionKey.OP_ACCEPT);
        log.info("register key: {}", sscKey);

        ssc.bind(new InetSocketAddress(8080));
        List<SocketChannel> channels = new ArrayList<>();
        while (true) {
            //没有事件就会阻塞，线程阻塞，有了事件之后就会恢复运行。
            selector.select();
            //处理事件,selectedKeys中包含了所有发生的事件
            Iterator<SelectionKey> iter = selector.selectedKeys().iterator();
            while (iter.hasNext()) {
                SelectionKey key = iter.next();
                log.debug("key:  {}", key);
                ServerSocketChannel channel = (ServerSocketChannel) key.channel();
                SocketChannel sc = channel.accept();
                log.info("{}", sc);
            }
        }
    }
}

```

主要步骤：

```java
1. Selector selector = Selector.open();//新建一个Selector
2. SelectionKey sscKey = ssc.register(selector, 0, null);//将selector注册到ServerSocketChannel中
3. sscKey.interestOps(SelectionKey.OP_ACCEPT);//设置sscKey的触发事件
4. selector.select();//类似与监听的作用，将上述绑定的事件进行一个监听，如果没有事件发生，那么线程阻塞。
5. Iterator<SelectionKey> iter = selector.selectedKeys().iterator();//得到所有的事件
6. //就可以在这一些事件中处理事件了
```

四种事件：

1. connect：客户端建立连接之后触发
2. accept：会在有连接请求的时候触发
3. read：可读事件
4. write：可写事件

> 有可能有一种情况，就是如果我一直没有使用accept()方法来建立连接，那么CPU还是会空转，所以在使用selector.select()方法的时候一定要使用到accept()方法来接收，防止因为接收不到而一直空转。或者也可以将消息取消，使用cancel()；

我们测试一下，RUNServer，然后Debug Client。发送sc之后发现出错 

![image-20230903163309599](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230903163309599.png)

nullPointer异常，sc是空指针？

其实本质上是由两块儿区域的。

在ssc.register();方法将sscKey加入到SelectionKey的区域（可以想象成一个数组），设置事件为accept事件，另一个是selector.select()方法时候就会开辟另一个空间将SelectionKey区域中的数据复制到这一个空间。因为第一次只是开启了一个连接事件，所以说第二个区域只有一个接收事件，所以接收完成之后就会退出iterator的循环，然后由于再第一次事件的时候我们由开启了一个READ的事件，所以第一个区域又添加乐意名新成员：READ，由于select()方法，将这个READ的事件复制到我们的第二个区域，所以说其实在我们的iterator中其实是保留着两个事件的，即ACCEPT、READ。那么如果再次执行到iter.hasNext()的时候其实就是找到的就是第一个ACCEPT的事件，执行到channel.accept()的时候其实就已经是null了。

必须要使用iter.remove()方法。

```java
pack
@Slf4j
public class Server {
    public static void main(String[] args) throws IOException {
        Selector selector = Selector.open();
        ByteBuffer buffer = ByteBuffer.allocate(16);
        ServerSocketChannel ssc = ServerSocketChannel.open();
        ssc.configureBlocking(false);
        // 建立selector和channel的联系(注册)
        //selectionKey-->事件发生后可以知道事件和哪个channel的事件
        SelectionKey sscKey = ssc.register(selector, 0, null);
        //这个key 只关注accept事件
        sscKey.interestOps(SelectionKey.OP_ACCEPT);
        log.info("register key: {}", sscKey);

        ssc.bind(new InetSocketAddress(8080));
        List<SocketChannel> channels = new ArrayList<>();
        while (true) {
            //没有事件就会阻塞，线程阻塞，有了事件之后就会恢复运行。
            selector.select();
            //处理事件,selectedKeys中包含了所有发生的事件
            Iterator<SelectionKey> iter = selector.selectedKeys().iterator();
            while (iter.hasNext()) {
                SelectionKey key = iter.next();
                //十分重要，处理Key的时候，要从SelectedKeys删除，否则会报null错误
                iter.remove();
                log.debug("key:  {}", key);
                if (key.isAcceptable()) {
                    ServerSocketChannel channel = (ServerSocketChannel) key.channel();
                    SocketChannel sc = channel.accept();
                    sc.configureBlocking(false);
                    SelectionKey scKey = sc.register(selector, 0, null);
                    scKey.interestOps(SelectionKey.OP_READ);
                    log.info("{}", sc);
                } else if (key.isReadable()) {
                    SocketChannel readChannel = (SocketChannel) key.channel();
                    ByteBuffer buf = ByteBuffer.allocate(16);
                    int read = readChannel.read(buf);
                    if (read >= 1) {
                        buf.flip();
                        debugRead(buf);
                        log.info("buffer: {}", buf.get());
                        buf.clear();
                    }else{
                        key.channel();
                        readChannel.close();
                    }
                }

            }
        }
    }
}

```

> 如果我们断开某一个客户端连接，那么服务端会直接报错并且退出，怎么解决呢？

由于客户端断开连接，服务端接收不到客户端的消息，所以read方法会报IO异常。如果我们给加上trycatch,那么可以捕获这个异常，但是由于read监听不到事件，会一直循环，一直报错。所以我们在捕获异常的同时将我们的SocketedKey移除，然后再次启动服务端和客户端，使用客户端发送数据请求，服务端接收到之后进行处理，如果此时我们断开客户端，会发现服务端不会再报错，但是服务端会空转，这是因为我们的read方法接收不到数据一直进行循环，如果我们再加上一条read != -1 的话，那么就会解决这个问题。这也是我们的。如果有一个客户端没有连接，那么服务端会等待下一个客户端连接。

```java
@Slf4j
public class Server {
    public static void main(String[] args) throws IOException {
        Selector selector = Selector.open();
        ByteBuffer buffer = ByteBuffer.allocate(16);
        ServerSocketChannel ssc = ServerSocketChannel.open();
        ssc.configureBlocking(false);
        // 建立selector和channel的联系(注册)
        //selectionKey-->事件发生后可以知道事件和哪个channel的事件
        SelectionKey sscKey = ssc.register(selector, 0, null);
        //这个key 只关注accept事件
        sscKey.interestOps(SelectionKey.OP_ACCEPT);
        log.info("register key: {}", sscKey);

        ssc.bind(new InetSocketAddress(8080));
        List<SocketChannel> channels = new ArrayList<>();
        while (true) {
            //没有事件就会阻塞，线程阻塞，有了事件之后就会恢复运行。
            selector.select();
            //处理事件,selectedKeys中包含了所有发生的事件
            Iterator<SelectionKey> iter = selector.selectedKeys().iterator();
            while (iter.hasNext()) {
                SelectionKey key = iter.next();
                //十分重要，处理Key的时候，要从SelectedKeys删除，否则会报null错误
                iter.remove();
                log.debug("key:  {}", key);
                if (key.isAcceptable()) {
                    ServerSocketChannel channel = (ServerSocketChannel) key.channel();
                    SocketChannel sc = channel.accept();
                    sc.configureBlocking(false);
                    SelectionKey scKey = sc.register(selector, 0, null);
                    scKey.interestOps(SelectionKey.OP_READ);
                    log.info("{}", sc);
                } else if (key.isReadable()) {
                    try {
                        SocketChannel readChannel = (SocketChannel) key.channel();
                        ByteBuffer buf = ByteBuffer.allocate(4);
                        int read = readChannel.read(buf);
                        //如果channel.read返回值时-1，那么我们要断开读事件。正常的情况下返回值是读到的字节数
                        if (read == -1) {   
                            key.cancel();
                        } else {
                            if (read >= 1) {
                                buf.flip();
//                                debugRead(buf);
                                log.info("buffer: {}", Charset.defaultCharset().decode(buf));
                                buf.clear();
                            } else {
                                key.channel();
                                readChannel.close();
                            }
                        }
                    } catch (IOException e) {
                        e.printStackTrace();
                        key.cancel();// 将key进行删除注册，keys集合中后续不会再监听事件
                    }
                }

            }
        }
    }
}

```

> 消息边界

##### 处理消息的边界

![image-20230910195620285](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230910195620285.png)

- 一种思路就是固定消息长度，数据包大小相同，服务器按照预定的长度读取，缺点是浪费带宽
- 另一种就是按照分隔符进行拆分，缺点是效率太低
- TLV格式，即Type、Length、Value数据，类型和长度在已知的情况下，就可以方便获取消息的大小，分配一个合适的 Buffer，缺点是Buffer需要提前分配，如果内容太大，可能影响Server吞吐量
  - Http1.1是TLV格式
  - Http2.0是LTV格式

其实有例子可以参考，比如请求头中都是有Content-type和Content-length，一个就是Type类型、另一个是内容的长度。

代码演示：

Server.java

```java
@Slf4j
public class Server {
    public static void split(ByteBuffer source) {
        source.flip();
        for (int i = 0; i < source.limit(); i++) {
            if (source.get(i) == '\n') {
                int length = i + 1 - source.position();
                ByteBuffer target = ByteBuffer.allocate(length);
                for (int j = 0; j < length; j++) {
                    target.put(source.get());
                }
                debugAll(target);
            }
        }
        source.compact();
    }

    public static void main(String[] args) throws IOException {
        Selector selector = Selector.open();
        ServerSocketChannel ssc = ServerSocketChannel.open();
        ssc.configureBlocking(false);
        // 建立selector和channel的联系(注册)
        //selectionKey-->事件发生后可以知道事件和哪个channel的事件
        SelectionKey sscKey = ssc.register(selector, 0, null);
        //这个key 只关注accept事件
        sscKey.interestOps(SelectionKey.OP_ACCEPT);
        log.info("register key: {}", sscKey);

        ssc.bind(new InetSocketAddress(8080));
        List<SocketChannel> channels = new ArrayList<>();
        while (true) {
            //没有事件就会阻塞，线程阻塞，有了事件之后就会恢复运行。
            selector.select();
            //处理事件,selectedKeys中包含了所有发生的事件
            Iterator<SelectionKey> iter = selector.selectedKeys().iterator();
            while (iter.hasNext()) {
                SelectionKey key = iter.next();
                //十分重要，处理Key的时候，要从SelectedKeys删除，否则会报null错误
                iter.remove();
                log.debug("key:  {}", key);
                if (key.isAcceptable()) {
                    ServerSocketChannel channel = (ServerSocketChannel) key.channel();
                    SocketChannel sc = channel.accept();
                    sc.configureBlocking(false);
                    SelectionKey scKey = sc.register(selector, 0, null);
                    scKey.interestOps(SelectionKey.OP_READ);
                    log.info("{}", sc);
                } else if (key.isReadable()) {
                    try {
                        SocketChannel readChannel = (SocketChannel) key.channel();
                        ByteBuffer buf = ByteBuffer.allocate(16);
                        int read = readChannel.read(buf);
                        //如果channel.read返回值时-1，那么我们要断开读事件。正常的情况下返回值是读到的字节数
                        if (read == -1) {
                            key.cancel();
                        } else {
                            split(buf);
                        }
                    } catch (IOException e) {
                        e.printStackTrace();
                        key.cancel();// 将key进行删除注册，keys集合中后续不会再监听事件
                    }
                }
            }
        }
    }
}
```

Client.java

```java
public class Client {
    public static void main(String[] args) throws IOException {
        SocketChannel sc = SocketChannel.open();
        sc.connect(new InetSocketAddress("localhost", 8080));
        SocketAddress localAddress = sc.getLocalAddress();
        sc.write(Charset.defaultCharset().encode("1234567890abcdef111111\n"));
        System.in.read();
    }
}
```

![image-20230910202625357](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230910202625357.png)

最终的结果：111111.

为什么呢？由于我们定义的ByteBuffer只有16个字节，所以说read只能读到16个字节，但是我们准备的是不止16个字节的，会触发两次的read事件，第二次的 read事件会将剩余的数据重新发送，但是由于ByteBuffer是一个局部变量，所以说第一次的接收到的消息就会被覆盖。

首先，ByteBuffer不能是局部变量，如果设置成全局共享的，那么也会有问题，所有的channel都会共享。

那么其实在注册的时候就可以设置attach，将每一个Channel和buffer绑定，然后对于这个key.attachment()获取到ByteBuffer，然后再新建一个ByteBuffer，将之前的每一个Channel和buffer绑定的buffer放到这个新的buffer中。

##### ByteBuffer大小分配

- 每个channel都需要记录可能被切分的消息，因为Buffer不能被多个channel共同使用，因此需要为每一个channel维护一个独立的Byte Buffer。
- ByteBuffer不能太大，比如一个ByteBuffer1Mb的话，要支持百万连接就需要1Tb内存，因此需要设计大小可变的ByteBuffer
  - 一种思路是首先分配一个比较小的ByteBuffer，比如4K，如果发现不够，那么就再次分配一个8K的空间。将4K的内容拷贝到8K的内容当中，但是这样就会有一个很重要的问题，就是性能问题，消息连续容易处理，但是数据拷贝难以处理。
  - 另一种思路是将数据消息放进数组中，如果大小不够，就开辟一个新的数组，将数据写入到新的数组中，如此一来，消息的连续其实就是优点难以处理，但是数据拷贝的性能消耗就大大减少了。

#### 4.4 处理写事件









#### 4.6  更进一步

**利用多线程优化**

> 现在的电脑都是多喝CPU，设计的时候不要让CPU浪费

前面的代码只有一个选择器，没有充分利用到多核CPU。





















# Netty入门

## 1、概述

### 1.1 什么是Netty?

Netty是一个异步的、基于事件驱动的网络应用框架，用于快速开发可维护、高性能的网络服务器和客户端。

### 1.2  Netty作者

### 1.3  Netty地位

Netty在Java网络应用框架中的地位就好比：Spring框架在JavaEE开发的地位。

-  Spark - 大数据分布式计算框架
- Hadoop - 大数据分布式存储框架
- RocketMQ - 阿里的消息队列
- ES - 搜索引擎
- gRPC - rpc框架
- Dubbo - rpc框架
- Zookeeper - 分布式协调框架

### 1.4  Netty的优势

- Netty对于NIO，如果自己搭建一套NIO，工作量极大，BUG也会很多
  - 需要自己构建协议
  - 解决TCP传输问题，比如粘包、半包
  - epoll空轮询导致CPU 100%
  - 对API进行增强，使之更易用。FastThreadLocal ==> ThreadLocal，ByteBuf ==> ByteBuffer

- Netty vs 其他的网络框架
  - Mina是apache维护，将来的版本有可能会有较大的重构，破坏API的向下兼容性，Netty的开发迭代更迅速，API更简洁、文档更显而易见。
  - 16年，Netty版本
    - 2.x  2004
    - 3.x  2008
    - 4.x  2013
    - 5.x  已废弃（没有明显的性能提升，维护成本很高）

## 2、Hello World

### 2.1  目标

搭建服务端和客户端，然后可以实现客户端向服务端发送消息。

**HelloServer.java**

```java
public class HelloServer {
    public static void main(String[] args) {
        //1、启动器，负责组装 Netty 组件，启动服务器
        new ServerBootstrap()
                //2、NioEventLoopGroup指代的是BossEventLoop，WorkerEventLoop组合成的group 组
                .group(new NioEventLoopGroup())
                //3、选择服务器的ServerSocketChannel实现，这个是通用的Nio模型的socket信道
                .channel(NioServerSocketChannel.class)
                //4、Boss 负责处理连接   worker（child）负责读写，决定了 worker 能执行那些操作（handler）
                .childHandler(
                        //5、负责读写信道初始化，负责添加别的 handler
                        new ChannelInitializer<NioSocketChannel>() {
                            @Override
                            protected void initChannel(NioSocketChannel nioSocketChannel) throws Exception {
                                //6、添加具体的 handler
                                nioSocketChannel.pipeline().addLast(new StringDecoder());//将ByteBuffer转换成字符串
                                nioSocketChannel.pipeline().addLast(new ChannelInboundHandlerAdapter() {//自定义的 handler
                                    //信道的读事件
                                    @Override
                                    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                                        System.out.println(msg);
                                    }
                                });
                            }
                        }
                )
                .bind(8080);//绑定监听端口号
    }
}
```

1. 新建一个启动器，启动组装 Netty 组件，启动服务器
2. 得到BossEventLoop和WorkerEventLoop公共的组
3. 选择服务器的ServerSocketChannel实现，
4. 需要worker的处理连接，然后添加自定义的handler
5. 在自定义的Handler中添加事件，比如read、write事件

**HelloClient.java**

```java
public class HelloClient {
    public static void main(String[] args) throws InterruptedException {
        //1、创建启动器类
        new Bootstrap()
                //2、添加 EventLoop
                .group(new NioEventLoopGroup())
                //3、选择客户端Channel的实现
                .channel(NioSocketChannel.class)
                //4、添加处理器, 在连接建立后会被调用
                .handler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel nioSocketChannel) throws Exception {
                        nioSocketChannel.pipeline().addLast(new StringEncoder());//添加编码器
                    }
                })
                .connect(new InetSocketAddress("localhost", 8080))
                .sync()
                .channel()
                .writeAndFlush("hello,world");
    }
}
```

### 2.2  流程梳理

![image-20230919102410076](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230919102410076.png)

整体就3个步骤：

1. 初始化服务器Server
2. 初始化Client
3. 处理Client对于Server的服务

具体点，服务端先建立一个accept事件，开启监听端口，客户端在11的时候与Server建立连接，sync方法一直阻塞，直到连接建立，然后发送数据，将数据转换成ByteBuf，然后返回给Server，Server中由于是存在read的监听事件的，所以Server会接收到ByteBuf，然后对于这个ByteBuf直接解码，执行打印即可。

### 2.3  提示

梳理正确的观念

- 把Channel理解成数据的通道
- 把msg理解成流动是数据，最开始输入的是BufferBuf，但是经过了pipLine的加工，会变成其他的对象，最后输出又会变成ByteBuf。
- 把Handler理解成数据的处理工序
  - 工序有很多道，合并在一起就是pipeline，pipeline负责发布事件（读、取完成......）传播给每一个Handler，handler对自己感兴趣的事情进行处理。
  - handler分成Inbound和Outbound两类
- 把event Loop理解成处理数据的工人
  - 工人可以管理多个channel的IO操作，并且一旦工人负责了某一个channel，就要负责到底（绑定）
  - 工人既可以执行IO操作，也可以进行任务处理，每一位工人有任务队列，队列里可以堆放多个channel的待处理IO操作，任务分成普通任务、定时任务。
  - 工人按照pipeline顺序，依次按照handler的规划处理数据，可以为每道工序指定不同的工人

## 3、组件

### 3.1  EventLoop

事件循环对象

EventLoop本质上是一个单线程执行器，里面有run方法处理Channel上源源不断的IO事件。

他的继承关系比较复杂。

- 一个是JDK中的j.u.c.ScheduledExecutorService因此包含了线程池中的所有的方法。
- 另一条是继承自netty自己的OrderedEventExecutor
  - 提供了Boolean inEventLoop(Thread thread)方法判断一个线程是否属于这个EventLoop
  - 提供了parent方法来查看自己属于哪个EventLoopGroup

事件循环组

EventLoopGroup是一组EventLoop，Channel会调用？EventLoopGroup中的register方法来绑定其中一个Event Loop，后续这个Channel上的 IO事件都有这个EventLoop来处理（保证了IO事件处理时的线程安全）

- 继承自netty自己的EventExecutorGroup
  - 实现了iterable接口提供遍历EventLoop的能力
  - 另有next方法获取集合中下一个EventLoop

**EventLoopServer.java**

```java
@Slf4j
public class EventLoopServer {
    public static void main(String[] args) {
        new ServerBootstrap()
                .group(new NioEventLoopGroup())
                .channel(NioServerSocketChannel.class)
                .childHandler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel ch) throws Exception {
                        ch.pipeline().addLast(new ChannelInboundHandlerAdapter() {
                            @Override
                            public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                                ByteBuf buf = (ByteBuf) msg;
                                //最好指定字符集
                                log.info(buf.toString(Charset.defaultCharset()));
                            }
                        });
                    }
                })
                .bind(8080);
    }
}
```

**EventLoopClient.java**

```java
public class EventLoopClient {
    public static void main(String[] args) throws InterruptedException {
        Channel channel = new Bootstrap()
                .group(new NioEventLoopGroup())
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel nioSocketChannel) throws Exception {
                        nioSocketChannel.pipeline().addLast(new StringEncoder());
                    }
                })
                .connect("localhost", 8080)
                .sync()
                .channel();
        System.out.println(channel);
        System.out.println("");
    }
}
```

我们使用Client发送数据，开启多个Client多次发送数据，得到的Server结果是：

![image-20230919173333672](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230919173333672.png)

#### 优雅关闭

优雅关闭方法：shutdownGracefully()，该方法首先会切换到EventLoopGroup到关闭状态从而拒绝新的任务加入，然后在任务队列的任务都已经处理完成之后，停止线程的运行，确保整体应用在正常有序的状态下退出的。



如果在Server端我们分工一下，将Boss和Worker分别设置成1个以及将Worker设置成2个，其实Boss不用特意设置，我们特意设置的Worker为2个，如果超过两个Worker来执行，就会出现类似于负载均衡的现象，超过的worker会在已经被使用的线程上继续执行，截图如下：

![](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230920095908746.png)



修改一下，在initChannel的时候添加一个addLast()，

```java
@Slf4j
public class EventLoopServer {
    public static void main(String[] args) {
        EventLoopGroup group = new DefaultEventLoopGroup();
        new ServerBootstrap()
                //划分的更细一点，Boss 和 worker
                //第一个单指Boss，只负责SocketChannel上的 accept 事件，第二个单指Worker，负责SocketChannel上的 read、write 事件
                //第二个worker中的只能有两个线程来处理
                .group(new NioEventLoopGroup(), new NioEventLoopGroup(2))
                .channel(NioServerSocketChannel.class)
                .childHandler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel ch) throws Exception {
                        ch.pipeline().addLast("handler1", new ChannelInboundHandlerAdapter() {
                            @Override
                            public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                                ByteBuf buf = (ByteBuf) msg;
                                //最好指定字符集
                                log.info(buf.toString(Charset.defaultCharset()));
                                //确保执行完 handler1 之后执行 handler2
                                ctx.fireChannelRead(msg);
                            }
                        }).addLast(group, "handler2", new ChannelInboundHandlerAdapter() {
                            @Override
                            public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                                ByteBuf buf = (ByteBuf)msg;
                                log.info(buf.toString(Charset.defaultCharset()));
                            }
                        });
                    }
                })
                .bind(8080);
    }
}

```

在第二个addLast中加上一个新的DefaultEventLoopGroup()。启动，

![image-20230920102912598](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230920102912598.png)

可以发现1号Client四次分别是4-2、2-2、4-2、2-2，说明就算制定了EventGroup，那么其实也是固定的线程，只要是一个Client，那么就是一个线程，然后会有两个Group，分别指代的默认的Nio的EventGroup，还有一个是DefaultEventGroup，综合4个Client来看，NIO的线程只是固定的两个，DefaultEventLoopGroup没有指定大小，所以NIOEventLoopGroup是固定的两个：4-2、4-1，DefaultEventLoopGroup是不固定的：2-2、2-3、2-4、2-5。

#### handler执行中如何进行换人

关键代码：io.netty.channel.AbstractChannelHandlerContext#invokeChannelRead()

```java
static void invokeChannelRead(final AbstractChannelHandlerContext next, Object msg) {
    final Object m = next.pipeline.touch(ObjectUtil.checkNotNull(msg, "msg"), next);
    // 代表的是下一个Handler
    EventExecutor executor = next.executor();
    // 这代表的是同一个线程,直接执行该线程的代码即可
    if(executor.inEventLoop()) {
        next.invokeChannelRead(m);
    }else {//代表不是同一个线程，那么不能直接调用该线程的方法，但是可以通过下一个的Loop的线程调用线程的方法
        executor.execute(new Runable() {
            @Override
            public void run() {
                next.invokeChannelRead(m);
            }
        });
    }
}
```

> 如果两个EventLoop是同一个线程，那么就可以直接调用next的方法，如果是两个不同的线程，就需要另一个线程执行相关的方法。

### 3.2  Channel

channel 的主要作用：

- close()方法用来关闭channel
- closeChannel()用来处理channel的关闭
  - sync方法作用是同步等待channel关闭
  - 而addListener方法是同步等待channel关闭
- pipeline()方法添加处理器
- write()方法将数据写入
- writeAndFlush()将数据写入并且刷出

因为Netty会有一个缓冲区，其实当write方法执行之后，将数据写入到这个缓冲区中，但是并没有刷出，所以Server端其实是看不到数据的，只有调用flush()方法才会将所有的缓冲区中的数据刷新出来。

#### ChannelFuture

刚才的 客户端代码：

```java
new Bootstrap()
    .group(new NioEventLoopGroup())
    .channel(NioSocketChannel.class)
    .handler(new ChannelInitializer<Channel>() {
        @Override
        protected void initChannel(Channel ch) {
            ch.pipeline().addLast(new StringEncoder());
        }
    })
    .connect("127.0.0.1", 8080)
    .sync()
    .channel()
    .writeAndFlush(new Date() + ": hello world!");

```

此时是直接连接起来的 ，如果我们拆开来看，在connect方法中可以返回一个ChannelFuture，作用是利用channel()方法来获取Channel对象。

connect方法是异步的，意味着不用等待建立连接，方法执行就返回了。因此ChannelFuture对象并不能直接同时获取到想要得到的正确的Channel对象。

由于Netty里面的 IO操作全部是异步操作，IO操作会立即返回，但是在调用结束之后没有办法保证已经完成。将会返回给一个ChannelFuture实例，提供的是IO操作的结果信息或者状态。

实验测试：

```java
        ChannelFuture channelFuture = new Bootstrap()
                .group(new NioEventLoopGroup())
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel nioSocketChannel) throws Exception {
                        nioSocketChannel.pipeline().addLast(new StringEncoder());
                    }
                })
                //是一个
                // 异步非阻塞的, 当前调用这个方法是主线程 main 。真正执行连接的connect 的是NIO线程。
                .connect("localhost", 8080);
			System.out.println(channelFuture.channel());      // 1
			channelFuture.sync();                  			 // 2
			System.out.println(channelFuture.channel());	// 3  
```

执行1的时候，连接并没有真正建立，没有端口号；

执行2的时候，由于采用了同步的方式，所以会等待建立完成；

执行3的时候，由于已经建立连接，会将端口号等一起显示出来。

**上述是采用同步的方式来建立连接，其实会发现打印的channel的信息是main线程开启的**

如果不采用同步的方式，那么就可以添加addListener方法来实现异步回调处理。

```java
@Slf4j
public class EventLoopClient {
    public static void main(String[] args) throws InterruptedException {
        //带有Future、Promise的一般都是用来处理异步线程的，处理结果
        ChannelFuture channelFuture = new Bootstrap()
                .group(new NioEventLoopGroup())
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel nioSocketChannel) throws Exception {
                        nioSocketChannel.pipeline().addLast(new StringEncoder());
                    }
                })
                //是一个
                // 异步非阻塞的, 当前调用这个方法是主线程 main 。真正执行连接的connect 的是NIO线程。
                .connect("localhost", 8080);
        //如果不调用sync，那么以下的方法其实都不会执行
        /*
        * 1. 通过sync来处理异步线程，将异步线程转换成同步线程
        * */
//        channelFuture.sync();
//        Channel channel = channelFuture.channel();
//        log.error("{}", channel);
//        channel.writeAndFlush("你哈");
        /*
        2. 通过addListener方法来异步处理结果
         */
        channelFuture.addListener(new ChannelFutureListener() {
            @Override
            // 在nio线程建立连接之后，会调用operationComplete回调方法
            public void operationComplete(ChannelFuture future) throws Exception {
                Channel channel = future.channel();
                log.debug("{}", channel);
                channel.writeAndFlush("hello,world2");
            }
        });
    }
}
```

需求：按下‘q’键，就会停止连接和通信。

```java
@Slf4j
public class CloseFutureClient {
    public static void main(String[] args) throws InterruptedException {
        NioEventLoopGroup group = new NioEventLoopGroup();
        ChannelFuture channelFuture = new Bootstrap()
                .group(group)
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel ch) throws Exception {
                        ch.pipeline().addLast(new LoggingHandler(LogLevel.DEBUG));
                        ch.pipeline().addLast(new StringEncoder());
                    }
                })
                .connect("localhost", 8080);

        Channel channel = channelFuture.sync().channel();
        new Thread(() -> {
            Scanner scanner = new Scanner(System.in);
            while (true) {
                String line = scanner.nextLine();
                if (line.equals("q")) {
                    channel.close();
                    break;
                }
                channel.writeAndFlush(line);
            }
        }, "input").start();


        //同步关闭：sync()    异步关闭：addListener();
        // 获取ClosedFuture对象，
        ChannelFuture channelFuture1 = channel.closeFuture();
        System.out.println("========== waiting close ==========");
        channelFuture1.sync();
}

```

会发现其实是可以关闭的，但是好像线程并不能停止，不够优雅，

#### 优雅关闭

原因其实是NioEventLoopGroup中的有一些连接并没有断开，所以说根本就没有办法断开连接，我们要做的就是手动将group关闭，调用group.shutdownGracefully();

```java
@Slf4j
public class CloseFutureClient {
    public static void main(String[] args) throws InterruptedException {
        NioEventLoopGroup group = new NioEventLoopGroup();
        ChannelFuture channelFuture = new Bootstrap()
                .group(group)
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel ch) throws Exception {
                        ch.pipeline().addLast(new LoggingHandler(LogLevel.DEBUG));
                        ch.pipeline().addLast(new StringEncoder());
                    }
                })
                .connect("localhost", 8080);

        Channel channel = channelFuture.sync().channel();
        new Thread(() -> {
            Scanner scanner = new Scanner(System.in);
            while (true) {
                String line = scanner.nextLine();
                if (line.equals("q")) {
                    channel.close();
                    break;
                }
                channel.writeAndFlush(line);
            }
        }, "input").start();


        //同步关闭：sync()    异步关闭：addListener();
        // 获取ClosedFuture对象，
        ChannelFuture channelFuture1 = channel.closeFuture();
        System.out.println("========== waiting close ==========");
//        channelFuture1.sync();
        channelFuture1.addListener(new ChannelFutureListener() {
            @Override
            public void operationComplete(ChannelFuture future) throws Exception {
                log.info("处理关闭的操作");
                //优雅关机
                group.shutdownGracefully();
            }
        });
    }
}
```

#### 思考一个问题：异步提升的是什么？

假设我们存在4个医生，去给病人看病，每个病人看病花费的时间是20min，并且医生看病的过程中是以病人为单位的，一个病人看完之后才能去看下一个病人。如果说病人源源不断的进入，4个医生一天工作8个小时，算下来每天可以接收的病人数量是：4 * 8 * 3 = 96个病人。

![image-20231010104908573](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231010104908573.png)

但是其实我们可以进行细化，比如看病的步骤又分成：挂号、看病、缴费、取药。

那么如果一个医生只负责其中某一部分，比如医生1 负责挂号，医生2 负责看病，医生3 负责收费，医生4 负责开药。那么其实最终的结果就会变成：

![image-20231010105234591](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231010105234591.png)

那么这样的效率就会达到最大化。只需要后几个医生等待第一个医生以及前一个医生的执行完成就可以执行，同时有保证了执行完成的医生可以继续执行自己的工作，效率最大化。

### 3.3  Future&&Promise

异步处理过程中，最经常用到这两个接口

jdk Future：只能同步等待任务结束才能得到结果。（任务可成功，也可失败）

Netty Future：可以同步等待任务结果，也可以异步方式得到结果，但是都需要等到任务结束

Netty Promise：针对于Netty的 Future中需要等待任务结束才能得到结果进行优化，脱离了任务独立存在，只作为两个线程之间的容器

| 功能/名称    | jdk Future                     | netty Future                                                 | Promise      |
| ------------ | ------------------------------ | ------------------------------------------------------------ | ------------ |
| cancel       | 取消任务                       | -                                                            | -            |
| isCanceled   | 任务是否取消                   | -                                                            | -            |
| isDone       | 任务是否完成，不能区分成功失败 | -                                                            | -            |
| get          | 获取任务结果，阻塞等待         | -                                                            | -            |
| getNow       | -                              | 获取任务结果，非阻塞，还未产生结果时返回 null                | -            |
| await        | -                              | 等待任务结束，如果任务失败，不会抛异常，而是通过 isSuccess 判断 | -            |
| sync         | -                              | 等待任务结束，如果任务失败，抛出异常                         | -            |
| isSuccess    | -                              | 判断任务是否成功                                             | -            |
| cause        | -                              | 获取失败信息，非阻塞，如果没有失败，返回null                 | -            |
| addLinstener | -                              | 添加回调，异步接收结果                                       | -            |
| setSuccess   | -                              | -                                                            | 设置成功结果 |
| setFailure   | -                              | -                                                            | 设置失败结果 |

#### 分别测试jdk、netty的Future以及Netty的Promise接口

- jdk-->Future：

```java
@Slf4j
public class TestJdkFuture {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        Future<Integer> future = executor.submit(new Callable<Integer>() {
            @Override
            public Integer call() throws Exception {
                log.debug("执行计算");
                Thread.sleep(1000);
                return 50;
            }
        });
        /* 我们在执行任务的线程是自己开辟的，但是主线程想要使用这个线程的执行结果，所以说我们需要使用到Future来处理我们的结果，其实就相当于是
         一个容器
         */
        // 由于get()方法是获取执行结果，所以说一定要使用Callable接口来执行。
        Integer result = future.get();
        log.info("执行结果:" + String.valueOf(result));
    }
}
```

只能通过get()来获取到任务执行的结果，并且是要同步等待任务完成之后才可以去获取的到。

- netty的Future

```java
@Slf4j
public class TestNettyFuture {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        NioEventLoopGroup group = new NioEventLoopGroup();
        EventLoop eventLoop = group.next();

        //这个Future是Netty.util.concurrent包中的
        Future<Integer> future = eventLoop.submit(() -> {
            log.info("执行计算");
            Thread.sleep(1000);
            return 100;
        });
        log.info("等待结果");
        log.info("执行结果:{}", future.get());
    }
}
```

将线程池修改成EventLoopGroup，然后从group 中获取到EventLoop，获取到提交的future,可以同步也可以异步得到结果，但是都要等到任务完成。

- netty 的Promise接口

```java
@Slf4j
public class TestNettyPromise {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        // 准备EventLoop对象
        NioEventLoopGroup group = new NioEventLoopGroup();
        EventLoop eventLoop = group.next();
        // 主动创建Promise
        DefaultPromise<Integer> promise = new DefaultPromise<>(eventLoop);//结果容器
        new Thread(() -> {
            log.info("开始计算:");
            try {
                int i = 1 / 0;
                Thread.sleep(10000);
                promise.setSuccess(200);
            } catch (InterruptedException e) {
                e.printStackTrace();
                promise.setFailure(e);
            }
        }).start();
        //接收结果
        log.info("等待结果");
        log.info("结果是:{}", promise.get());
    }
}
```

一个线程可以通过promise.get()方法获取到最终结果。所得到的结果是通过setSuccess()和setFailure()来获得的。主要就是为了解决可控性，自己控制线程结果的执行。

### 3.4  handler & Pipeline

ChannelHandler是用来处理Channel的各种事件，所有的ChannelHandler被连成一串，就构成了PipeLine。

- ChannelInboundHandlerAdapter通常被认为是入站处理器，主要用来读取客户端数据并将结果写回。
- ChannelOutboundHandlerAdapter通常被认为是出站处理器，主要被用来读取站中的数据。

我们先来看一段代码：**Server.java**

```java
@Slf4j
public class TestPipeline {
    public static void main(String[] args) {
        new ServerBootstrap()
                .group(new NioEventLoopGroup())
                .channel(NioServerSocketChannel.class)
                .childHandler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel ch) throws Exception {
                        // 通过channel拿到PipeLine
                        ChannelPipeline pipeline = ch.pipeline();
                        // 添加处理器 head -->  h1  --> h2  -->  h3  -->  h4  -->  h5  -->  h6  -->  tail
                        pipeline.addLast("h1", new ChannelInboundHandlerAdapter(){
                            @Override
                            public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                                log.info("1");
                                System.out.println("1");
                                super.channelRead(ctx, msg);
                            }
                        });


                        pipeline.addLast("h2", new ChannelInboundHandlerAdapter(){
                            @Override
                            public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                                log.info("2");
                                System.out.println("2");
                                super.channelRead(ctx, msg);
                            }
                        });


                        pipeline.addLast("h3", new ChannelInboundHandlerAdapter(){
                            @Override
                            public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                                log.info("3");
                                System.out.println("3");
                                super.channelRead(ctx, msg);
                                ch.writeAndFlush(ctx.alloc().buffer().writeBytes("server...".getBytes()));
                            }
                        });


                        // 3个出栈处理器
                        pipeline.addLast("h4", new ChannelOutboundHandlerAdapter() {
                            @Override
                            public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
                                log.info("4");
                                super.write(ctx, msg, promise);
                            }
                        });

                        pipeline.addLast("h5", new ChannelOutboundHandlerAdapter() {
                            @Override
                            public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
                                log.info("5");
                                super.write(ctx, msg, promise);
                            }
                        });

                        pipeline.addLast("h6", new ChannelOutboundHandlerAdapter() {
                            @Override
                            public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
                                log.info("6");
                                super.write(ctx, msg, promise);
                            }
                        });
                    }
                })
                .bind(8111);
    }
}
```

**Client.java**

```java
public class TestPipelineClient {
    public static void main(String[] args) {
        new Bootstrap()
                .group(new NioEventLoopGroup())
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<Channel>() {
                    @Override
                    protected void initChannel(Channel ch) {
                        ch.pipeline().addLast(new StringEncoder());
                    }
                })
                .connect("127.0.0.1", 8111)
                .addListener((ChannelFutureListener) future -> {
                    future.channel().writeAndFlush("hello,world");
                });
    }
}
```

原神启动!

在没有在ChannelInboundHandlerAdapter中加上**ch.writeAndFlush(ctx.alloc().buffer().writeBytes("server...".getBytes()));**的时候，ChannelOutboundHandlerAdapter并不会执行，因为站中本身就没有数据。

当添加上writeAndFlush()方法后，向站中写入数据，再次执行Server.java后发现执行结果是：

![image-20231011090505233](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231011090505233.png)

1  2  3  6  5  4.

原因是：ChannelPipeline是实现了一个ChannelHandlerContext组成的双向链表。

ChannelInnoundHandlerAdapter的addLast()方法是将数据正序添加到站中，但是ChannelOutboundAdapter的addLast()方法是将数据逆序读取出来。

每一个pipeline.addLast()方法中发的**super.channelRead(ctx, name);**都是**ctx.fireChannelRead(msg);**会自动调用下一个handler，并且将自己的结果发送给下一个handler。

将pipeline.addLast()中的Channel.writeAndFlush换成ctx的writeAndFlush，会发现4 5  6并不会执行，ctx只会发送结果给之前的站，在3号之前的站执行。

![image-20231011095521508](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231011095521508.png)

将Out_4放置到In_3之前的位置，就会执行。

执行结果：

![image-20231011095619853](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231011095619853.png)

1 2 3 4会执行。

那这样其实是有些许复杂的，所以我们找一个能够集中管理handler的一个类：**EmbeddedChannel**

先得到handler：h1、h2、h3、h4，然后利用EmbeddedChannel channel = new EmbeddedChannel(h1, h2, h3, h4)；同一管理这4个handler。

之后可以进行入站、出站的操作。

```java
public class TestEmbeddedChannel {
    public static void main(String[] args) {
        ChannelInboundHandlerAdapter h1 = new ChannelInboundHandlerAdapter() {
            @Override
            public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                System.out.println(1);
                super.channelRead(ctx, msg);
            }
        };

        ChannelInboundHandlerAdapter h2 = new ChannelInboundHandlerAdapter() {
            @Override
            public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                System.out.println(2);
                super.channelRead(ctx, msg);
            }
        };

        ChannelOutboundHandlerAdapter h3 = new ChannelOutboundHandlerAdapter() {
            @Override
            public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
                System.out.println(3);
                super.write(ctx, msg, promise);
            }
        };

        ChannelOutboundHandlerAdapter h4 = new ChannelOutboundHandlerAdapter() {
            @Override
            public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) throws Exception {
                System.out.println(4);
                super.write(ctx, msg, promise);
            }
        };
        // 同一管理handler
        EmbeddedChannel channel = new EmbeddedChannel(h1, h2, h3, h4);

        // 模拟入站操作
//        channel.writeInbound(ByteBufAllocator.DEFAULT.buffer().writeBytes("hello".getBytes()));

        // 模拟出站操作
        channel.writeOutbound(ByteBufAllocator.DEFAULT.buffer().writeBytes("wrole".getBytes()));
    }
}
```

### 3.5  ByteBuf

#### 直接内存和堆内存

创建池化基于堆的ByteBuf

```java
ByteBuf buf = ByteBufAllocator.DEFAULT.heapBuffer(10);
```

创建池化基于内存的ByteBuf

```java
ByteBuf buf = ByteBufAllcator.DEFAULT.directBuffer(10);
```

- 直接内存创建和销毁的代价相对于比较昂贵，但是读写效率相对较高（因为少一次的复制），配合池化功能一起使用。
- 直接内存对于GC的压力小，因为这部分内存不收JVM垃圾回收的影响，当然也要记得主动释放。

#### 池化VS非池化

池化的最大的意义就是在于可重用ByteBuf，

池化功能是否开启：

```shell
-Dio.netty.allocator.type={unpooled |pooled}
```

优点：

- 没有池化，每次都会创建新的ByteBuf实例，这个操作对于直接内存的代价昂贵，如果是堆内存，也是会增加GC的频率。
- 有了池化，可重用池中的ByteBuf实例，并且采用了与jemalloc类似的内存分配算法提升分配效率。
- 高并发的情况下，池化技术更能节约内存，减少内存溢出的可能。

4.1版本之后Android平台默认是采用池化，只有Android使用的是非池化默认。

4.1版本之前默认都是非池化。

#### ByteBuf组成

![image-20231011111004305](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231011111004305.png)

#### 写入

|                                                              |                        |                                             |
| ------------------------------------------------------------ | ---------------------- | ------------------------------------------- |
| 方法签名                                                     | 含义                   | 备注                                        |
| writeBoolean(boolean value)                                  | 写入 boolean 值        | 用一字节 01\|00 代表 true\|false            |
| writeByte(int value)                                         | 写入 byte 值           |                                             |
| writeShort(int value)                                        | 写入 short 值          |                                             |
| writeInt(int value)                                          | 写入 int 值            | Big Endian，即 0x250，写入后 00 00 02 50    |
| writeIntLE(int value)                                        | 写入 int 值            | Little Endian，即 0x250，写入后 50 02 00 00 |
| writeLong(long value)                                        | 写入 long 值           |                                             |
| writeChar(int value)                                         | 写入 char 值           |                                             |
| writeFloat(float value)                                      | 写入 float 值          |                                             |
| writeDouble(double value)                                    | 写入 double 值         |                                             |
| writeBytes(ByteBuf src)                                      | 写入 netty 的 ByteBuf  |                                             |
| writeBytes(byte[] src)                                       | 写入 byte[]            |                                             |
| writeBytes(ByteBuffer src)                                   | 写入 nio 的 ByteBuffer |                                             |
| int writeCharSequence(CharSequence sequence, Charset charset) | 写入字符串             |                                             |

这些方法都是未指明返回值的，那么返回值都是ByteBuf，意味着可以进行链式调用。

```java
public class TestWriteBuf {
    public static void main(String[] args) {
        ByteBuf buffer = ByteBufAllocator.DEFAULT.buffer();
        buffer.writeBytes(new byte[] {1, 2, 3, 4});
        log(buffer);
        buffer.writeInt(5);
        log(buffer);

    }

    private static void log(ByteBuf buffer) {
        int length = buffer.readableBytes();
        int rows = length / 16 + (length % 15 == 0 ? 0 : 1) + 4;
        StringBuilder buf = new StringBuilder(rows * 80 * 2)
                .append("read index:").append(buffer.readerIndex())
                .append(" write index:").append(buffer.writerIndex())
                .append(" capacity:").append(buffer.capacity())
                .append(NEWLINE);
        appendPrettyHexDump(buf, buffer);
        System.out.println(buf.toString());
    }
}
```

执行结果：

![image-20231011113022821](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231011113022821.png)

还有一类是set开头的方法，也是可以写入数据，但是并不会改变指针的位置。

#### 扩容

```java
buffer.writeInt(6);
log(buffer);
```

```java
read index:0 write index:8 capacity:10
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 01 02 03 04 00 00 00 05                         |........        |
+--------+-------------------------------------------------+----------------+
read index:0 write index:12 capacity:16
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 01 02 03 04 00 00 00 05 00 00 00 06             |............    |
+--------+-------------------------------------------------+----------------+
```

这是执行后的结果区别：扩容到16.

如果写入后的数据大小没有查过512，那么扩容就会扩容16的整数倍，比如12扩容到16，22扩容到32.

如果大小超过512,那么扩容就会选择下一个2^n，因为512本身就是2^9，所以下一次就是扩容到2^10,，即1024.

扩容超过max capacity会报错。此处的max capacity指的是Integer的最大值。

#### 读取

有两种方法读取：

- 直接使用read来读取。
- 通过get来读取

二者的区别就是read读取过之后读取的部分就变成废弃字节，因为read index已经改变成read读取到的下一个，get的话是直接得到这个数据。

```java
public class TestWriteBuf {
    public static void main(String[] args) {
        ByteBuf buffer = ByteBufAllocator.DEFAULT.buffer(10);
        buffer.writeBytes(new byte[] {1, 2, 3, 4});
        log(buffer);
        buffer.writeInt(5);
        log(buffer);
        buffer.writeInt(6);
        log(buffer);

        // 读取单个字节
//        buffer.readByte();
//        log(buffer);

        // 这个方法是将buffer中的元素读取到byte[]中，
//        byte[] bytes = new byte[3];
//        buffer.readBytes(bytes);
//        for (int i = 0; i < bytes.length; i++) {
//            System.out.println(bytes[i]);
//        }
//        log(buffer);

        // 直接读取某一个数量的数据,感觉不常用
        buffer.readBytes(3);
        log(buffer);
    }

    private static void log(ByteBuf buffer) {
        int length = buffer.readableBytes();
        int rows = length / 16 + (length % 15 == 0 ? 0 : 1) + 4;
        StringBuilder buf = new StringBuilder(rows * 80 * 2)
                .append("read index:").append(buffer.readerIndex())
                .append(" write index:").append(buffer.writerIndex())
                .append(" capacity:").append(buffer.capacity())
                .append(NEWLINE);
        appendPrettyHexDump(buf, buffer);
        System.out.println(buf.toString());
    }
}
```

此时结果是：

![image-20231011135241955](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231011135241955.png)

会发现01、02、03都已经被删除，因为此时的read index指向的值是由0 转向 3，当处于3时，对应的正是04的字节。

但是如果我不想让read index跟着一起后移的话呢？

此时标记的函数就有作用了。

```java
        // 标记函数
        buffer.markReaderIndex();
        log(buffer);
        // 直接读取某一个数量的数据,感觉不常用
        buffer.readBytes(3);
        log(buffer);

        // 重置到标记的位置
        buffer.resetReaderIndex();
        log(buffer);
```

#### retain & release

由于Netty中存在堆外内存的ByteBuf实现，堆外内存最好是通过手动来释放，而不是等GC垃圾回收。

- UnpooledHeapByteBuf使用的是JVM内存，只需要等待GC回收内存即可
- UnpooledDirectByteBuf使用的是直接内存，需要特殊的方法来回收内存（ReferenceCountUtil.realease()方法释放）
- PooledByteBuf 以及子类使用了池化技术，需要更为复杂的技术来实现

Netty采用了引用计数法来控制回收内存，每个ByteBuf都实现了ReferenceCounted接口

- 每个ByteBuf对象的初始化记数为1
- 调用release方法记数减一，如果记数为0，ByteBuf内存被回收
- 调用retain方法记数+1，表示调用者没使用完之前，其他handler即使调用release也不会造成回收
- 当记数为0时，底层内存会被回收，即使ByteBuf对象存在，但是其他的各个方法无法正常使用。

那么这个release谁来负责呢？

因为pipeline的存在，一般需要将ByteBuf传递给下一个ChannelHandler，如果在finally中realease，就直接失去了传递性了。

正常的理解是**谁最后使用，谁来释放**。

- 起点，首次创建ByteBuf并且加入到pipeline时候。
- 入站ByteBuf处理规则：
  - 暂时省略.............

#### slice

这是零拷贝的一个体现，会将原本的ByteBuf拆分成不同的分片，但是他们底层使用的是同一块的内存。

对于原始的ByteBuf做一些初始化操作:

```java
    private static void log(ByteBuf buffer) {
        int length = buffer.readableBytes();
        int rows = length / 16 + (length % 15 == 0 ? 0 : 1) + 4;
        StringBuilder buf = new StringBuilder(rows * 80 * 2)
                .append("read index:").append(buffer.readerIndex())
                .append(" write index:").append(buffer.writerIndex())
                .append(" capacity:").append(buffer.capacity())
                .append(NEWLINE);
        appendPrettyHexDump(buf, buffer);
        System.out.println(buf.toString());
    }
```

```java
        ByteBuf origin = ByteBufAllocator.DEFAULT.buffer(10);
        origin.writeBytes(new byte[]{1, 2, 3, 4});
        origin.readByte();
        log(origin);
```

输出：

```java
read index:1 write index:4 capacity:10
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 02 03 04                                        |...             |
+--------+-------------------------------------------------+----------------+
```

这时调用slice方法，默认的无参方法会从read index 到  write index进行分片，

```java
        // 切片
        ByteBuf slice = origin.slice();
        log(slice);
```

输出：

```java
read index:0 write index:3 capacity:3
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 02 03 04                                        |...             |
+--------+-------------------------------------------------+----------------+
```

读取原本数据：

```java
        // 原始ByteBuf再次读取
        origin.readByte();
        log(origin);
        // 分片不受影响
        log(slice);
```

输出结果：

```java
read index:2 write index:4 capacity:10
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 03 04                                           |..              |
+--------+-------------------------------------------------+----------------+
read index:0 write index:3 capacity:3
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 02 03 04                                        |...             |
+--------+-------------------------------------------------+----------------+
```

修改分片的数据，原ByteBuf也会跟着变化.    原因是与原ByteBuf共用一个物理内存。

```java
        // 修改分片之后，观察源和分片的情况
        /*
        * 修改分片之后，源也会跟着修改
        * */
        slice.setByte(2, 10);
        log(origin);
        log(slice);
```

输出：

```java
read index:2 write index:4 capacity:10
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 03 0a                                           |..              |
+--------+-------------------------------------------------+----------------+
read index:0 write index:3 capacity:3
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 02 03 0a                                        |...             |
+--------+-------------------------------------------------+----------------+
```

## 4、双向通信

### 练习

实现一个echo server

编写server:

```java
public class EchoServer {
    public static void main(String[] args) {
        new ServerBootstrap()
                .group(new NioEventLoopGroup())
                .channel(NioServerSocketChannel.class)
                .childHandler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel ch) throws Exception {
                        ch.pipeline().addLast(new ChannelInboundHandlerAdapter() {
                            @Override
                            public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                                ByteBuf buffer = (ByteBuf) msg;
                                System.out.println(buffer.toString(Charset.defaultCharset()));

                                // 建议使用 ctx.alloc()创建 ByteBuf
                                ByteBuf response = ctx.alloc().buffer();
                                response.writeBytes(buffer);
                                ctx.writeAndFlush(response);
                            }
                        });
                    }
                })
                .bind(8082);
    }
}
```

编写Client：

```java
public class EchoClient {
    public static void main(String[] args) throws InterruptedException {
        NioEventLoopGroup group = new NioEventLoopGroup();
        Channel channel = new Bootstrap()
                .group(group)
                .channel(NioSocketChannel.class)
                .handler(new ChannelInitializer<NioSocketChannel>() {
                    @Override
                    protected void initChannel(NioSocketChannel ch) throws Exception {
                        ch.pipeline().addLast(new StringEncoder());
                        ch.pipeline().addLast(new ChannelInboundHandlerAdapter() {
                            @Override
                            public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                                ByteBuf buffer = (ByteBuf) msg;
                                System.out.println(buffer.toString(Charset.defaultCharset()));
                            }
                        });
                    }
                })
                .connect("localhost", 8082)
                .sync()
                .channel();
        channel.closeFuture().addListener(future -> {
            group.shutdownGracefully();
        });

        new Thread(() -> {
            Scanner scanner = new Scanner(System.in);
            while (true) {
                String line = scanner.nextLine();
                if ("q".equals(line)) {
                    channel.close();
                    break;
                }
                channel.writeAndFlush(line);
            }
        }).start();
    }
}
```

### 读和写的误区

Java SOcket本身就是全双工的：在任何时刻，线路上都是存在A到B 和 B到A的双向信号传输。即使是阻塞IO，读和写是可以同时进行的，只要分别采用读和写线程即可。读不会阻塞写，写也不会阻塞读。

# Netty进阶

## 1、 粘包和半包

#### 粘包

Server.java

```java
@Slf4j
public class HelloWorldServer {
    public static void main(String[] args) {
        NioEventLoopGroup boss = new NioEventLoopGroup();
        NioEventLoopGroup worker = new NioEventLoopGroup();
        try {
            ServerBootstrap serverBootstrap = new ServerBootstrap();
            serverBootstrap.channel(NioServerSocketChannel.class);
            serverBootstrap.group(boss, worker);

            serverBootstrap.childHandler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) throws Exception {
                    ch.pipeline().addLast(new LoggingHandler(LogLevel.DEBUG));
                    ch.pipeline().addLast(new ChannelInboundHandlerAdapter() {
                        @Override
                        public void channelActive(ChannelHandlerContext ctx) throws Exception {
                            log.info("Connected......" +ctx.channel());
                            super.channelActive(ctx);
                        }

                        @Override
                        public void channelInactive(ChannelHandlerContext ctx) throws Exception {
                            log.info("DisConnected......" + ctx.channel());
                            super.channelInactive(ctx);
                        }
                    });
                }
            });
            ChannelFuture channelFuture = serverBootstrap.bind(8093).sync();
            channelFuture.channel().closeFuture().sync();
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        } finally {
            // 优雅关闭
            boss.shutdownGracefully();
            worker.shutdownGracefully();
        }
    }
}

```

Client.java

```java
@Slf4j
public class HelloWorldClient {
    public static void main(String[] args) {
        NioEventLoopGroup worker = new NioEventLoopGroup();
        try {
            Bootstrap bootstrap = new Bootstrap()
                    .channel(NioSocketChannel.class)
                    .group(worker)
                    .handler(new ChannelInitializer<NioSocketChannel>() {
                        @Override
                        protected void initChannel(NioSocketChannel ch) throws Exception {
                            ch.pipeline().addLast(new ChannelInboundHandlerAdapter() {
                                // 会在连接之后触发 active 事件
                                @Override
                                public void channelActive(ChannelHandlerContext ctx) throws Exception {
                                    
                                    for (int i = 0; i < 10; i++) {
                                        ByteBuf buf = ctx.alloc().buffer(16);
                                        buf.writeBytes(new byte[]{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15});
                                        ctx.writeAndFlush(buf);
                                    }
                                    

                                    super.channelActive(ctx);
                                }
                            });
                        }
                    });
            ChannelFuture future = bootstrap.connect("localhost", 8093).sync();
            future.channel().closeFuture().sync();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            // 优雅停机
            worker.shutdownGracefully();
        }
    }
}

```

产生的结果：

```java
11:35:08.422 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x876536ab, L:/127.0.0.1:8093 - R:/127.0.0.1:11192] READ: 160B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f |................|
|00000010| 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f |................|
|00000020| 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f |................|
|00000030| 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f |................|
|00000040| 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f |................|
|00000050| 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f |................|
|00000060| 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f |................|
|00000070| 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f |................|
|00000080| 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f |................|
|00000090| 00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f |................|
+--------+-------------------------------------------------+----------------+
11:35:08.422 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message PooledUnsafeDirectByteBuf(ridx: 0, widx: 160, cap: 1024) that reached at the tail of the pipeline. Please check your pipeline configuration.

```

产生了160byte，产生粘包现象。

#### 半包

```java
@Slf4j
public class HelloWorldServer {
    public static void main(String[] args) {
        NioEventLoopGroup boss = new NioEventLoopGroup();
        NioEventLoopGroup worker = new NioEventLoopGroup();
        try {
            ServerBootstrap serverBootstrap = new ServerBootstrap();
            serverBootstrap.channel(NioServerSocketChannel.class);
            serverBootstrap.group(boss, worker);

            // 设置缓冲区
            serverBootstrap.option(ChannelOption.SO_RCVBUF, 10);
            serverBootstrap.childHandler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) throws Exception {
                    ch.pipeline().addLast(new LoggingHandler(LogLevel.DEBUG));
                    ch.pipeline().addLast(new ChannelInboundHandlerAdapter() {
                        @Override
                        public void channelActive(ChannelHandlerContext ctx) throws Exception {
                            log.info("Connected......" +ctx.channel());
                            super.channelActive(ctx);
                        }

                        @Override
                        public void channelInactive(ChannelHandlerContext ctx) throws Exception {
                            log.info("DisConnected......" + ctx.channel());
                            super.channelInactive(ctx);
                        }
                    });
                }
            });
            ChannelFuture channelFuture = serverBootstrap.bind(8093).sync();
            channelFuture.channel().closeFuture().sync();
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        } finally {
            // 优雅关闭
            boss.shutdownGracefully();
            worker.shutdownGracefully();
        }
    }
}
```

```java
@Slf4j
public class HelloWorldClient {
    public static void main(String[] args) {
        NioEventLoopGroup worker = new NioEventLoopGroup();
        try {
            Bootstrap bootstrap = new Bootstrap()
                    .channel(NioSocketChannel.class)
                    .group(worker)
                    .handler(new ChannelInitializer<NioSocketChannel>() {
                        @Override
                        protected void initChannel(NioSocketChannel ch) throws Exception {
                            ch.pipeline().addLast(new ChannelInboundHandlerAdapter() {
                                // 会在连接之后触发 active 事件
                                @Override
                                public void channelActive(ChannelHandlerContext ctx) throws Exception {
                                    ByteBuf buf = ctx.alloc().buffer(16);
                                    for (int i = 0; i < 10; i++) {
                                        buf.writeBytes(new byte[]{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15});
                                    }
                                    ctx.writeAndFlush(buf);

                                    super.channelActive(ctx);
                                }
                            });
                        }
                    });
            ChannelFuture future = bootstrap.connect("localhost", 8093).sync();
            future.channel().closeFuture().sync();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            // 优雅停机
            worker.shutdownGracefully();
        }
    }
}
```

最后应该会产生好几个分片，说明了半包现象。

其实本身的粘包和半包并不是Netty给造成的，TCP本身就存在这个问题：

> TCP滑动窗口
>
> - TCP 以一个段（segment）为单位，发送一个段就需要一个应答ACK，但是这样做的话，就会变成同步的，此时消耗的时间就会很长，效率很低，所以TCP采用了一个滑动窗口，一次性接受多个段，然后有一个窗口大小，当接收到一个ACK之后就接受一条数据
>
> ![image-20231013114432712](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231013114432712.png)
>
> 如此一来，减少了性能的消耗。
>
> 同时对粘包和半包做一个解释：
>
> - 粘包：
>
>   - 现象：发送ABC  def ， 得到ABCdef。
>
>   - 解释：
>
>     - 应用层：接收方ByteBuf设置的太大，Netty默认的是1024.
>     - 滑动窗口：假设发送方256byte表示一个报文，但是由于接收方处理不及时并且窗口足够大，这256个byte就会在接收方的滑动窗口中，当滑动窗口中包含了多个报文就会粘包
>     - Nagle算法会造成粘包
>
>   - Nagle算法：
>
>     即使发送一个字节，也需要加入TCP头和IP头，也就是总字节数会使用41bytes，为了提高网络利用率，tcp希望尽可能发送足够大的数据
>
>     - 如果SO_SNDBUF的数据达到MSS，那么需要发送。
>     - 如果SO_SNBUF中含有FIN，此时将剩余的数据发送，然后关闭。
>     - 如果TCP_NODELAY=true，需要发送。
>     - 已发送的数据都收到了ack的时候，需要发送。
>     - 超时需要发送，一般超时时间是200ms。
>     - 其他，延迟发送。
>
> - 半包
>
>   - 现象：发送ABCdef，得到ABC、def。
>   - 解释：
>     - 应用层：接收方ByteBuf设置的太小。
>     - 滑动窗口：还是假设发送方发送256byte的一个报文，但是由于接收方只剩下128byte空间，所以只能存下128byte，那么就会先发送128byte。等到ACK之后，之后在将剩余的128byte发送。
>     - MSS限制：发送的数据超过了MSS限制就会进行分片处理，造成半包。

### 2、解决方法

#### 短连接

```java
public class HelloWorldClient {
    public static void main(String[] args) {
        // 将一次性的操作分成10次
        for (int i = 0; i < 10; i++) {
            send();
        }
        log.info("End........");
    }

    public static void send() {
        NioEventLoopGroup worker = new NioEventLoopGroup();
        try {
            Bootstrap bootstrap = new Bootstrap()
                    .channel(NioSocketChannel.class)
                    .group(worker)
                    .handler(new ChannelInitializer<NioSocketChannel>() {
                        @Override
                        protected void initChannel(NioSocketChannel ch) throws Exception {
                            ch.pipeline().addLast(new ChannelInboundHandlerAdapter() {
                                // 会在连接之后触发 active 事件
                                @Override
                                public void channelActive(ChannelHandlerContext ctx) throws Exception {

                                    // 只建立一次连接
                                    ByteBuf buf = ctx.alloc().buffer(16);
                                    buf.writeBytes(new byte[]{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15});
                                    ctx.writeAndFlush(buf);
                                    ctx.channel().close();

                                }
                            });
                        }
                    });
            ChannelFuture future = bootstrap.connect("localhost", 8093).sync();
            future.channel().closeFuture().sync();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            // 优雅停机
            worker.shutdownGracefully();
        }
    }
}
```

将一次性的操作分成10次，

此时服务端接收到的数据是10条，分别是16B。

如果在Server中加上调整Netty的接收缓冲区，还是有可能出现半包的问题。

#### 固定分隔符

Server.java

```java
public class Server3 {
    public static void main(String[] args) {
        NioEventLoopGroup boss = new NioEventLoopGroup();
        NioEventLoopGroup worker = new NioEventLoopGroup();
        try {
            ServerBootstrap serverBootstrap = new ServerBootstrap();
            serverBootstrap.channel(NioServerSocketChannel.class);
            serverBootstrap.group(boss, worker);
            serverBootstrap.childHandler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) throws Exception {
                    // 接收到ByteBuf在行尾进行分割，设置一个最大值，如果到了这个值还是没有\n，那么就不再处理了
                    ch.pipeline().addLast(new LineBasedFrameDecoder(1024));
                    ch.pipeline().addLast(new LoggingHandler(LogLevel.DEBUG));
                }
            });
            ChannelFuture channelFuture = serverBootstrap.bind(9090).sync();
            channelFuture.channel().closeFuture().sync();
        }catch (Exception e) {
            e.printStackTrace();
        } finally {
            boss.shutdownGracefully();
            worker.shutdownGracefully();
        }
    }
}
```

Client.java

```java
public class Client3 {
    static final Logger log = LoggerFactory.getLogger(HelloWorldClient.class);

    public static void main(String[] args) {
        NioEventLoopGroup worker = new NioEventLoopGroup();
        try {
            Bootstrap bootstrap = new Bootstrap();
            bootstrap.channel(NioSocketChannel.class);
            bootstrap.group(worker);
            bootstrap.handler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) throws Exception {
                    log.debug("connetted...");
                    ch.pipeline().addLast(new LoggingHandler(LogLevel.DEBUG));
                    ch.pipeline().addLast(new ChannelInboundHandlerAdapter() {
                        @Override
                        public void channelActive(ChannelHandlerContext ctx) throws Exception {
                            log.debug("sending...");
                            Random r = new Random();
                            char c = 'a';
                            ByteBuf buffer = ctx.alloc().buffer();
                            for (int i = 0; i < 100; i++) {
                                for (int j = 1; j <= r.nextInt(16) + 1; j++) {
                                    buffer.writeByte((byte) c);
                                }
                                buffer.writeByte(10);
                                c++;
                            }
                            ctx.writeAndFlush(buffer);
                        }
                    });
                }
            });
            ChannelFuture channelFuture = bootstrap.connect("localhost", 9090).sync();
            channelFuture.channel().closeFuture().sync();

        } catch (InterruptedException e) {
            log.error("client error", e);
        } finally {
            worker.shutdownGracefully();
        }
    }
}
```

运行结果：

```java
15:52:15.573 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604] READ: 3B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 61 61 61                                        |aaa             |
+--------+-------------------------------------------------+----------------+
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message PooledSlicedByteBuf(ridx: 0, widx: 3, cap: 3/3, unwrapped: PooledUnsafeDirectByteBuf(ridx: 4, widx: 45, cap: 1024)) that reached at the tail of the pipeline. Please check your pipeline configuration.
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded message pipeline : [LineBasedFrameDecoder#0, LoggingHandler#0, DefaultChannelPipeline$TailContext#0]. Channel : [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604].
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604] READ: 2B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 62 62                                           |bb              |
+--------+-------------------------------------------------+----------------+
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message PooledSlicedByteBuf(ridx: 0, widx: 2, cap: 2/2, unwrapped: PooledUnsafeDirectByteBuf(ridx: 7, widx: 45, cap: 1024)) that reached at the tail of the pipeline. Please check your pipeline configuration.
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded message pipeline : [LineBasedFrameDecoder#0, LoggingHandler#0, DefaultChannelPipeline$TailContext#0]. Channel : [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604].
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604] READ: 2B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 63 63                                           |cc              |
+--------+-------------------------------------------------+----------------+
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message PooledSlicedByteBuf(ridx: 0, widx: 2, cap: 2/2, unwrapped: PooledUnsafeDirectByteBuf(ridx: 10, widx: 45, cap: 1024)) that reached at the tail of the pipeline. Please check your pipeline configuration.
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded message pipeline : [LineBasedFrameDecoder#0, LoggingHandler#0, DefaultChannelPipeline$TailContext#0]. Channel : [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604].
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604] READ: 9B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 64 64 64 64 64 64 64 64 64                      |ddddddddd       |
+--------+-------------------------------------------------+----------------+
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message PooledSlicedByteBuf(ridx: 0, widx: 9, cap: 9/9, unwrapped: PooledUnsafeDirectByteBuf(ridx: 20, widx: 45, cap: 1024)) that reached at the tail of the pipeline. Please check your pipeline configuration.
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded message pipeline : [LineBasedFrameDecoder#0, LoggingHandler#0, DefaultChannelPipeline$TailContext#0]. Channel : [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604].
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604] READ: 4B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 65 65 65 65                                     |eeee            |
+--------+-------------------------------------------------+----------------+
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message PooledSlicedByteBuf(ridx: 0, widx: 4, cap: 4/4, unwrapped: PooledUnsafeDirectByteBuf(ridx: 25, widx: 45, cap: 1024)) that reached at the tail of the pipeline. Please check your pipeline configuration.
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded message pipeline : [LineBasedFrameDecoder#0, LoggingHandler#0, DefaultChannelPipeline$TailContext#0]. Channel : [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604].
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604] READ: 2B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 66 66                                           |ff              |
+--------+-------------------------------------------------+----------------+
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message PooledSlicedByteBuf(ridx: 0, widx: 2, cap: 2/2, unwrapped: PooledUnsafeDirectByteBuf(ridx: 28, widx: 45, cap: 1024)) that reached at the tail of the pipeline. Please check your pipeline configuration.
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded message pipeline : [LineBasedFrameDecoder#0, LoggingHandler#0, DefaultChannelPipeline$TailContext#0]. Channel : [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604].
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604] READ: 2B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 67 67                                           |gg              |
+--------+-------------------------------------------------+----------------+
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message PooledSlicedByteBuf(ridx: 0, widx: 2, cap: 2/2, unwrapped: PooledUnsafeDirectByteBuf(ridx: 31, widx: 45, cap: 1024)) that reached at the tail of the pipeline. Please check your pipeline configuration.
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded message pipeline : [LineBasedFrameDecoder#0, LoggingHandler#0, DefaultChannelPipeline$TailContext#0]. Channel : [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604].
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604] READ: 1B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 68                                              |h               |
+--------+-------------------------------------------------+----------------+
15:52:15.574 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message PooledSlicedByteBuf(ridx: 0, widx: 1, cap: 1/1, unwrapped: PooledUnsafeDirectByteBuf(ridx: 33, widx: 45, cap: 1024)) that reached at the tail of the pipeline. Please check your pipeline configuration.
15:52:15.575 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded message pipeline : [LineBasedFrameDecoder#0, LoggingHandler#0, DefaultChannelPipeline$TailContext#0]. Channel : [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604].
15:52:15.575 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604] READ: 7B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 69 69 69 69 69 69 69                            |iiiiiii         |
+--------+-------------------------------------------------+----------------+
15:52:15.575 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message PooledSlicedByteBuf(ridx: 0, widx: 7, cap: 7/7, unwrapped: PooledUnsafeDirectByteBuf(ridx: 41, widx: 45, cap: 1024)) that reached at the tail of the pipeline. Please check your pipeline configuration.
15:52:15.575 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded message pipeline : [LineBasedFrameDecoder#0, LoggingHandler#0, DefaultChannelPipeline$TailContext#0]. Channel : [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604].
15:52:15.575 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x472b747f, L:/127.0.0.1:9090 - R:/127.0.0.1:2604] READ: 3B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 6a 6a 6a                                        |jjj             |
+--------+-------------------------------------------------+----------------+
15:52:15.575 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message PooledSlicedByteBuf(ridx: 0, widx: 3, cap: 3/3, unwrapped: PooledUnsafeDirectByteBuf(ridx: 45, widx: 45, cap: 1024)) that reached at the tail of the pipeline. Please check your pipeline configuration.

```

#### 预设长度

在发送消息之前，先约定好使用定长的字节数表示接下来的数据的长度。

LengthFieldBasedFrameDecoder( int maxFrameLength,  int lengthFieldOffset, int lengthFieldLength,  int lengthAdjustment, int initialBytesToStrip)方法

参数：

- maxFrameLength：数据包最大长度是1024.
- lengthFieldOffset：长度字段的偏移量，即长度字段在消息中的起始位置，通常表示长度字段距离消息的起始位置，如果长度字段在消息的开头，这个值通常是0。
- lengthFieldLength：长度域自己的字节数长度
- lengthAdjustment：长度域偏移量矫正。
- initialBytesToStrip：丢弃的起始的字节数。比如，在有效数据的前面有4个字节的长度域（Int类型），那么它的值就是4.

代码：

```java
public class TestLengthFieldDecoder {
    public static void main(String[] args) {
        EmbeddedChannel channel = new EmbeddedChannel(
                new LengthFieldBasedFrameDecoder(1024, 0, 4, 1, 4),
                new LoggingHandler()
        );

        // 4个字节的长度， 实际内容
        ByteBuf buffer = ByteBufAllocator.DEFAULT.buffer();

        send(buffer, "Hello, world!");
        send(buffer, "Hi!");

        channel.writeInbound(buffer);
    }

    /**
     * 发送消息
     * @param buffer
     */
    private static void send(ByteBuf buffer, String content) {
        //实际内容
        byte[] bytes = content.getBytes();

        // 内容的长度
        int length = bytes.length;
        System.out.println(bytes.length);	
        // 先写长度在写消息
        buffer.writeInt(length);

        // 版本1/2/3/4
        buffer.writeByte(1);
        buffer.writeBytes(bytes);
    }
}

```

## 2、协议设计与解析

### 2.1  为什么需要协议？





 ### 2.2  redis协议举例

```java
public class TestRedis {
    /*
    * set key value
    * */
    public static void main(String[] args) {
        // 13 指的是回车；10指的是换行
        final byte[] LINE = {13, 10};
        NioEventLoopGroup worker = new NioEventLoopGroup();
        try {
            Bootstrap bootstrap = new Bootstrap();
            bootstrap.group(worker);
            bootstrap.channel(NioSocketChannel.class);
            bootstrap.handler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) throws Exception {
                    // 添加日志的handler
                    ch.pipeline().addLast(new LoggingHandler());
                    // 添加自定义的handler
                    ch.pipeline().addLast(new ChannelInboundHandlerAdapter() {
                        @Override
                        public void channelActive(ChannelHandlerContext ctx) throws Exception {
                            ByteBuf buf = ctx.alloc().buffer();
                            buf.writeBytes("*3".getBytes()); // 代表着后续将有3个参数写入
                            buf.writeBytes(LINE);
                            buf.writeBytes("$3".getBytes()); // 写入3个字节，即set
                            buf.writeBytes(LINE);
                            buf.writeBytes("set".getBytes()); // 就是具体的要写入的值
                            buf.writeBytes(LINE);
                            buf.writeBytes("$4".getBytes()); // 代表着之后的值是4个字节
                            buf.writeBytes(LINE);
                            buf.writeBytes("name".getBytes()); // 具体的值
                            buf.writeBytes(LINE);
                            buf.writeBytes("$8".getBytes()); // 写入8个字节，具体的如下
                            buf.writeBytes(LINE);
                            buf.writeBytes("zhangsan".getBytes()); // 写入的具体的值是zhangsan
                            buf.writeBytes(LINE);
                            ctx.writeAndFlush(buf);
                        }

                        /**
                         * 为了接收Redis的返回值
                         * @param ctx
                         * @param msg
                         * @throws Exception
                         */
                        @Override
                        public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
                            ByteBuf buffer = (ByteBuf) msg;
                            // 接收 Redis中的数据
                            System.out.println(buffer.toString(Charset.defaultCharset()));
                        }

                    });
                }
            });
            ChannelFuture future = bootstrap.connect("localhost", 6379).sync();
            future.channel().closeFuture().sync();
        }catch(Exception e){
            e.printStackTrace();
        } finally {
            worker.shutdownGracefully();
        }
    }
}
```

### 2.3  Http协议举例

```java
@Slf4j
public class TestHttp {
    public static void main(String[] args) {
        NioEventLoopGroup boss = new NioEventLoopGroup();
        NioEventLoopGroup worker = new NioEventLoopGroup();
        try {
            ServerBootstrap bootstrap = new ServerBootstrap();
            bootstrap.channel(NioServerSocketChannel.class);
            bootstrap.group(boss, worker);
            bootstrap.childHandler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) throws Exception {
                    // 日志处理器
                    ch.pipeline().addLast(new LoggingHandler(LogLevel.DEBUG));
                    ch.pipeline().addLast(new HttpServerCodec());

                    // 处理请求行和请求头的内置的方法
                    ch.pipeline().addLast(new SimpleChannelInboundHandler<HttpRequest>() {
                        @Override
                        protected void channelRead0(ChannelHandlerContext ctx, HttpRequest msg) throws Exception {
                            // 获取请求
                            log.debug(msg.uri());

                            // 返回响应
                            DefaultFullHttpResponse response = new DefaultFullHttpResponse(msg.protocolVersion(), HttpResponseStatus.OK);
                            byte[] bytes = "<h1>Hello, world</h1>".getBytes();
                            response.headers().setInt(CONTENT_LENGTH, bytes.length);

                            ByteBuf content = response.content();
                            content.writeBytes(bytes);

                            // 将resposne 写回到channel
                            ctx.writeAndFlush(response);
                        }
                    });
                }
            });
            ChannelFuture future = bootstrap.bind(8080).sync();
            future.channel().closeFuture().sync();
        }catch (Exception e) {
            e.printStackTrace();
        }finally {
            boss.shutdownGracefully();
            worker.shutdownGracefully();
        }
    }
}
```

浏览器访问：localhost:8080/index.html。结果如下：

```java
09:45:17.520 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x47fb2596, L:/0:0:0:0:0:0:0:1:8080 - R:/0:0:0:0:0:0:0:1:9412] READ: 1091B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 47 45 54 20 2f 69 6e 64 65 78 2e 68 74 6d 6c 20 |GET /index.html |
|00000010| 48 54 54 50 2f 31 2e 31 0d 0a 48 6f 73 74 3a 20 |HTTP/1.1..Host: |
|00000020| 6c 6f 63 61 6c 68 6f 73 74 3a 38 30 38 30 0d 0a |localhost:8080..|
|00000030| 43 6f 6e 6e 65 63 74 69 6f 6e 3a 20 6b 65 65 70 |Connection: keep|
|00000040| 2d 61 6c 69 76 65 0d 0a 43 61 63 68 65 2d 43 6f |-alive..Cache-Co|
|00000050| 6e 74 72 6f 6c 3a 20 6d 61 78 2d 61 67 65 3d 30 |ntrol: max-age=0|
|00000060| 0d 0a 73 65 63 2d 63 68 2d 75 61 3a 20 22 47 6f |..sec-ch-ua: "Go|
|00000070| 6f 67 6c 65 20 43 68 72 6f 6d 65 22 3b 76 3d 22 |ogle Chrome";v="|
|00000080| 31 31 37 22 2c 20 22 4e 6f 74 3b 41 3d 42 72 61 |117", "Not;A=Bra|
|00000090| 6e 64 22 3b 76 3d 22 38 22 2c 20 22 43 68 72 6f |nd";v="8", "Chro|
|000000a0| 6d 69 75 6d 22 3b 76 3d 22 31 31 37 22 0d 0a 73 |mium";v="117"..s|
|000000b0| 65 63 2d 63 68 2d 75 61 2d 6d 6f 62 69 6c 65 3a |ec-ch-ua-mobile:|
|000000c0| 20 3f 30 0d 0a 73 65 63 2d 63 68 2d 75 61 2d 70 | ?0..sec-ch-ua-p|
|000000d0| 6c 61 74 66 6f 72 6d 3a 20 22 57 69 6e 64 6f 77 |latform: "Window|
|000000e0| 73 22 0d 0a 55 70 67 72 61 64 65 2d 49 6e 73 65 |s"..Upgrade-Inse|
|000000f0| 63 75 72 65 2d 52 65 71 75 65 73 74 73 3a 20 31 |cure-Requests: 1|
|00000100| 0d 0a 55 73 65 72 2d 41 67 65 6e 74 3a 20 4d 6f |..User-Agent: Mo|
|00000110| 7a 69 6c 6c 61 2f 35 2e 30 20 28 57 69 6e 64 6f |zilla/5.0 (Windo|
|00000120| 77 73 20 4e 54 20 31 30 2e 30 3b 20 57 69 6e 36 |ws NT 10.0; Win6|
|00000130| 34 3b 20 78 36 34 29 20 41 70 70 6c 65 57 65 62 |4; x64) AppleWeb|
|00000140| 4b 69 74 2f 35 33 37 2e 33 36 20 28 4b 48 54 4d |Kit/537.36 (KHTM|
|00000150| 4c 2c 20 6c 69 6b 65 20 47 65 63 6b 6f 29 20 43 |L, like Gecko) C|
|00000160| 68 72 6f 6d 65 2f 31 31 37 2e 30 2e 30 2e 30 20 |hrome/117.0.0.0 |
|00000170| 53 61 66 61 72 69 2f 35 33 37 2e 33 36 0d 0a 41 |Safari/537.36..A|
|00000180| 63 63 65 70 74 3a 20 74 65 78 74 2f 68 74 6d 6c |ccept: text/html|
|00000190| 2c 61 70 70 6c 69 63 61 74 69 6f 6e 2f 78 68 74 |,application/xht|
|000001a0| 6d 6c 2b 78 6d 6c 2c 61 70 70 6c 69 63 61 74 69 |ml+xml,applicati|
|000001b0| 6f 6e 2f 78 6d 6c 3b 71 3d 30 2e 39 2c 69 6d 61 |on/xml;q=0.9,ima|
|000001c0| 67 65 2f 61 76 69 66 2c 69 6d 61 67 65 2f 77 65 |ge/avif,image/we|
|000001d0| 62 70 2c 69 6d 61 67 65 2f 61 70 6e 67 2c 2a 2f |bp,image/apng,*/|
|000001e0| 2a 3b 71 3d 30 2e 38 2c 61 70 70 6c 69 63 61 74 |*;q=0.8,applicat|
|000001f0| 69 6f 6e 2f 73 69 67 6e 65 64 2d 65 78 63 68 61 |ion/signed-excha|
|00000200| 6e 67 65 3b 76 3d 62 33 3b 71 3d 30 2e 37 0d 0a |nge;v=b3;q=0.7..|
|00000210| 53 65 63 2d 46 65 74 63 68 2d 53 69 74 65 3a 20 |Sec-Fetch-Site: |
|00000220| 6e 6f 6e 65 0d 0a 53 65 63 2d 46 65 74 63 68 2d |none..Sec-Fetch-|
|00000230| 4d 6f 64 65 3a 20 6e 61 76 69 67 61 74 65 0d 0a |Mode: navigate..|
|00000240| 53 65 63 2d 46 65 74 63 68 2d 55 73 65 72 3a 20 |Sec-Fetch-User: |
|00000250| 3f 31 0d 0a 53 65 63 2d 46 65 74 63 68 2d 44 65 |?1..Sec-Fetch-De|
|00000260| 73 74 3a 20 64 6f 63 75 6d 65 6e 74 0d 0a 41 63 |st: document..Ac|
|00000270| 63 65 70 74 2d 45 6e 63 6f 64 69 6e 67 3a 20 67 |cept-Encoding: g|
|00000280| 7a 69 70 2c 20 64 65 66 6c 61 74 65 2c 20 62 72 |zip, deflate, br|
|00000290| 0d 0a 41 63 63 65 70 74 2d 4c 61 6e 67 75 61 67 |..Accept-Languag|
|000002a0| 65 3a 20 7a 68 2d 43 4e 2c 7a 68 3b 71 3d 30 2e |e: zh-CN,zh;q=0.|
|000002b0| 39 2c 65 6e 2d 47 42 3b 71 3d 30 2e 38 2c 65 6e |9,en-GB;q=0.8,en|
|000002c0| 2d 55 53 3b 71 3d 30 2e 37 2c 65 6e 3b 71 3d 30 |-US;q=0.7,en;q=0|
|000002d0| 2e 36 0d 0a 43 6f 6f 6b 69 65 3a 20 58 58 4c 5f |.6..Cookie: XXL_|
|000002e0| 4a 4f 42 5f 4c 4f 47 49 4e 5f 49 44 45 4e 54 49 |JOB_LOGIN_IDENTI|
|000002f0| 54 59 3d 37 62 32 32 36 39 36 34 32 32 33 61 33 |TY=7b226964223a3|
|00000300| 31 32 63 32 32 37 35 37 33 36 35 37 32 36 65 36 |12c22757365726e6|
|00000310| 31 36 64 36 35 32 32 33 61 32 32 36 31 36 34 36 |16d65223a2261646|
|00000320| 64 36 39 36 65 32 32 32 63 32 32 37 30 36 31 37 |d696e222c2270617|
|00000330| 33 37 33 37 37 36 66 37 32 36 34 32 32 33 61 32 |373776f7264223a2|
|00000340| 32 36 35 33 31 33 30 36 31 36 34 36 33 33 33 33 |2653130616463333|
|00000350| 39 33 34 33 39 36 32 36 31 33 35 33 39 36 31 36 |9343962613539616|
|00000360| 32 36 32 36 35 33 35 33 36 36 35 33 30 33 35 33 |2626535366530353|
|00000370| 37 36 36 33 32 33 30 36 36 33 38 33 38 33 33 36 |7663230663838336|
|00000380| 35 32 32 32 63 32 32 37 32 36 66 36 63 36 35 32 |5222c22726f6c652|
|00000390| 32 33 61 33 31 32 63 32 32 37 30 36 35 37 32 36 |23a312c227065726|
|000003a0| 64 36 39 37 33 37 33 36 39 36 66 36 65 32 32 33 |d697373696f6e223|
|000003b0| 61 36 65 37 35 36 63 36 63 37 64 3b 20 72 65 6d |a6e756c6c7d; rem|
|000003c0| 65 6d 62 65 72 4d 65 3d 74 72 75 65 3b 20 75 73 |emberMe=true; us|
|000003d0| 65 72 6e 61 6d 65 3d 61 64 6d 69 6e 3b 20 70 61 |ername=admin; pa|
|000003e0| 73 73 77 6f 72 64 3d 6a 64 62 61 61 63 57 6f 38 |ssword=jdbaacWo8|
|000003f0| 68 37 33 79 44 41 69 34 76 4b 55 71 69 34 45 38 |h73yDAi4vKUqi4E8|
|00000400| 5a 4d 56 2b 41 57 7a 61 66 6b 49 5a 4a 74 59 50 |ZMV+AWzafkIZJtYP|
|00000410| 73 47 45 7a 79 79 77 6c 72 6c 48 4b 76 52 6d 2f |sGEzyywlrlHKvRm/|
|00000420| 34 4f 64 35 71 54 41 45 41 50 4e 67 4c 31 30 30 |4Od5qTAEAPNgL100|
|00000430| 6c 48 53 64 70 2b 73 42 6f 55 42 31 77 3d 3d 0d |lHSdp+sBoUB1w==.|
|00000440| 0a 0d 0a                                        |...             |
+--------+-------------------------------------------------+----------------+
09:45:17.521 [nioEventLoopGroup-3-1] DEBUG org.example.netty.c9.TestHttp - /index.html
09:45:17.521 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x47fb2596, L:/0:0:0:0:0:0:0:1:8080 - R:/0:0:0:0:0:0:0:1:9412] WRITE: 60B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 48 54 54 50 2f 31 2e 31 20 32 30 30 20 4f 4b 0d |HTTP/1.1 200 OK.|
|00000010| 0a 63 6f 6e 74 65 6e 74 2d 6c 65 6e 67 74 68 3a |.content-length:|
|00000020| 20 32 31 0d 0a 0d 0a 3c 68 31 3e 48 65 6c 6c 6f | 21....<h1>Hello|
|00000030| 2c 20 77 6f 72 6c 64 3c 2f 68 31 3e             |, world</h1>    |
+--------+-------------------------------------------------+----------------+
09:45:17.521 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x47fb2596, L:/0:0:0:0:0:0:0:1:8080 - R:/0:0:0:0:0:0:0:1:9412] FLUSH
09:45:17.521 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message EmptyLastHttpContent that reached at the tail of the pipeline. Please check your pipeline configuration.
09:45:17.521 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded message pipeline : [LoggingHandler#0, HttpServerCodec#0, TestHttp$1$1#0, DefaultChannelPipeline$TailContext#0]. Channel : [id: 0x47fb2596, L:/0:0:0:0:0:0:0:1:8080 - R:/0:0:0:0:0:0:0:1:9412].
09:45:17.521 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x47fb2596, L:/0:0:0:0:0:0:0:1:8080 - R:/0:0:0:0:0:0:0:1:9412] READ COMPLETE
09:45:17.558 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x47fb2596, L:/0:0:0:0:0:0:0:1:8080 - R:/0:0:0:0:0:0:0:1:9412] READ: 991B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 47 45 54 20 2f 66 61 76 69 63 6f 6e 2e 69 63 6f |GET /favicon.ico|
|00000010| 20 48 54 54 50 2f 31 2e 31 0d 0a 48 6f 73 74 3a | HTTP/1.1..Host:|
|00000020| 20 6c 6f 63 61 6c 68 6f 73 74 3a 38 30 38 30 0d | localhost:8080.|
|00000030| 0a 43 6f 6e 6e 65 63 74 69 6f 6e 3a 20 6b 65 65 |.Connection: kee|
|00000040| 70 2d 61 6c 69 76 65 0d 0a 73 65 63 2d 63 68 2d |p-alive..sec-ch-|
|00000050| 75 61 3a 20 22 47 6f 6f 67 6c 65 20 43 68 72 6f |ua: "Google Chro|
|00000060| 6d 65 22 3b 76 3d 22 31 31 37 22 2c 20 22 4e 6f |me";v="117", "No|
|00000070| 74 3b 41 3d 42 72 61 6e 64 22 3b 76 3d 22 38 22 |t;A=Brand";v="8"|
|00000080| 2c 20 22 43 68 72 6f 6d 69 75 6d 22 3b 76 3d 22 |, "Chromium";v="|
|00000090| 31 31 37 22 0d 0a 73 65 63 2d 63 68 2d 75 61 2d |117"..sec-ch-ua-|
|000000a0| 6d 6f 62 69 6c 65 3a 20 3f 30 0d 0a 55 73 65 72 |mobile: ?0..User|
|000000b0| 2d 41 67 65 6e 74 3a 20 4d 6f 7a 69 6c 6c 61 2f |-Agent: Mozilla/|
|000000c0| 35 2e 30 20 28 57 69 6e 64 6f 77 73 20 4e 54 20 |5.0 (Windows NT |
|000000d0| 31 30 2e 30 3b 20 57 69 6e 36 34 3b 20 78 36 34 |10.0; Win64; x64|
|000000e0| 29 20 41 70 70 6c 65 57 65 62 4b 69 74 2f 35 33 |) AppleWebKit/53|
|000000f0| 37 2e 33 36 20 28 4b 48 54 4d 4c 2c 20 6c 69 6b |7.36 (KHTML, lik|
|00000100| 65 20 47 65 63 6b 6f 29 20 43 68 72 6f 6d 65 2f |e Gecko) Chrome/|
|00000110| 31 31 37 2e 30 2e 30 2e 30 20 53 61 66 61 72 69 |117.0.0.0 Safari|
|00000120| 2f 35 33 37 2e 33 36 0d 0a 73 65 63 2d 63 68 2d |/537.36..sec-ch-|
|00000130| 75 61 2d 70 6c 61 74 66 6f 72 6d 3a 20 22 57 69 |ua-platform: "Wi|
|00000140| 6e 64 6f 77 73 22 0d 0a 41 63 63 65 70 74 3a 20 |ndows"..Accept: |
|00000150| 69 6d 61 67 65 2f 61 76 69 66 2c 69 6d 61 67 65 |image/avif,image|
|00000160| 2f 77 65 62 70 2c 69 6d 61 67 65 2f 61 70 6e 67 |/webp,image/apng|
|00000170| 2c 69 6d 61 67 65 2f 73 76 67 2b 78 6d 6c 2c 69 |,image/svg+xml,i|
|00000180| 6d 61 67 65 2f 2a 2c 2a 2f 2a 3b 71 3d 30 2e 38 |mage/*,*/*;q=0.8|
|00000190| 0d 0a 53 65 63 2d 46 65 74 63 68 2d 53 69 74 65 |..Sec-Fetch-Site|
|000001a0| 3a 20 73 61 6d 65 2d 6f 72 69 67 69 6e 0d 0a 53 |: same-origin..S|
|000001b0| 65 63 2d 46 65 74 63 68 2d 4d 6f 64 65 3a 20 6e |ec-Fetch-Mode: n|
|000001c0| 6f 2d 63 6f 72 73 0d 0a 53 65 63 2d 46 65 74 63 |o-cors..Sec-Fetc|
|000001d0| 68 2d 44 65 73 74 3a 20 69 6d 61 67 65 0d 0a 52 |h-Dest: image..R|
|000001e0| 65 66 65 72 65 72 3a 20 68 74 74 70 3a 2f 2f 6c |eferer: http://l|
|000001f0| 6f 63 61 6c 68 6f 73 74 3a 38 30 38 30 2f 69 6e |ocalhost:8080/in|
|00000200| 64 65 78 2e 68 74 6d 6c 0d 0a 41 63 63 65 70 74 |dex.html..Accept|
|00000210| 2d 45 6e 63 6f 64 69 6e 67 3a 20 67 7a 69 70 2c |-Encoding: gzip,|
|00000220| 20 64 65 66 6c 61 74 65 2c 20 62 72 0d 0a 41 63 | deflate, br..Ac|
|00000230| 63 65 70 74 2d 4c 61 6e 67 75 61 67 65 3a 20 7a |cept-Language: z|
|00000240| 68 2d 43 4e 2c 7a 68 3b 71 3d 30 2e 39 2c 65 6e |h-CN,zh;q=0.9,en|
|00000250| 2d 47 42 3b 71 3d 30 2e 38 2c 65 6e 2d 55 53 3b |-GB;q=0.8,en-US;|
|00000260| 71 3d 30 2e 37 2c 65 6e 3b 71 3d 30 2e 36 0d 0a |q=0.7,en;q=0.6..|
|00000270| 43 6f 6f 6b 69 65 3a 20 58 58 4c 5f 4a 4f 42 5f |Cookie: XXL_JOB_|
|00000280| 4c 4f 47 49 4e 5f 49 44 45 4e 54 49 54 59 3d 37 |LOGIN_IDENTITY=7|
|00000290| 62 32 32 36 39 36 34 32 32 33 61 33 31 32 63 32 |b226964223a312c2|
|000002a0| 32 37 35 37 33 36 35 37 32 36 65 36 31 36 64 36 |2757365726e616d6|
|000002b0| 35 32 32 33 61 32 32 36 31 36 34 36 64 36 39 36 |5223a2261646d696|
|000002c0| 65 32 32 32 63 32 32 37 30 36 31 37 33 37 33 37 |e222c22706173737|
|000002d0| 37 36 66 37 32 36 34 32 32 33 61 32 32 36 35 33 |76f7264223a22653|
|000002e0| 31 33 30 36 31 36 34 36 33 33 33 33 39 33 34 33 |1306164633339343|
|000002f0| 39 36 32 36 31 33 35 33 39 36 31 36 32 36 32 36 |9626135396162626|
|00000300| 35 33 35 33 36 36 35 33 30 33 35 33 37 36 36 33 |5353665303537663|
|00000310| 32 33 30 36 36 33 38 33 38 33 33 36 35 32 32 32 |2306638383365222|
|00000320| 63 32 32 37 32 36 66 36 63 36 35 32 32 33 61 33 |c22726f6c65223a3|
|00000330| 31 32 63 32 32 37 30 36 35 37 32 36 64 36 39 37 |12c227065726d697|
|00000340| 33 37 33 36 39 36 66 36 65 32 32 33 61 36 65 37 |373696f6e223a6e7|
|00000350| 35 36 63 36 63 37 64 3b 20 72 65 6d 65 6d 62 65 |56c6c7d; remembe|
|00000360| 72 4d 65 3d 74 72 75 65 3b 20 75 73 65 72 6e 61 |rMe=true; userna|
|00000370| 6d 65 3d 61 64 6d 69 6e 3b 20 70 61 73 73 77 6f |me=admin; passwo|
|00000380| 72 64 3d 6a 64 62 61 61 63 57 6f 38 68 37 33 79 |rd=jdbaacWo8h73y|
|00000390| 44 41 69 34 76 4b 55 71 69 34 45 38 5a 4d 56 2b |DAi4vKUqi4E8ZMV+|
|000003a0| 41 57 7a 61 66 6b 49 5a 4a 74 59 50 73 47 45 7a |AWzafkIZJtYPsGEz|
|000003b0| 79 79 77 6c 72 6c 48 4b 76 52 6d 2f 34 4f 64 35 |yywlrlHKvRm/4Od5|
|000003c0| 71 54 41 45 41 50 4e 67 4c 31 30 30 6c 48 53 64 |qTAEAPNgL100lHSd|
|000003d0| 70 2b 73 42 6f 55 42 31 77 3d 3d 0d 0a 0d 0a    |p+sBoUB1w==.... |
+--------+-------------------------------------------------+----------------+
09:45:17.558 [nioEventLoopGroup-3-1] DEBUG org.example.netty.c9.TestHttp - /favicon.ico
09:45:17.558 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x47fb2596, L:/0:0:0:0:0:0:0:1:8080 - R:/0:0:0:0:0:0:0:1:9412] WRITE: 60B
         +-------------------------------------------------+
         |  0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f |
+--------+-------------------------------------------------+----------------+
|00000000| 48 54 54 50 2f 31 2e 31 20 32 30 30 20 4f 4b 0d |HTTP/1.1 200 OK.|
|00000010| 0a 63 6f 6e 74 65 6e 74 2d 6c 65 6e 67 74 68 3a |.content-length:|
|00000020| 20 32 31 0d 0a 0d 0a 3c 68 31 3e 48 65 6c 6c 6f | 21....<h1>Hello|
|00000030| 2c 20 77 6f 72 6c 64 3c 2f 68 31 3e             |, world</h1>    |
+--------+-------------------------------------------------+----------------+
09:45:17.558 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x47fb2596, L:/0:0:0:0:0:0:0:1:8080 - R:/0:0:0:0:0:0:0:1:9412] FLUSH
09:45:17.558 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded inbound message EmptyLastHttpContent that reached at the tail of the pipeline. Please check your pipeline configuration.
09:45:17.558 [nioEventLoopGroup-3-1] DEBUG io.netty.channel.DefaultChannelPipeline - Discarded message pipeline : [LoggingHandler#0, HttpServerCodec#0, TestHttp$1$1#0, DefaultChannelPipeline$TailContext#0]. Channel : [id: 0x47fb2596, L:/0:0:0:0:0:0:0:1:8080 - R:/0:0:0:0:0:0:0:1:9412].
09:45:17.558 [nioEventLoopGroup-3-1] DEBUG io.netty.handler.logging.LoggingHandler - [id: 0x47fb2596, L:/0:0:0:0:0:0:0:1:8080 - R:/0:0:0:0:0:0:0:1:9412] READ COMPLETE

```

可以看到总共分成4部分，

- 第一部分是/index.html请求的请求头
- 第二部分是/index.html请求中的请求状态码和请求内容
- 第三部分是/favicon.ico请求图标的请求头，默认是浏览器中自带的
- 第四部分是/favicon.ico请求的内容

> Http请求的Handler：HttpServerCodec()HTTP协议处理的处理器，其中包含了HttpRequestDecoder请求解密和HttpResponseEncoder请求加密
>
> 获取请求：msg.uri():
>
> 返回响应：new DefaultFullHttpResponse(msg.protocolVersion(), HttpResponseStatus.ok);得到一个response，可以对这个response设置headers或者contents。
>
> 将response写入到Channel。

### 2.4  自定义协议要素

- 魔数，用来在第一时间判定是否是无效数据包。
- 版本号，可以支持协议的升级。
- 序列化算法，消息正文到底采用哪种序列化算法，可以由此扩展，比如：JSON、protobuf、jdk等
- 指令类型，是登录、注册、单聊、群聊
- 请求序号，为了双工通信，提供异步能力。
- 正文长度
- 消息正文

#### 2.4.1  编解码器

```java
public class MessageCodec extends ByteToMessageCodec<Message> {

    /**
     * 出站前把自定义的转换成ByteBuf
     * @param ctx
     * @param msg
     * @param out
     * @throws Exception
     */
    @Override
    protected void encode(ChannelHandlerContext ctx, Message msg, ByteBuf out) throws Exception {
        // 4个字节的魔数
        out.writeBytes(new byte[]{1,2,3,4});
        // 版本：1个字节
        out.writeByte(1);
        // 序列化算法(此处为了简单，使用jdk作为序列化算法)(0:代表jdk，1:代表json)
        out.writeByte(0);
        // 字节的指令类型
        out.writeByte(msg.getMessageType());
        // 4个字节
        out.writeInt(msg.getSequenceId());
        // 为了对齐
        out.writeByte(0xff);
        // 消息正文
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        ObjectOutputStream oos = new ObjectOutputStream(bos);
        oos.writeObject(msg);
        byte[] bytes = bos.toByteArray();

        // 正文长度
        out.writeInt(bytes.length);

        // 写入内容
        out.writeBytes(bytes);
    }

    /**
     *
     * @param ctx
     * @param in
     * @param out
     * @throws Exception
     */
    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception {
		// 拿到魔数
        int magicNum = in.readInt();

        // 版本
        byte version = in.readByte();

        // 序列化类型
        byte serializerType = in.readByte();

        // 文本类型
        byte messageType = in.readByte();

        // 序号
        int sequenceId = in.readInt();

        in.readByte();

        // 消息大小
        int length = in.readInt();

        // 文本内容
        byte[] bytes = new byte[length];
        in.readBytes(bytes, 0, length);

        // 读取对象
        Message message = null;
        if (serializerType == 0) {
            ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(bytes));
            message = (Message) ois.readObject();
        }
        log.debug("{}, {}, {}, {}, {}, {}", magicNum, version, serializerType, messageType,sequenceId, length);
        log.debug("{}", message);
        out.add(message);
    }
}

```

启动类：

```java
@Slf4j
public class TestMessageCodec {
    public static void main(String[] args) {
        EmbeddedChannel channel = new EmbeddedChannel(
                new LoggingHandler(),
                new LengthFieldBasedFrameDecoder(
                        1024, 12, 4, 0, 0),
                new MessageCodec());

        // encode
        LoginRequestMessage loginRequestMessage = new LoginRequestMessage("zhangsan", "123456");
//        channel.writeOutbound(loginRequestMessage);

        // decode
        ByteBuf buf = ByteBufAllocator.DEFAULT.buffer();
        new MessageCodec().encode(null, loginRequestMessage, buf);

        // 切片
        ByteBuf s1 = buf.slice(0, 100);
        ByteBuf s2 = buf.slice(100, buf.readableBytes() - 100);

        s1.retain(); // 引用记数 + 1 = 2
        channel.writeInbound(s1);
        channel.writeInbound(s2);
    }
}
```

> 注意点：
>
> 为了模仿半包问题，我们将原有的ByteBuf拆分成两段，0-100，100-最后，在调用分片的方法slice()时，默认会调用release()方法，所以说我们调用retain()方法，为了增加引用记数，这样做是为了确保ByteBuf在处理过程中不会被释放，直到所有的处理都已经完成 。

结果：

![image-20231016135444917](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231016135444917.png)

#### 2.4.2  @Sharable注解

@Sharable注解主要是在确保线程安全的情况下使用。

- 当handler不保存状态时，就可以安全的被多线程共享。
- 但是要注意对于编解码器类，不可以继承ByteToMessageCodec或CombinedChannelDuplexHandler父类，因为这些类对于@Sharable有着明确的禁止，因为不确定这些类的子类是可以共享的。
- 如果可以保证Handler没有状态，可以继承MessageToMessageCodec父类。

ChatServer.java

```java
@Slf4j
public class ChatServer {
    public static void main(String[] args) {
        NioEventLoopGroup boss = new NioEventLoopGroup();
        NioEventLoopGroup worker = new NioEventLoopGroup();
        // 这个是全局共享的LoggingHandler，主要是因为有@Sharable注解，可以保证线程安全。
        LoggingHandler LOGGING_HANDLER = new LoggingHandler(LogLevel.DEBUG);
        // 这个是我们自定义的handler，经过校验，发现是可以共享的，原因是之前的消息已经经过了完整性校验，得到的消息是完整的。
        MessageCodec MESSAGE_CODEC = new MessageCodec();
        try {
            ServerBootstrap serverBootstrap = new ServerBootstrap();
            serverBootstrap.channel(NioServerSocketChannel.class);
            serverBootstrap.group(boss, worker);
            serverBootstrap.childHandler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) throws Exception {
                    ch.pipeline().addLast(new LengthFieldBasedFrameDecoder(
                            1024, 12, 4, 0, 0
                    ));
                    ch.pipeline().addLast(LOGGING_HANDLER);
                    ch.pipeline().addLast(MESSAGE_CODEC);
                }
            });
            ChannelFuture channelFuture = serverBootstrap.bind(9091).sync();
            channelFuture.channel().closeFuture().sync();
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            boss.shutdownGracefully();
            worker.shutdownGracefully();
        }
    }
}
```

启动会报错：

![image-20231016145737993](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231016145737993.png)

MessageCodecSharable.java

```java
@Slf4j
@ChannelHandler.Sharable
public class MessageCodecSharable extends MessageToMessageCodec<ByteBuf, Message> {
    @Override
    protected void encode(ChannelHandlerContext ctx, Message msg, List<Object> outList) throws Exception {
        ByteBuf out = ctx.alloc().buffer();
        // 4个字节的魔数
        out.writeBytes(new byte[]{1,2,3,4});
        // 版本：1个字节
        out.writeByte(1);
        // 序列化算法(此处为了简单，使用jdk作为序列化算法)(0:代表jdk，1:代表json)
        out.writeByte(0);
        // 字节的指令类型
        out.writeByte(msg.getMessageType());
        // 4个字节,请求序号，为了双工通信，提供了异步能力
        out.writeInt(msg.getSequenceId());
        // 为了对齐
        out.writeByte(0xff);
        // 消息正文
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        ObjectOutputStream oos = new ObjectOutputStream(bos);
        oos.writeObject(msg);
        byte[] bytes = bos.toByteArray();

        // 正文长度
        out.writeInt(bytes.length);

        // 写入内容
        out.writeBytes(bytes);
    }
    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception {
        // 拿到魔数
        int magicNum = in.readInt();
        // 版本
        byte version = in.readByte();
        // 序列化类型
        byte serializerType = in.readByte();
        // 文本类型
        byte messageType = in.readByte();
        // 序号
        int sequenceId = in.readInt();
        in.readByte();
        // 消息大小
        int length = in.readInt();
        // 文本内容
        byte[] bytes = new byte[length];
        in.readBytes(bytes, 0, length);
        // 读取对象
        Message message = null;
        if (serializerType == 0) {
            ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(bytes));
            message = (Message) ois.readObject();
        }
        log.debug("{}, {}, {}, {}, {}, {}", magicNum, version, serializerType, messageType,sequenceId, length);
        log.debug("{}", message);
        out.add(message);
    }
}

```

这个是允许@Sharable注解的，所以如果说是将ChatServer.java中的**MessageCodec MESSAGE_CODEC = new MessageCodec();**改成**MessageCodecSharable MESSAGE_CODEC = new MessageCodecSharable();**

运行结果：成功运行。

![image-20231016150456887](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231016150456887.png)

由于懒，就不结合实例了。现象出来就行了。

可以追一下原码：

![image-20231016150736655](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231016150736655.png)

![image-20231016150840298](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231016150840298.png)

![image-20231016150940336](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20231016150940336.png)

第一次一定是null，走到clazz.isAnnotationPresent()判断是否包含@Sharable注解包含的话，就将true添加到cache，以便于下一次进来的时候效率会更好。

### 2.5  聊天室Demo















