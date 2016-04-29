## TS 代码编写说明

1、类继承构造函数必须显示调用，否则编译后NODE不能执行。

2、不能使用可变参数，否则编译后NODE不能执行。

3、不能使用FOR-OF 的带[key,value] 的语句，否则编译后NODE不能执行


Binary {
  line: 6,
  column: 9,
  left: Integer { line: 0, column: 0, value: '3', datatype: 2 },
  right:
   Binary {
     line: 6,
     column: 13,
     left:
      Binary {
        line: 6,
        column: 11,
        left: [Object],
        right: [Object],
        operator: '*' },
     right: Integer { line: 0, column: 0, value: '1', datatype: 2 },
     operator: '-' },
  operator: '>' }
  
  3>(3*(?-?))
  console.log(this.condition)