# 区块链、智能合约、全栈web3开发

课程来自油管大神freeCodeCamp.org。链接：https://www.youtube.com/@freecodecamp

OK, we must go learning. 学习这一门课程的时候，在一开始这位老师就说过学习不是一个一蹴而就的过程，一定要注意休息。劳逸结合才能达到最终的理想效果。你可以学习一周、一个月、甚至是一年，都是可以的。不要一口气吃个胖子！不要一口气吃个胖子！不要一口气吃个胖子。

## 区块链基础

### web3

web3是一种观点，指的是以区块链和智能合约为基础的下一代网络，虽然目前在国内并不流行，并且在以后得很长一段时间内应该都不会流行。

web1 ：The permissionless open sourced web with static content.

web2: The permission web with dynamic content.Where companies run you agreements on their servers.

### 智能合约

智能合约创建了信任最小化协议。另外，它也提升了性能、透明度、和很多其他的方面。

#### 智能合约的作用

我们可以把智能合约理解成承诺。当你要给车子加油的时候，他们会承诺给你加满油，当然，不一定是加满，绝大多数是要加你给的money所对应的油量；当你存钱进银行的时候，他们保证你的钱是安全的。

很早之前的麦当劳有一个活动，会给买麦当劳的人一个抽奖的机会，得到100万美元，这是一个承诺，但是这个承诺最终使一定不会被兑现的，因为整个游戏已经被幕后人员操纵了，你抽奖获得的概率是0，但是在区块链中，这一现象是不可能存在的，原因是智能合约是一个不可更改、去中心化的和透明的。打造这一个智能合约的作用就是将传统的管理员权限给去掉，同时为了避免现实生活中某一些股票突然退市了，所以不可改变性就是体现在这方面的。

#### 区块链的其他优势

1. Decentralized:是去中心化的，且没有中心化的媒介。一个区块链由不同的参与者运行，这一些参与者被称为节点运营者。
2. Transparency && Flexibility: 透明性和灵活性。在一个去中心化的链中，所有人的程序都是运行在这一个应用程序上，所有人得到的结果是完全相同的，当然，这个相同指的不是数据完全相同。
3. Speed && Efficiency：速度和效率。
4. Security && Immutability：安全不可改变。

#### MetaMask钱包

准备好一个钱包，我们使用MetaMask钱包，创建一个测试的账户，需要提前设置好测试环境。

![image-20241027163511661](images/区块链、智能合约、全栈web3开发/image-20241027163511661.png)

我们在![image-20241027163559923](images/区块链、智能合约、全栈web3开发/image-20241027163559923.png)

使用测试网络。由于这些网络的更新迭代速度太快了，所以我们使用的测试网络和Teacher的不一样，不要担心，都是一样，可以去看老师的GitHub地址，已经给列出了目前主流的网络以及水龙头地址，这个水龙头地址是在主网中不存在的。https://github.com/smartcontractkit/full-blockchain-solidity-course-js?tab=readme-ov-file

这是水龙头的地址：https://faucets.chain.link/。

我们选择Ethereum Sepolia的水龙头，给我们自己的钱包发送代币。

查看钱包：![image-20241027163949730](images/区块链、智能合约、全栈web3开发/image-20241027163949730.png)

注意我使用的是Account 2，不是主要的账户，我主账户中还有泰达币的，是可以进行交易的。所以选择一个测试的账户，不要选择主账户，除非你的主账户没有任何代币，那无所谓了。

我们可以在：https://sepolia.etherscan.io/address/0x35e200c1E72eb0f1c2b5D84353C2f12fDB9437f0查看个人的代币流水情况。

![image-20241027164204361](images/区块链、智能合约、全栈web3开发/image-20241027164204361.png)

这就是我们领取的水龙头代币，非常好，价值0.1Ether。

#### gas介绍

有两个概念，一个是Transaction Fee , 另一个是Gas Fee。

区块链式被不同的节点执行的，不同的节点执行区块链，是因为他们可以通过区块链上的交易获得收入。当你创建一个交易的时候，有一部分人就会被支付一小部分的以太坊，或者是其他代币。显然，这一部分费用就是激励矿工的，他们的收入是由Gas使用量来决定的。

我们来发生一次交易。我们再次创建一个账户，名称是Account 3，我们在Account 2 向Account 3发送0.05ETH的代币，看看会发生什么。

![image-20241027170328844](images/区块链、智能合约、全栈web3开发/image-20241027170328844.png)

会有一定的费用，并且这个费用还会随着时间变化而变化，发送成功之后查看：https://sepolia.etherscan.io/tx/0x1fabe66a9ef5f119d32e9abfa43e971dff589dc839564dfb607516b5f5b9e3ed。

