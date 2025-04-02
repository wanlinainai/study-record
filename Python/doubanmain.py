from bs4 import BeautifulSoup
import re  # 正则表达式，进行文字匹配
import urllib.request, urllib.error  # 指定URL，获取网页数据
import xlwt  # 进行excel操作
import time
import sys


def main():
    baseurl = "https://movie.douban.com/top250?start="
    datalist = getdata(baseurl)
    savepath = ".\\豆瓣电影top250.xls"
    savedata(datalist, savepath)


# compile返回的是匹配到的模式对象
findLink = re.compile(r'<a href="(.*?)">')  # 正则表达式模式的匹配，影片详情
findImgSrc = re.compile(r'<img.*src="(.*?)"', re.S)  # re.S让换行符包含在字符中,图片信息
findTitle = re.compile(r'<span class="title">(.*)</span>')  # 影片片名
findRating = re.compile(r'<span class="rating_num" property="v:average">(.*)</span>')  # 找到评分
findJudge = re.compile(r'<span>(\d*)人评价</span>')  # 找到评价人数 #\d表示数字
findInq = re.compile(r'<span class="inq">(.*)</span>')  # 找到概况
findBd = re.compile(r'<p class="">(.*?)</p>', re.S)  # 找到影片的相关内容，如导演，演员等


##打印控制台的进度条方法
def print_progress_bar(completed, total, length=50): # 此处的length指的是进度条长度
    progress = int(length * completed / total)
    bar = '[' + '=' * progress + '-' * (length - progress) + ']'
    percent = round(100.0 * completed / total, 1)
    sys.stdout.write(f'\r{bar} {percent}%')
    sys.stdout.flush()

##获取网页数据
def getdata(baseurl):
    datalist = []
    progress = 0
    for i in range(0, 10):
        url = baseurl + str(i * 25)  ##豆瓣页面上一共有十页信息，一页爬取完成后继续下一页
        html = geturl(url)
        soup = BeautifulSoup(html, "html.parser")  # 构建了一个BeautifulSoup类型的对象soup，是解析html的
        for item in soup.find_all("div", class_='item'):  ##find_all返回的是一个列表
            progress += 1
            # 输出一个展示了多少的进度的
            time.sleep(1)
            print_progress_bar(progress, 250)

            data = []  # 保存HTML中一部电影的所有信息
            item = str(item)  ##需要先转换为字符串findall才能进行搜索
            link = re.findall(findLink, item)[0]  ##findall返回的是列表，索引只将值赋值
            data.append(link)

            imgSrc = re.findall(findImgSrc, item)[0]
            data.append(imgSrc)

            titles = re.findall(findTitle, item)  ##有的影片只有一个中文名，有的有中文和英文
            if (len(titles) == 2):
                onetitle = titles[0]
                data.append(onetitle)
                twotitle = titles[1].replace("/", "")  # 去掉无关的符号
                data.append(twotitle)
            else:
                data.append(titles)
                data.append(" ")  ##将下一个值空出来

            rating = re.findall(findRating, item)[0]  # 添加评分
            data.append(rating)

            judgeNum = re.findall(findJudge, item)[0]  # 添加评价人数
            data.append(judgeNum)

            inq = re.findall(findInq, item)  # 添加概述
            if len(inq) != 0:
                inq = inq[0].replace("。", "")
                data.append(inq)
            else:
                data.append(" ")

            bd = re.findall(findBd, item)[0]
            bd = re.sub('<br(\s+)?/>(\s+)?', " ", bd)
            bd = re.sub('/', " ", bd)
            data.append(bd.strip())  # 去掉前后的空格
            datalist.append(data)
    return datalist


##保存数据
def savedata(datalist, savepath):
    workbook = xlwt.Workbook(encoding="utf-8", style_compression=0)  ##style_compression=0不压缩
    worksheet = workbook.add_sheet("豆瓣电影top250", cell_overwrite_ok=True)  # cell_overwrite_ok=True再次写入数据覆盖
    column = ("电影详情链接", "图片链接", "影片中文名", "影片外国名", "评分", "评价数", "概况", "相关信息")  ##execl项目栏
    for i in range(0, 8):
        worksheet.write(0, i, column[i])  # 将column[i]的内容保存在第0行，第i列
    for i in range(0, 250):
        data = datalist[i]
        for j in range(0, 8):
            worksheet.write(i + 1, j, data[j])
    workbook.save(savepath)


##爬取网页
def geturl(url):
    head = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36"
    }
    req = urllib.request.Request(url, headers=head)
    try:  ##异常检测
        response = urllib.request.urlopen(req)
        html = response.read().decode("utf-8")
    except urllib.error.URLError as e:
        if hasattr(e, "code"):  ##如果错误中有这个属性的话
            print(e.code)
        if hasattr(e, "reason"):
            print(e.reason)
    return html


if __name__ == '__main__':
    main()
    print("爬取成功！！！")