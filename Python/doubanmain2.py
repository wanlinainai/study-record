import time

import requests
from lxml import etree
import csv
import sys

from matplotlib.pyplot import title
from urllib3.filepost import writer

## 爬取豆瓣电影排行榜Top250存储到CSV文件中
doubanUrl = "https://movie.douban.com/top250?start={}&filter="

## 获取豆瓣资源
def getSource(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36",
        "Cookie": "bid=9okiaipjqN4; _pk_id.100001.4cf6=6df6219c4ac72128.1736906614.; _pk_ses.100001.4cf6=1; ap_v=0,6.0; __utma=30149280.908072594.1736906614.1736906614.1736906614.1; __utmb=30149280.0.10.1736906614; __utmc=30149280; __utmz=30149280.1736906614.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); __utma=223695111.1037950806.1736906614.1736906614.1736906614.1; __utmb=223695111.0.10.1736906614; __utmc=223695111; __utmz=223695111.1736906614.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); dbcl2=\"248025283:5OYpW68AkxM\"; ck=F2jh; push_noty_num=0; push_doumail_num=0; frodotk_db=\"d95386866e66d9778bfa93934b348c65\"; _vwo_uuid_v2=D22CB811C2AE8B654ACF06B40F058786F|de0666bfb1a66e3bad56f980bab44e5f"
    }
    response = requests.get(url, headers=headers)
    response.encoding = "utf-8"
    return response.text

# 获取到每一个具体的内容
def getEveryItem(source):
    html_element = etree.HTML(source)
    movieItemList = html_element.xpath('//div[@class="info"]')

    movieList = []
    for eachMoive in movieItemList:
        movieDict = {}
        title = eachMoive.xpath('div[@class="hd"]/a/span[@class="title"]/text()')  # 标题
        otherTitle = eachMoive.xpath('div[@class="hd"]/a/span[@class="other"]/text()') # 副标题
        link = eachMoive.xpath('div[@class="hd"]/a/@href')[0] # url
        star = eachMoive.xpath('div[@class="bd"]/div[@class="star"]/span[@class="rating_num"]/text()')[0] # 评分
        quote = eachMoive.xpath('div[@class="bd"]/p[@class="quote"]/span/text()') # 引言（名句）

        if quote:
            quote = quote[0]
        else:
            quote = ""

        # 保存数据
        movieDict['title'] = ''.join(title +otherTitle)
        movieDict['url'] = link
        movieDict['star'] = star
        movieDict['quote'] = quote

        movieList.append(movieDict)

    return movieList

# 保存数据
def writeData(movieList):
    with open('douban.csv', 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['title', 'star', 'quote', 'url'])

        writer.writeheader() # 写入表头

        for each in movieList:
            writer.writerow(each)

##打印控制台的进度条方法
def print_progress_bar(completed, total, length=50): # 此处的length指的是进度条长度
    progress = int(length * completed / total)
    bar = '[' + '=' * progress + '-' * (length - progress) + ']'
    percent = round(100.0 * completed / total, 1)
    sys.stdout.write(f'\r{bar} {percent}%')
    sys.stdout.flush()

if __name__ == '__main__':
    movieList = []
    # 一共有10页
    progress = 0
    for i in range(10):
        pageLink = doubanUrl.format(i * 25)

        source = getSource(pageLink)

        movieList += getEveryItem(source)

        progress += 1
        time.sleep(0.1)
        print_progress_bar(progress, 250)

    writeData(movieList)