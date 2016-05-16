# 开发者文档

## 开发依赖
$ npm install -g typescript //https://www.typescriptlang.org/

$ npm install -g typings //https://github.com/typings/typings
- typings install node --ambient --save

## 目录结构

	|	README.md							//说明文档
	|	.gitignore							//GIT 忽略列表
	\---lib									//ts编译后的目标目录，也是发布到npm的主要代码。注：该目录禁止放置任何文件。
	\---src									//源码目录(typescript)
	|	|	README.md                       //开发者文档
	|	|	*.ts
	\---test								//测试代码目录
	|	\---data							//运行时数据目录
	|	\---view							//模板目录
	|	|	index.js						//配置文件，可自定义。
	|		
	\---typings								//typescript “头”文件目录。

## TS 代码编写说明

1、类继承构造函数必须显示调用，否则编译后NODE不能执行。

2、不能使用可变参数，否则编译后NODE不能执行。

3、不能使用FOR-OF 的带[key,value] 的语句，否则编译后NODE不能执行