![image-20241027170507868](images/区块链、智能合约、全栈web3开发/image-20241027170507868.png)

可以看到，产生的交易费是：0**.**000041014552383ETH。这就是给矿工的费用。Gas费用会随着计算资源的消耗增大而增大。我们消耗的是1**.**953073923Gwei。

### 区块链原理（目前先看油管大神的，之后看看肖臻老师的）





#### public/private keys & Signing

private key需要自己进行存储。这是我们加密需要的唯一一个保证安全的钥匙。

public key可以对全球进行公开。

##### 签名

我们在进行一笔交易的时候，如何判断这一笔交易是合法的呢？就是发送者通过私钥进行加密，得到一个签名。接受者通过公钥验证这个签名的合法性。其中是有一定的算法的，不过不做过多的阐述。

### 区块链概念知识

























## ethers.js

### 安装环境

我们暂时用的是比较老的hardhat，但是不慌，基础不牢，地动山摇。

vscode中将`solidity`的扩展装上。![image-20250401235210921](images/区块链、智能合约、全栈web3开发/image-20250401235210921.png)

之后初始化demo项目。

使用yarn安装对应版本的依赖：

![image-20250401235308854](images/区块链、智能合约、全栈web3开发/image-20250401235308854.png)

这个编译的命令太长，所以直接使用yarn compile统一处理。

```shell
yarn solcjs --bin --abi --include-path node_modules --base-path . -o . SimpleStorage.sol
```

### 项目开发

先写一个sol文件。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract SimpleStorage {
    uint256 favoriteNumber;

    struct People {
        uint256 favoriteNumber;
        string name;
    }

    People[] public people;

    mapping(string => uint256) public nameToFavoriteNumber;

    constructor() {}

    function store(uint256 _favoriteNumber) public {
        favoriteNumber = _favoriteNumber;
    }

    function retrieve() public view returns (uint256) {
        return favoriteNumber;
    }

    function addPerson(string memory _name, uint256 _favoriteNumber) public {
        people.push(People(_favoriteNumber, _name));
        nameToFavoriteNumber[_name] = _favoriteNumber;
    }
}
```

> 注意，这个版本用的是0.8.7以上，如果是0.8.8的话会报错，所以要保持一致。

执行`yarn compile`。之后会生成两个文件：`**.abi`和`**.bin`。

> 解释一下`abi`和`bin`文件：
>
> 

我们使用的是node作为后端语言。暂时还没有学习过。之后会进行学习。

我们在进行ether.js编码之前先将Ganache环境装好。链接：https://archive.trufflesuite.com/ganache/。

安装好直接start即可。

页面如图所示：

![image-20250402000036301](images/区块链、智能合约、全栈web3开发/image-20250402000036301.png)

接下来直接写代码，具体的作用我会在代码注释中进行阐述。

**deploy.js**

```javascript
const ethers = require("ethers");
const fs = require("fs-extra");

async function main() {
  // 首先创建一个provider,其中的Rpc调用的地址是ganache中的地址。可以查看
  const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");
  // create a wallet ,其中第一个是私钥，第二个参数是provider
  const wallet = new ethers.Wallet("0x74b69e3ce5f8e22de97682fe1a6a94eefda7e80255cba739e47aae786db597b3", provider);
	// 拿到abi 和 binary
  const abi = fs.readFileSync("./SimpleStorage_sol_SimpleStorage.sol", "utf8");
  const binary = fs.readFileSync("./SimpleStorage_sol_SimpleStorage.sol", "utf8");
  
  // 创建合约工厂
  const contractFactory = new ethers.ContractFactory(abi, binary, wallet);
  console.log("Deploying, please wait....");
  
  const contract = await contractFactory.deploy();
  // 等待一个区块
  const trasctionReceipt = await contract.deployTransaction.wait(1);
  await contract.deployTracsaction.wait(1);
  
  console.log("Let's deploy with only tracsaction data...");
  
  // 我们使用ethers直接生成的nonce
  const nonce = await wallet.getTransaction();
  const tx = {
    nonce: nonce,
    gasPrice: 20000000000,
    gasLimit: 1000000,
    value: 0,
    to: null,
    data: "0x....",
    chainId: 1337
  }
  
  // 我们还需要将这个交易进行签名，这是很重要的，也是必要的。
  const signedTxResponse = await wallet.signTransaction(tx);// 但是如果只是签名的话是没有交易记录的，因为没有发生交易
  const sendTxResponse = await wallet.sendTransaction(tx);
  await sendTxResponse.wait(1);
  console.log(sendTxResponse);
  
  // 调用我们之前部署的sol合约函数
  // 我们之前编译的合约是在bin文件中，其中已经包含了各个函数
  const defaultFaoriteNumber = await contract.retrieve();
  console.log(`Current Favorite Number:${defaultFavoriteNumber.toString()}`);
  
  const transactionFavoriteNumber = await contract.store("55"); // 此处是设置变量
  const transactionReceipt = await transactionFavoriteNumber.wait(1);
  const updatedFavoriteNumber = await contract.retrieve();
  console.log(`Updated favorite number is:${updatedFavoriteNumber.toString()}`);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
  console.error(error);
  process.exit(1);
	})
