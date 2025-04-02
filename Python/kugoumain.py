import requests
from bs4 import BeautifulSoup
import time

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36"
}

## 获取网站的信息
def get_info(url):
    web_data = requests.get(url, headers=headers) # 发送网络请求，获取HTML信息
    soup = BeautifulSoup(web_data.text, 'lxml')

    # 通过CSS选择器定位到需要的信息
    ranks = soup.select('span.pc_temp_num')
    titles = soup.select('div.pc_temp_songlist > ul > li > a')
    singers = soup.select('div.pc_temp_songlist > ul > li > a > span')
    times = soup.select('span.pc_temp_tips_r > span')

    for rank, title,singer, time in zip(ranks, titles, singers, times):
        data = {
            "rank": rank.get_text().strip(),
            "song": title.get_text().replace("\n", "").replace("\t", "").split('-')[0],
            "singer": singer.get_text().replace("\n", "").replace("\t", "").split('-')[1].strip(),
            "time": time.get_text().strip()
        }
        print(data)

if __name__ == '__main__':
    # 定义一下需要访问的url
    urls = ["https://www.kugou.com/yy/rank/home/{}-8888.html".format(str(i)) for i in range(1, 24)] # 为什么要设置到1-23呢？原因是酷狗网站只有到23页的数据
    for url in urls:
        get_info(url)
        time.sleep(0.2)