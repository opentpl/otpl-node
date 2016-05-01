# otpl-node
OTPL for Nodejs (Typescript)







## 安装

```bash
$ npm install -g typescript
$ npm install --save otpl

```

## 用例
```js
const otpl = require('otpl')

otpl.config(__dirname,{
    debug:true,
    ...
})

//使用 koa 框架为例
const app = require('koa')();

//注册中间件
app.use(function *(next){
	if(!this.otpl){
		var ctx = this;
		this.otpl = (filename,data,callback) => {
			callback = callback || function(err,rendered){
				if(err){
					ctx.body = err.message;
					return;
				}
				ctx.body = rendered;
			};
			otpl.render(filename,data,callback);
		};
	}
	yield next;
});

app.use(function *(next){
    this.otpl('index',{foo:'bar'}) // /views/index.otpl.html
})

app.listen(3000,function(err){
	console.log('serve on port: 3000');
});

```