```

执行：`node deploy.js`

之后去Ganache看一下交易数量，交易信息。发现很明显的增加了，也增加了交易的数量。

#### 部署一个线上的合约

之前我们使用的都是一些本地的地址，私钥，我们想在链上区块链上看到我们真正的交易信息。

本来按照教程的话使用的是alchemy的，但是我的邮箱有数字注册不了，只能用全是英文的邮箱注册，之前买的Gmail都被封禁了，导致很难受，我们决定使用：infura。也可以用。

![image-20250402234838529](images/区块链、智能合约、全栈web3开发/image-20250402234838529.png)

我们要使用的是sepolia测试网，所以我们切换到`Infura RPC`中。在ETH中只选中Sepolia。就会筛选一部分，之后在`Active Endpoints`中复制当前的https的rpc地址。

![image-20250402235300796](images/区块链、智能合约、全栈web3开发/image-20250402235300796.png)

上边的是API。

由于我们之前是将私钥、URL啥的比较隐私的内容直接放在了代码中，不合适。所以我们需要将这些内容进行分离处理。项目中正好有一个文件用于处理这种敏感的数据：.env文件

```env
PRIVATE_KEY=65552a1f8b739bbdf9223fd4214a332d16b1abjsdhfjsdgiuu77sdn8cc4c3f20f
RPC_URL=https://sepolia.infura.io/v3/672d4c08be774a33b22f6b4f70097517
```

正常项目中肯定需要对这个文件做处理的，要不还是存在泄露的风险，不过我们在这个教程中不做修改了。明文使用吧。

接下来就是将原本直接写在代码中的内容进行替换，

```javascript
const ethers = require("ethers");
const fs = require("fs-extra");
require("dotenv").config();
async function main() {
  // http://127.0.0.1:7545
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  // create a wallet
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const abi = fs.readFileSync("./SimpleStorage_sol_SimpleStorage.abi", "utf8");
  const binary = fs.readFileSync("./SimpleStorage_sol_SimpleStorage.bin", "utf8");

  const contractFactory = new ethers.ContractFactory(abi, binary, wallet);
  console.log("Deploying, please wait...");

  const contract = await contractFactory.deploy(); // Stop here! Wait for contract to deploy
  // const trasactionReceipt = await contract.deployTransaction.wait(1);
  await contract.deployTransaction.wait(1);
  console.log(`Contract deployed to: ${contract.address}`);

  // console.log("Let's deploy with only transaction data!");
  // We can use wallet.getTrabsactionCount() to get the nonce.
  const nonce = await wallet.getTransactionCount();
  const tx = {
    nonce: nonce,
    gasPrice: 20000000000,
    gasLimit: 1000000,
    to: null,
    value: 0,
    data: "0xxxxxxx",
    chainId: 1337
  }
  // We need sign to this transaction. But it's a not send transaction, so we can't see this transaction in the blockchain.
  // const signedTxResponse = await wallet.signTransaction(tx);
  // const sendTxResponse = await wallet.sendTransaction(tx);
  // We must wait for the transaction to be mined
  // await sendTxResponse.wait(1);
  // console.log(sendTxResponse);

  const defaultFavoriteNumber = await contract.retrieve();
  console.log(`Current Favorite Number: ${defaultFavoriteNumber.toString()}`);

  const transactionFavoriteNumber = await contract.store("55");
  const transactionReceipt = await transactionFavoriteNumber.wait(1);
  const updatedFavoriteNumber = await contract.retrieve();
  console.log(`Contract udpated favorite number: ${updatedFavoriteNumber.toString()}`);
}

main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
```

部署这个合约：node deploy.js。去区块浏览器上看看：

![image-20250403000122826](images/区块链、智能合约、全栈web3开发/image-20250403000122826.png)

很好，可以看到有两个Method，一个是contractFactory.deploy()函数执行后的得到的，另一个是调用Store函数的结果。

成功了，bitch!!!!

> Tips:token 
>
> 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

## HardHat

### 环境配置

详情见：https://hardhat.org/tutorial/setting-up-the-environment

我们已经安装过了，这一步直接跳过。

### 创建一个新的hardhat项目

```shell
yarn add --save-dev hardhat

