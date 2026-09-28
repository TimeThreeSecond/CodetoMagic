// Original monoline alphabet: shared stems express families, terminals distinguish operators.
// Inspired by Mystical's conceptual/operator lettering, not copied PostScript paths.
export const sigils: Record<string,{path:string;meaning:string}> = {
 if:{path:'M0 -9 V9 M0 -3 Q-8 -3 -8 5 M0 -3 Q8 -3 8 5 M-10 5 H-6 M6 5 H10',meaning:'条件分流：主干分成两条路径'},
 else:{path:'M-6 -9 V2 Q-6 7 5 7 M1 3 L5 7 L1 11 M-9 -5 H-3',meaning:'替代路径：绕过主干进入另一分支'},
 switch:{path:'M0 -10 V10 M0 -5 L-8 0 M0 0 L8 5 M0 5 L-8 10 M-2 -10 H2',meaning:'多路选择：主干上的多个出口'},
 case:{path:'M-7 -9 V8 H7 M-7 -2 H5 M1 -6 L5 -2 L1 2',meaning:'匹配入口'},
 default:{path:'M-7 -9 V8 H7 M-4 -5 L4 3 M4 -5 L-4 3',meaning:'默认入口'},
 for:{path:'M-7 8 V-8 H7 M-7 -1 H4 M4 -4 L7 -1 L4 2 M7 5 Q7 10 0 10',meaning:'计数循环：三段横枝与回绕尾部'},
 while:{path:'M-8 -5 Q0 -12 8 -5 V5 Q0 12 -8 5 V-5 M-11 -2 L-8 -5 L-5 -2 M-3 -2 V3 M3 -2 V3',meaning:'先判断的循环：顶部入口与闭合轨迹'},
 do:{path:'M-8 -5 Q0 -12 8 -5 V5 Q0 12 -8 5 V-5 M5 2 L8 5 L11 2 M-3 -2 H3',meaning:'先执行的循环：底部回绕出口'},
 return:{path:'M7 -8 V3 H-7 M-2 -2 L-7 3 L-2 8 M-9 -8 H-3',meaning:'结果沿折返线离开函数'},
 break:{path:'M-7 -9 V-2 M-7 3 V9 M-4 0 H9 M5 -4 L9 0 L5 4',meaning:'断开循环并向外退出'},
 continue:{path:'M7 8 V-7 H-7 M-3 -11 L-7 -7 L-3 -3 M-6 8 H2',meaning:'跳到下一轮循环入口'},
 goto:{path:'M-9 6 L7 -6 M2 -6 H7 V-1 M-9 -8 V-3 M-11 -6 H-7',meaning:'跨越结构的定向跳转'},
 int:{path:'M0 -9 V9 M-5 -9 H5 M-5 9 H5 M-3 -2 H3 M-3 2 H3',meaning:'整数：有刻度的计量主轴'},
 char:{path:'M7 -7 Q-8 -12 -8 0 Q-8 12 7 7 M-3 -3 L1 0 L-3 3',meaning:'字符：开口容器中的刻字符'},
 float:{path:'M-6 9 V-9 H7 M-6 -1 H4 M4 6 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0',meaning:'浮点：数值主干与浮动小环'},
 double:{path:'M-6 -9 V9 Q9 9 9 0 Q9 -9 -6 -9 M-2 -5 V5 Q5 5 5 0 Q5 -5 -2 -5',meaning:'双精度：双层数值容器'},
 void:{path:'M0 -9 A9 9 0 1 0 0 9 A9 9 0 1 0 0 -9 M-7 7 L7 -7',meaning:'无值：封空圆'},
 unsigned:{path:'M-7 -9 V3 Q-7 10 0 10 Q7 10 7 3 V-9 M-3 -3 H3',meaning:'无符号范围'},
 signed:{path:'M7 -7 Q-7 -12 -7 -3 Q-7 0 0 0 Q7 0 7 4 Q7 12 -7 7 M-3 -5 H3 M0 -8 V-2',meaning:'带符号范围'},
 long:{path:'M-5 -10 V10 H7 M-8 -6 H-2 M-8 4 H-2',meaning:'延伸数值范围'},
 short:{path:'M-6 -6 H6 M0 -6 V6 M-6 6 H6 M-3 0 H3',meaning:'缩短数值范围'},
 const:{path:'M0 -10 L8 -5 V5 L0 10 L-8 5 V-5 Z M-4 0 H4 M0 -4 V4',meaning:'不可修改的封印'},
 static:{path:'M-8 8 H8 M-5 8 V-7 H5 V8 M-2 -3 H2',meaning:'固定存储与边界'},
 extern:{path:'M-6 -8 V8 M-6 0 H9 M5 -4 L9 0 L5 4 M-9 -8 H-3',meaning:'来自外部的连接'},
 volatile:{path:'M-8 -8 L-3 8 L2 -8 L7 8 M-9 0 H9',meaning:'可变化的波动存储'},
 auto:{path:'M-8 8 L0 -9 L8 8 M-4 1 H4 M0 5 V10',meaning:'自动存储'},
 register:{path:'M-6 9 V-9 H2 Q9 -9 9 -3 Q9 2 -6 2 M0 2 L8 9',meaning:'寄存存储提示'},
 restrict:{path:'M-8 -8 V8 H8 V-8 M0 -10 V10 M-3 -4 L0 -7 L3 -4',meaning:'受限别名的独占通路'},
 inline:{path:'M-9 0 H9 M-5 -5 L0 0 L-5 5 M1 -5 L6 0 L1 5',meaning:'内联展开的连续路径'},
 struct:{path:'M-8 -9 H8 V9 H-8 Z M-8 -3 H8 M-8 3 H8 M-2 -9 V9',meaning:'结构体：分隔的数据格'},
 union:{path:'M-8 -9 H8 V9 H-8 Z M-8 -3 L8 3 M-8 3 L8 -3',meaning:'联合体：共享存储的交叠格'},
 enum:{path:'M-7 -9 V9 M-7 -7 H6 M-7 0 H6 M-7 7 H6 M6 -9 V-5 M6 -2 V2 M6 5 V9',meaning:'枚举：离散刻度'},
 typedef:{path:'M-9 -6 H9 M0 -6 V9 M-5 4 L0 9 L5 4 M-4 -10 H4',meaning:'类型命名绑定'},
 sizeof:{path:'M-8 -8 V8 H8 M-5 4 V8 M0 2 V8 M5 4 V8 M-4 -5 H8',meaning:'测量存储大小'},
 '=':{path:'M-9 -3 H6 M-9 3 H6 M3 -7 L9 0 L3 7',meaning:'赋值：值流入存储'},
 '+':{path:'M-8 7 L0 -9 L8 7 M-5 1 H5 M0 -3 V5',meaning:'加法：合流与增长'},
 '-':{path:'M-8 -6 V6 M8 -6 V6 M-8 0 H8',meaning:'减法：抽取一段量'},
 '*':{path:'M-8 -8 L8 8 M8 -8 L-8 8 M0 -10 V10 M-10 0 H10',meaning:'乘法：辐射放大'},
 '/':{path:'M-7 9 L7 -9 M-7 -7 H-3 M3 7 H7',meaning:'除法：分隔与分配'},
 '%':{path:'M-7 9 L7 -9 M-5 -8 a3 3 0 1 0 0 6 a3 3 0 1 0 0 -6 M5 2 a3 3 0 1 0 0 6 a3 3 0 1 0 0 -6',meaning:'余数：分割后的残留环'},
 '==':{path:'M-9 -4 H9 M-9 4 H9 M-7 -7 V7 M7 -7 V7',meaning:'相等：两侧平衡'},
 '!=':{path:'M-9 -4 H9 M-9 4 H9 M-6 10 L6 -10',meaning:'不相等：划破平衡'},
 '<':{path:'M7 -9 L-7 0 L7 9 M-7 -3 V3',meaning:'小于：向左收束'},
 '>':{path:'M-7 -9 L7 0 L-7 9 M7 -3 V3',meaning:'大于：向右收束'},
 '&&':{path:'M-8 -8 V0 Q-8 6 0 6 Q8 6 8 0 V-8 M0 6 V11 M-4 -3 H4',meaning:'逻辑与：双路汇合'},
 '||':{path:'M-8 -8 Q-8 0 0 0 Q8 0 8 -8 M0 0 V10 M-3 6 H3',meaning:'逻辑或：择路汇合'},
 '!':{path:'M0 -10 V2 M0 6 a2 2 0 1 0 0 4 a2 2 0 1 0 0 -4 M-4 -6 H4',meaning:'逻辑非：反转门'},
 '&':{path:'M-7 8 V-8 H5 Q10 -8 5 -2 L-7 8 M0 1 L8 9',meaning:'地址或按位与，含义依上下文'},
 '|':{path:'M0 -10 V10 M-5 -6 L0 -2 L5 -6',meaning:'按位或'},
 '^':{path:'M-9 4 L0 -7 L9 4 M0 -2 V10',meaning:'按位异或'},
 '~':{path:'M-10 0 Q-5 -9 0 0 Q5 9 10 0 M0 -9 V-5',meaning:'按位取反'},
 call:{path:'M-10 0 Q0 -12 10 0 Q0 12 -10 0 M0 -4 A4 4 0 1 0 0 4 A4 4 0 1 0 0 -4 M0 -10 V-6 M0 6 V10',meaning:'函数调用：穿过作用域之眼'},
 bind:{path:'M0 -10 L8 0 L0 10 L-8 0 Z M-4 0 H4',meaning:'声明与名称绑定'},
 group:{path:'M-8 -8 H8 V8 H-8 Z M-5 -4 H5 M-5 0 H5 M-5 4 H5',meaning:'聚合的顺序语句'},
 flow:{path:'M0 -10 V10 M-5 -2 L0 3 L5 -2 M-4 -7 H4',meaning:'顺序执行'},
 error:{path:'M-8 -9 L-2 -2 L-5 3 M8 9 L2 2 L5 -3',meaning:'未完成的语法'}
};
// Engraved vocabulary: control, invocation and result runes carry ceremonial
// terminals; ordinary operators remain lean enough for dense expressions.
const engraved:Record<string,string>={
 if:'M0 -13 l3 3 l-3 3 l-3 -3 Z M0 -7 V11 M0 -3 Q-9 -6 -9 4 Q-9 9 -4 6 M0 -3 Q9 -6 9 4 Q9 9 4 6 M-12 3 H-6 M6 3 H12 M-3 11 H3',
 for:'M-8 9 V-9 H8 V-4 M-8 -2 H5 M2 -5 L6 -2 L2 1 M8 3 Q12 12 0 12 L-3 9 M-11 -9 H-5 M-8 -12 V-6 M-4 5 H2',
 while:'M0 -12 C14 -12 14 12 0 12 C-14 12 -14 -12 0 -12 M-6 -8 Q5 -13 8 -3 M5 -5 L8 -2 L11 -5 M-5 7 Q-9 1 -4 -4 M0 -5 L4 0 L0 5 L-4 0 Z',
 return:'M0 -13 L4 -9 L0 -5 L-4 -9 Z M9 -6 V5 H-8 M-3 0 L-8 5 L-3 10 M-9 -6 Q-13 0 -9 5 M-1 -2 H5 M4 9 H10',
 call:'M-12 0 Q0 -15 12 0 Q0 15 -12 0 Z M0 -6 A6 6 0 1 0 0 6 A6 6 0 1 0 0 -6 M0 -3 L3 0 L0 3 L-3 0 Z M0 -14 V-10 M0 10 V14 M-15 -3 L-12 0 L-15 3 M15 -3 L12 0 L15 3',
 bind:'M0 -12 L9 0 L0 12 L-9 0 Z M0 -7 L5 0 L0 7 L-5 0 Z M-12 -4 V4 M12 -4 V4',
 flow:'M0 -12 V11 M-6 -5 Q0 3 6 -5 M-4 3 L0 8 L4 3 M-3 -12 H3 M-2 12 H2',
 int:'M0 -12 V12 M-5 -10 Q0 -6 5 -10 M-5 10 Q0 6 5 10 M-5 -3 H5 M-5 3 H5 M-2 -14 H2 M-2 14 H2',
 '&&':'M-10 -9 Q-10 5 0 6 Q10 5 10 -9 M0 6 V13 M0 -8 L4 -3 L0 2 L-4 -3 Z M-12 -9 H-8 M8 -9 H12'
};
for(const [key,path] of Object.entries(engraved))sigils[key]={...sigils[key],path};
for(const [key,base,extra] of [ ['<=','<','M-7 12 H7'],['>=','>','M-7 12 H7'],['++','+','M-10 -10 H-4 M-7 -13 V-7'],['--','-','M-9 -10 H-3'],['+=','+','M-8 12 H8'],['-=','-','M-8 12 H8'],['*=','*','M-8 12 H8'],['/=','/','M-8 12 H8'],['%=','%','M-8 12 H8'],['<<','<','M12 -9 L-2 0 L12 9'],['>>','>','M-12 -9 L2 0 L-12 9']])sigils[key]={path:sigils[base].path+' '+extra,meaning:key+' 运算'};
// Python uses the same geometric vocabulary for equivalent control/operation
// semantics. Source spelling is retained in tokens/tooltips, not converted to C text.
for(const [key,base,meaning] of [
 ['def','bind','函数定义与名称绑定'],['class','struct','类：组织属性与方法'],
 ['import','extern','引用外部模块'],['from','extern','从模块引入名称'],['as','bind','别名绑定'],
 ['and','&&','逻辑与'],['or','||','逻辑或'],['not','!','逻辑非'],['elif','if','替代条件分支'],
 ['True','const','真值'],['False','const','假值'],['None','void','无值'],
 ['is','==','对象身份判定'],['in','enum','成员判定或迭代入口'],
 ['//','/','向下取整除法'],['**','*','幂运算'],[':=','=','赋值表达式'],
 ['match','switch','模式选择'],['case','case','匹配入口'],
 ['try','switch','异常保护块'],['except','case','异常处理分支'],['finally','flow','收尾路径'],
 ['raise','return','抛出异常'],['with','const','上下文管理'],['yield','return','生成器产出'],
 ['await','call','异步等待'],['async','inline','异步定义'],['lambda','bind','匿名函数'],
 ['assert','if','断言检查'],['pass','flow','空语句'],['del','break','删除绑定'],
 ['global','extern','模块作用域绑定'],['nonlocal','extern','外层作用域绑定']
])sigils[key]={path:sigils[base].path,meaning};
for(const [key,base] of [['**=','**'],['//=','//'],['&=','&'],['|=','|'],['^=','^'],['<<=','<<'],['>>=','>>']])
 sigils[key]={path:sigils[base].path+' M-8 12 H8',meaning:key+' 运算'};
export function nodeSigil(kind:string){return ({if_statement:'if',switch_statement:'switch',case_statement:'case',for_statement:'for',while_statement:'while',do_statement:'do',return_statement:'return',break_statement:'break',continue_statement:'continue',goto_statement:'goto',struct_specifier:'struct',call_expression:'call',declaration:'bind',group:'group',ERROR:'error',try_statement:'try',except_clause:'except',finally_clause:'finally',with_statement:'with',raise_statement:'raise',yield_statement:'yield',await_expression:'await',lambda_expression:'lambda'} as Record<string,string>)[kind]||'flow';}
