# otpl-node

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coveralls Status][coveralls-image]][coveralls-url]

OTPL for Nodejs (Typescript)







## 安装

```bash
$ npm install -g typescript #仅开发时需要
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


[downloads-image]: https://img.shields.io/npm/dm/otpl.svg

[npm-url]: https://www.npmjs.com/package/otpl
[npm-image]: https://img.shields.io/npm/v/otpl.svg

[travis-url]: https://travis-ci.org/gulpjs/gulp
[travis-image]: https://img.shields.io/travis/gulpjs/gulp.svg

[coveralls-url]: https://coveralls.io/r/diosay/otpl-node
[coveralls-image]: https://img.shields.io/coveralls/diosay/otpl-node/master.svg

[gitter-url]: https://gitter.im/diosay/otpl-node
[gitter-image]: https://badges.gitter.im/diosay/otpl-node.png