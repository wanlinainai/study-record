import Mock from 'mockjs'

let List = []

export default {
  getStatisticalData: () => {
    for (let i = 0; i < 7; i++) {
      List.push(
        Mock.mock({
          IPhone: Mock.Random.float(100, 8000, 0, 0),
          vivo: Mock.Random.float(100, 8000, 0, 0),
          oppo: Mock.Random.float(100, 8000, 0, 0),
          huawei: Mock.Random.float(100, 8000, 0, 0),
          xiaomi: Mock.Random.float(100, 8000, 0, 0),
          Samsung: Mock.Random.float(100, 8000, 0, 0)
        })
      )
    }
    return {
      code: 20000,
      data: {
        videoData: [{
          name: '小米',
          value: 2999
        }, {
          name: 'vivo',
          value: 2999
        }, {
          name: 'oppo',
          value: 2999
        }, {
          name: 'huawei',
          value: 2999
        }, {
          name: 'Samsung',
          value: 2999
        }, {
          name: 'IPhone',
          value: 2999
        }
        ],
        userData: [
          {
            date: '周一',
            new: 5,
            active: 200
          },
          {
            date: '周二',
            new: 10,
            active: 450
          },
          {
            date: '周三',
            new: 15,
            active: 300
          },
          {
            date: '周四',
            new: 20,
            active: 550
          },
          {
            date: '周五',
            new: 25,
            active: 400
          },
          {
            date: '周六',
            new: 30,
            active: 650
          },
          {
            date: '周日',
            new: 35,
            active: 550
          }
        ],
        orderData: {
          date: ['20191001', '20191002', '20191003', '20191004', '20191005', '20191006', '20191007'],
          data: List
        },
        tableData: [
          {
            name: 'oppo',
            todayBuy: 500,
            monthBuy: 3500,
            totalBuy: 29000
          },
          {
            name: 'vivo',
            todayBuy: 500,
            monthBuy: 2500,
            totalBuy: 99000
          },
          {
            name: 'huawei',
            todayBuy: 500,
            monthBuy: 3500,
            totalBuy: 77000
          },
          {
            name: 'IPhone',
            todayBuy: 500,
            monthBuy: 3500,
            totalBuy: 99000
          },
          {
            name: 'Samsung',
            todayBuy: 500,
            monthBuy: 3500,
            totalBuy: 9000
          },
          {
            name: 'Xiaomi',
            todayBuy: 500,
            monthBuy: 3500,
            totalBuy: 29000
          },
          {
            name: 'Honor',
            todayBuy: 500,
            monthBuy: 3500,
            totalBuy: 29000
          },
          {
            name: 'Realme',
            todayBuy: 500,
            monthBuy: 3500,
            totalBuy: 29000
          }
        ]
      }
    }
  }
}