# 初始化
yarn hardhat init
```

```shell
888    888                      888 888               888
888    888                      888 888               888
888    888                      888 888               888
8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
888    888 .d888888 888    888  888 888  888 .d888888 888
888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888

👷 Welcome to Hardhat v2.22.19 👷‍

? What do you want to do? …
  Create a JavaScript project
  Create a TypeScript project
  Create a TypeScript project (with Viem)
❯ Create an empty hardhat.config.js
  Quit
```

选择JavaScript project。

详情继续见网址：https://hardhat.org/tutorial/creating-a-new-hardhat-project

### Contract

将之前的`SimpleStorage.sol`文件搬到文件夹的`contracts`中。

```solidity
// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.8;

contract SimpleStorage {
    uint256 public favoriteNumber;

    struct People {
        uint256 favoriteNumber;
        string name;
    }

    People[] public people;

    mapping (string => uint256) public nameToFavoriteNumber;

    function store(uint256 _favoruteNumber) public {
        favoriteNumber = _favoruteNumber;
    }

    function retrieve() public view returns(uint256) {
        return favoriteNumber;
    }

    function addPerson(string memory _name, uint256 _favoriteNumber) public {
        people.push(People(_favoriteNumber, _name));
        nameToFavoriteNumber[_name] = _favoriteNumber;
    }
}
```

### 配置deploy.js文件

还是之前的内容，但是我们使用的是hardhat的内置函数，详情见代码吧

```javascript
// imports
const { ethers } = require("hardhat");
// async main function
async function main() { 
  const SimpleStorgaeFactory = await ethers.getContractFactory("SimpleStorage")
  console.log("Deploying contract...");
  const simpleStorage = await SimpleStorgaeFactory.deploy();
  await simpleStorage.waitForDeployment();

  // getAddress
  const address = await simpleStorage.getAddress();
  console.log(`Deployed contract to: ${address}`);
  
  
}
// main
main().then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
```

本身还有一个验证的内容，不过由于API Key，sepolia好像没有。先不搞了。

### hardhat配置文件

这个配置文件中的内容主要是配置使用的network、Solidity版本、默认Network。还有一些比较私密的密码、URL一类的。

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("./Tasks/block-number")


const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  // defaultNetwork: "sepolia",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111
    }
  },
  solidity: "0.8.8",
};
```

> 上述的内容解释：
>
> defaultNetwork指的是默认的网络，默认的是"hardhat"，当然可以换成sepolia测试网。
>
> networks可以用来设置具体的网络数组，之后在命令行中可以使用命令指定这个网络地址。
>
> solidity值的是使用的Solidity版本，我们使用的是0.8.8，是为了和视频中的保持一致。

### Test测试

在test文件夹中写一些Solidity的测试代码，写这个测试的内容本身分成两个门派：直接使用Solidity、使用JavaScript来进行模拟合约交互。此处使用的是JavaScript合约模拟交互。

先讲一下要点：其中分成beforeEach()函数和it()函数，before函数是用来进行真正测试功能之前的初始化一类的功能。it()函数就是具体的测试内容。

来代码吧。

```javascript
const { ethers } = require("hardhat")
const { assert } = require("chai");


describe("SimpleStorage", () => {
  let simpleStorageFactory, simpleStorage;
  beforeEach(async function () {
    // get contract factory
    simpleStorageFactory = await ethers.getContractFactory("SimpleStorage");
    // deploy contract 
    simpleStorage = await simpleStorageFactory.deploy();
  });

  it("Should start with a favorite number of 0", async function () {
    const currentValue = await simpleStorage.retrieve();
    const expectValue = "0";

    assert.equal(currentValue.toString(), expectValue);
  });
  // update
  it.only("Should update when we call store", async function () {
    const expectedValue = "7";
    const updateValue = await simpleStorage.store(expectedValue);
    await updateValue.wait(1);

    const currentValue = await simpleStorage.retrieve();
    assert.equal(currentValue.toString(), expectedValue);
  })
})
```

> 可以看到其中还是有一些没有说过的部分。我们在beforeEach中进行了合约的初始化，很简单吧。
>
> 接下来的两个it()函数，一个是用来对比初始化的number是不是0，另一个是测试更新之后的number是不是7，其中的第二个it函数的only 是代表着只会测试这一个函数，其他函数不会进行测试。

我们执行：`yarn hardhat test`进行测试

在没有加上only的时候：

![image-20250407001249313](images/区块链、智能合约、全栈web3开发/image-20250407001249313.png)

加上only的话：

![image-20250407001348712](images/区块链、智能合约、全栈web3开发/image-20250407001348712.png)

可以看到测试通过了。























