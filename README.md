# ODD-Platform
眼科疾病诊断平台

**1.创建虚拟环境**
创建虚拟环境并激活
```shell
conda create -n odd python=3.11
conda activate odd
```

**2.安装依赖**
```shell
cd ./Server
pip install -r requirements.txt
```

**3.安装Neo4j并导入数据**
1、配置要求：要求配置neo4j数据库及相应的python依赖包。neo4j数据库用户名密码记住，并修改相应文件。（具体第11行，第9行文件路径根据情况调整） 
2、知识图谱数据导入：python build_medicalgraph.py，导入的数据较多，估计需要几个小时。

**4.运行app.py文件启动后端**


