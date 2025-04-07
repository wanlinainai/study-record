# Ethers

此文档是基于WTF的官方文档进行学习记录的，文档原文：https://www.wtf.academy/zh/course/ethers101/HelloVitalik。

## Provider提供器

这一讲，我们主要介绍ether.js中的`Provider`类。

一开始，需要介绍一下创建Provider的步骤：

```javascript
const ALCHEMY_MAINNET_URL = "https://rpc.ankr.com/eth";
const ALCHEMY_SEPOLIA_URL = "https://rpc.sepolia.org";

const providerETH = new ethers.JsonRpcProvider();
const providerSepolia = new ethers.JsonRpcProvider();
```

#### Provider封装的方法

##### `getBalance()`

这个API是用于读取ETH余额的（测试网不支持`ENS`域名，只能用钱包地址进行查询）。

```javascript
  const ALCHEMY_MAINNET_URL = 'https://rpc.ankr.com/eth';
  const ALCHEMY_SEPOLIA_URL = 'https://sepolia.infura.io/v3/672d4c08be774a33b22f6b4f70097517';
  const providerETH = new ethers.JsonRpcProvider(ALCHEMY_MAINNET_URL);
  const providerSEPOLIA = new ethers.JsonRpcProvider(ALCHEMY_SEPOLIA_URL);

  const balance = await providerETH.getBalance(`vitalik.eth`);
  const balanceSepolia = await providerSEPOLIA.getBalance(`0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`);
  console.log(`ETH Balance: ${ethers.formatEther(balance)}`);
  console.log(`SEPOLIA Balance: ${ethers.formatEther(balanceSepolia)}`);
```

##### `getNetwork()`

利用`getNetwork`查询provider连接到了哪一条链。

```javascript
const network = await providerETH.getNetwork();
console.log(network.toJSON());
```

##### getBlockNumber()

利用`getBlockNumber()`函数查询当前区块长度。

```javascript
const blockNumber = await providerSEPOLIA.getBlockNumber();
  console.log(`BlockNumber is:${blockNumber}`);
```

##### getTransactionCount()

查询某一个地址的交易数量。

```javascript
  const txCount = await providerSEPOLIA.getTransactionCount(`0xb5579b0Bc29730EA9109Cc9C63247B968F0CAc72`);
  console.log(`Tx count is: ${txCount}`);
```

##### getFeeData()

查询当前建议的gas设置，返回的格式是bigint.

```javascript
  const feeData = await providerSEPOLIA.getFeeData();
  console.log(feeData);
```

##### getBlock()

查询区块信息，参数是要查询的区块高度。

```javascript
  const block = await providerSEPOLIA.getBlock(8071398);
  console.log(block);
```

##### getCode()

查询某一个地址的bytecode，参数是合约地址，如果是钱包地址的话返回的是:0x.

```javascript
  const walletCode = await providerSEPOLIA.getCode("0xb5579b0Bc29730EA9109Cc9C63247B968F0CAc72");
  const contractCode = await providerSEPOLIA.getCode("0xc778417e063141139fce010982780140aa0cd5ab");
  console.log('钱包使用的code是:', walletCode);
  console.log('合约使用的code是:', contractCode);
```

> 一般用于：
>
> 1. 判断某个地址是否是合约地址。
> 2. 部署之前验证地址的状态（安全检查）。





























