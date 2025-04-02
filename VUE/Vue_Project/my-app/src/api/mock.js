import Mock from "mockjs";
import homeApi from './mockServerData/home'


// Mock 数据
Mock.mock('/api/home/getData', homeApi.getStatisticalData) 


