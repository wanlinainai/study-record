# Quartz定时任务

## 小顶堆

### 插入堆元素

### 删除堆顶元素

## 时间轮算法

在删除堆顶元素时候由于需要进行对比，所以说数据下沉和上浮其实都是满耗费性能的，其实这种的话只是适合少量的数据，但是如果数据量过大，其实小顶堆就不太合适了。

#### 链表或者数组实现时间轮

## Timer

TaskQueue：小顶堆，存放timeTask。

TimerThread：任务执行线程。有一个死循环不断检查是否有任务需要开始执行，有就执行他。注意这只是个单线程。

由于是单线程，任务之间可能存在阻塞：

- schedule：任务执行超时，会导致后面的任务往后推移，
- scheduleAtFixedRate：任务超时可能导致下一个任务就会马上执行。

运行时异常会导致Timer线程终止。

任务调度是基于绝对时间的 ，对系统时间敏感。

```java
public class TimerTest {
    public static void main(String[] args) {
        Timer timer = new Timer();
        for (int i = 0; i < 2; i++) {
            TimerTask task = new FooTimeTask("foo" + i);
            //添加任务
            timer.schedule(task, new Date(), 2000);
        }
    }
}


class FooTimeTask extends TimerTask {
    private String name;

    public FooTimeTask() {
    }

    public FooTimeTask(String name) {
        this.name = name;
    }

    @Override
    public void run() {
        try {
            System.out.println("name = " + name + "startTime = " + new Date());
            Thread.sleep(3000);
            System.out.println("name = " + name + "endTime = " + new Date());
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }
}
```

- schedule()结果：

![image-20230914094623847](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230914094623847.png)

一直是：00-->11，然后是00-->11。很明显是依次执行，但是由于run 方法中执行时间是3秒，而添加任务执行时间是2秒，所以说会将之后应该执行的任务往后推迟。

- scheduleAtFixedRate()结果：

![image-20230914095204442](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230914095204442.png)

由于run方法时间占用，那么我们添加任务的执行时间小于run方法执行时间，会吞掉某一些没有执行的任务，这也就是foo1会连续四次执行的原因，foo1提前执行了。

## Quartz

### 基本使用

**QuartzTest.java**

```java
public class QuartzTest {
    public static void main(String[] args) {

        int count = 0;

        JobDetail jobDetail = JobBuilder.newJob(MyJob.class)
                .withIdentity("job1", "group1")
                .usingJobData("job", "jobDetail")
                .usingJobData("count", count)
                .build();

        Trigger trigger = TriggerBuilder.newTrigger()
                .withIdentity("trigger1", "trigger1")
                .usingJobData("trigger", "trigger")
                .startNow()
                .withSchedule(SimpleScheduleBuilder.simpleSchedule().withIntervalInSeconds(1).
                        repeatForever())
                .build();

        try {
            Scheduler scheduler = StdSchedulerFactory.getDefaultScheduler();
            scheduler.scheduleJob(jobDetail, trigger);
            scheduler.start();
        } catch (SchedulerException e) {
            throw new RuntimeException(e);
        }
    }
}

```

需要一个Job和一个触发器，设置触发器为每秒执行一次，监听者每一个Job的开始情况。

**MyJob.java**

```java
public class MyJob implements Job{
    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
    	JobDataMap jobDetail = context.getJobDetail().getJobDataMap();   
        JobDataMap triggerMap = context.getTrigger().getJobDataMap();
		//获取jobDataMap和TriggerMap两个中的值，如果trigger中的key同时存在于JobDataMap中，那么会覆盖掉JobDataMap中的数			据
        JobDataMap mergeMap = context.getMergedJobDataMap();
        
        //根据JobDataMap的Key来得到Value
        System.out.println("jobDetailMap:" + jobDetail.getString("job"));
        System.out.println("triggerMap:" + triggerMap.getString("trigger"));
        System.out.println("mergeMap:" + mergeMap.getString("trigger"));
    }
}
```

可以从QuartzTest中获取到Job的数据和Trigger中的数据。可以达到定时任务的目的。

![image-20230914113323195](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230914113323195.png)

```java
public class MyJob implements Job {

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        //每一个实例都是不同的，允许并发执行
        System.out.println("jobDetail:" + System.identityHashCode(context.getJobDetail()));
        System.out.println("job:" + System.identityHashCode(context.getJobInstance()));
    }
}
```

每一次的jobDetail和job都是不同的实例，说明了Quartz是通过创建不同的实例来支持多线程的。

但是这样的话就有一个问题：我们创建的Job任务是分成不同的部分，每个任务都是通过自己的部分进行修改，根本就不连贯。

所以说，@DisallowConcurrentExecution注解的作用就显现了，一个一个执行，如果你设置了任务中的执行时间是3秒，但是触发器的扫描时间是2秒，那么会等待任务中的时间执行完成之后才会执行下一个任务。

如果我要实现一个累加器的功能，记录每一个任务的个数，那么正常的情况下因为是不同的实例，那么jobDataMap也是不同的，所以会一直是1，如果加上@PersistJobDataAfterExecution注解之后就可以实现累加的功能。

**MyJob.java**

```java
@DisallowConcurrentExecution
//如果一个任务不是持久化的，则当没有触发器关联的时候，Quartz就会从scheduler中删除它
@PersistJobDataAfterExecution
public class MyJob implements Job {

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        JobDataMap jobDetailMap = context.getJobDetail().getJobDataMap();
        JobDataMap triggerMap = context.getTrigger().getJobDataMap();
        JobDataMap mergeMap = context.getMergedJobDataMap();

        System.out.println("jobDetailMap:" + jobDetailMap.getString("job"));
        System.out.println("triggerMap:" + triggerMap.getString("trigger"));
        System.out.println("mergeMap:" + mergeMap.getString("trigger"));

        //每一个实例都是不同的，允许并发执行
        System.out.println("jobDetail:" + System.identityHashCode(context.getJobDetail()));
        System.out.println("job:" + System.identityHashCode(context.getJobInstance()));

        System.out.println("Now:  " + new Date());
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }

        JobDataMap jobDataMap = context.getJobDetail().getJobDataMap();
        jobDataMap.put("count", jobDataMap.getInt("count") + 1);
        System.out.println("trigger count:" + jobDataMap.getInt("count"));
    }
}
```

### 触发器

优先级：

- 同时触发的trigger之间才会比较优先级
- 如果trigger是可恢复的，在恢复后在调度时，优先级不变

错过触发：

- 判断misfire的条件
  - job达到触发时间没有被执行
  - 被执行的延迟时间超过了Quartz配置的misfireThrehold阈值
- 产生原因
  - 当job到达触发时间时，所有的线程都被其他job占用，没有可用线程
  - 在job需要触发的时间点，scheduler意外停止了
  - job使用了@DisallowConcurrentExecution注解，job并不能并发执行，当达到了下一个时间点，上一个任务没有完成
  - job指定了过去的开始执行时间
- 策略
  - 默认使用MISFIRE_INSTRUCTION_SMART_POUCY策略
  - SimpleTrigger
  - CronTrigger
- calendar：用于排除时间段
- simpleTrigger：具体时间点，指定间隔重复执行
- CronTrigger：cron表达式

### Scheduler调度器，基于trigger的设定执行job









![image-20230914140613333](C:\Users\admin\AppData\Roaming\Typora\typora-user-images\image-20230914140613333.png)

















