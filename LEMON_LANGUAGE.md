# Lemon 编程语言

Lemon 是一门系统级编程语言，融合了 C 语言的底层控制能力与 Java 风格的面向对象特性。编译器完全用 Lemon 自身编写，已通过三阶段自举验证（固定点验证通过）。

---

## 目录

- [快速开始](#快速开始)
- [类型系统](#类型系统)
- [语言特性](#语言特性)
- [标准库](#标准库)
- [编译目标](#编译目标)
- [编译器架构](#编译器架构)
- [混合执行引擎](#混合执行引擎)
- [关键源文件索引](#关键源文件索引)
- [已知限制](#已知限制)

---

## 快速开始

```lemon
package main;

public class HelloLemon {
    public static void main(String[] args) {
        printf("Hello, World!\n");

        var name = "Lemon";
        var version = 2;
        printf("%s v%d\n", name, version);
    }
}
```

编译运行：

```bash
# 编译为 C 代码（默认），再用 GCC 编译
lemonc hello.lm -o hello.exe

# 直接生成原生可执行文件（内置链接器，无需 GCC）
lemonc hello.lm --target native -o hello.exe

# 编译为字节码，用 VM 运行
lemonc hello.lm --target bytecode -o hello.lmb
lemonvm hello.lmb

# 混合 AOT+JIT 编译
lemonc hello.lm --target hybrid -o hello.exe
```

---

## 类型系统

### 原始类型

| 类型 | 说明 | C 映射 |
|------|------|--------|
| `void` | 空类型 | `void` |
| `bool` | 布尔型 | `int` |
| `byte` | 字节型 | `unsigned char` |
| `char` | 字符型 | `char` |
| `short` | 短整型 | `short` |
| `int` | 整型 | `int` |
| `long` | 长整型 | `long long` |
| `float` | 单精度浮点 | `float` |
| `double` | 双精度浮点 | `double` |

### 引用类型

| 类型 | 说明 | 实现方式 |
|------|------|----------|
| `String` | 不可变字符串 | 映射为 C 的 `const char*`，10+ 内建方法 |
| `Array<T>` | 动态数组 | `LemonArray*` 结构体，泛型单态化 |
| `Map<K,V>` | 哈希映射 | `LemonMap*` 结构体，FNV-1a + 开放寻址 |
| `StringBuilder` | 可变字符串 | C 运行时实现，15 个方法 |
| 枚举 | 代数数据类型 | Tagged union（kind 字段 + union payload） |
| 类 | 引用类型 | 堆分配，指针传递 |
| 接口 | 行为契约 | itable 调度 |
| 函数指针 | 回调 | `void(int, String)` 形式 |

### 类型推断

支持 `var` 关键字进行局部变量类型推断：

```lemon
var name = "Lemon";       // 推断为 String
var count = 42;           // 推断为 int
var items = new Array<String>();  // 推断为 Array<String>
```

---

## 语言特性

### 类与继承

```lemon
class Animal {
    protected String name;

    public Animal(String name) {
        this.name = name;
    }

    public virtual String speak() {
        return name + " makes a sound";
    }
}

class Dog extends Animal {
    public Dog(String name) : super(name) {}

    @override
    public String speak() {
        return name + " barks";
    }
}
```

- **单继承**：`extends` 关键字，`super` 调用父类构造函数
- **虚方法**：`virtual` 修饰，`@override` 标记重写，vtable 调度
- **访问控制**：`public`、`private`、`protected`
- **静态成员**：`static` 方法/字段
- **final 修饰**：不可继承/重写
- **构造函数**：与类名同名的方法
- **析构函数**：`~ClassName()` 语法

### 接口

```lemon
interface Printable {
    String toString();
}

interface Comparable {
    int compareTo(Object other);
}

class Student implements Printable, Comparable {
    // 必须实现接口方法
    public String toString() { return "Student"; }
    public int compareTo(Object other) { return 0; }
}
```

- **多接口实现**：一个类可实现多个接口
- **itable 调度**：接口方法通过接口方法表调用

### 枚举与模式匹配

```lemon
// 简单枚举
enum Color {
    Red,
    Green,
    Blue
}

// 携带数据的代数类型
enum TokenKind {
    Identifier(String),
    IntegerLiteral(long),
    StringLiteral(String),
    Operator(String),
    Eof
}

// Match 表达式
String desc = match (token) {
    TokenKind.Identifier(name) => "id: " + name,
    TokenKind.IntegerLiteral(v) => "int: " + intToString(v),
    _ => "other"
};
```

- **变体携带数据**：每个枚举变体可携带不同类型的数据
- **Match 模式**：变体解构绑定、通配符 `_`、或模式
- **编译方式**：Tagged union（kind 字段 + union payload）

### 控制流

```lemon
// if/else
if (x > 0) {
    printf("positive\n");
} else if (x < 0) {
    printf("negative\n");
} else {
    printf("zero\n");
}

// for 循环
for (int i = 0; i < 10; i++) {
    printf("%d ", i);
}

// while 循环
while (running) {
    process();
}

// for-each 循环
for (String item in items) {
    printf("%s\n", item);
}

// switch 语句
switch (color) {
    case Color.Red: printf("red"); break;
    case Color.Green: printf("green"); break;
    default: printf("other");
}

// break / continue
for (int i = 0; i < 100; i++) {
    if (i == 5) continue;
    if (i == 10) break;
}
```

### 异常处理

```lemon
try {
    var result = riskyOperation();
} catch (Exception e) {
    printf("Error: %s\n", e.message);
} finally {
    cleanup();
}

// 抛出异常
throw new Exception("something went wrong");
```

- 基于 `setjmp/longjmp` 实现
- 支持 `try/catch/finally`
- 支持 `throw` 表达式

### 运算符

| 类别 | 运算符 |
|------|--------|
| 算术 | `+` `-` `*` `/` `%` |
| 比较 | `<` `>` `<=` `>=` `==` `!=` |
| 逻辑 | `&&` `\|\|` `!` |
| 位运算 | `&` `\|` `^` `~` `<<` `>>` |
| 赋值 | `=` `+=` `-=` `*=` `/=` `%=` `&=` `\|=` `^=` `<<=` `>>=` |
| 自增/自减 | `++` `--`（前置和后置） |
| 三元 | `? :` |
| Null 合并 | `??`（`a ?? b` → a 不为 null 则返回 a，否则返回 b） |
| 字符串拼接 | `+`（自动类型转换） |
| 类型操作 | `sizeof` `typeid` `instanceof` `as`（类型转换） |
| 指针 | `*`（解引用） `->`（指针字段访问） `&`（取地址） |

### 其他特性

```lemon
// extern 声明 C 函数
extern int printf(String fmt, ...);

// 字符串字面量
var s = "hello\nworld";

// 字符字面量
var c = 'A';

// null 值
var x = null;

// 数组创建
var arr = new Array<int>();
arr.push(1);
arr.push(2);

// Map 创建
var map = new Map<String, int>();
map.put("key", 42);

// 类型转换
long v = 100;
double d = v as double;

// instanceof 检查
if (obj instanceof Dog) { ... }

// sizeof
int sz = sizeof(int);  // 4
```

---

## 标准库

### String（不可变字符串）

| 方法 | 说明 |
|------|------|
| `length()` | 获取长度 |
| `toUpperCase()` | 转大写 |
| `toLowerCase()` | 转小写 |
| `equals(s)` | 相等比较 |
| `trim()` | 去空白 |
| `substring(start, end)` | 截取子串 |
| `indexOf(s)` | 查找子串 |
| `replace(old, new)` | 替换 |
| `charAt(idx)` | 获取指定位置字符 |
| `startsWith(s)` | 前缀检查 |
| `endsWith(s)` | 后缀检查 |
| `contains(s)` | 包含检查 |
| `split(s)` | 分割 |
| `isEmpty()` | 空检查 |
| `String.intToString(v)` | 整数转字符串 |
| `String.longToString(v)` | 长整数转字符串 |
| `String.doubleToString(v)` | 双精度转字符串 |
| `String.fromChar(c)` | 字符转字符串 |
| `String.join(arr, sep)` | 数组拼接 |
| `String.escapeCString(s)` | C 字符串转义 |

### StringBuilder（可变字符串）

| 方法 | 说明 |
|------|------|
| `new()` | 创建实例 |
| `append(s)` | 追加字符串 |
| `appendChar(c)` | 追加字符 |
| `appendInt(v)` | 追加整数 |
| `appendLong(v)` | 追加长整数 |
| `appendFloat(v)` | 追加浮点数 |
| `appendDouble(v)` | 追加双精度浮点数 |
| `appendBool(v)` | 追加布尔值 |
| `toString()` | 转为字符串 |
| `length()` | 获取长度 |
| `charAt(idx)` | 获取指定位置字符 |
| `setCharAt(idx, c)` | 设置指定位置字符 |
| `deleteCharAt(idx)` | 删除指定位置字符 |
| `insert(idx, s)` | 在指定位置插入字符串 |
| `clear()` | 清空 |

### Array\<T\>（动态数组）

| 方法 | 说明 |
|------|------|
| `add(item)` | 添加元素 |
| `push(item)` | 添加元素（add 的别名） |
| `get(idx)` | 获取元素 |
| `set(idx, item)` | 设置元素 |
| `size()` | 获取大小 |
| `removeAt(idx)` | 删除指定位置元素 |

### Map\<K,V\>（哈希映射）

| 方法 | 说明 |
|------|------|
| `put(key, value)` | 插入/更新 |
| `get(key)` | 获取值 |
| `size()` | 获取大小 |
| `containsKey(key)` | 包含检查 |
| `remove(key)` | 删除 |
| `keys()` | 获取所有键 |

实现：FNV-1a 哈希 + 开放寻址 + 迭代式 rehash（75% 负载因子）。

### File I/O

| 方法 | 说明 |
|------|------|
| `File.open(path, mode)` | 打开文件 |
| `File.close(f)` | 关闭文件 |
| `File.readAll(f)` | 读取全部内容 |
| `File.readLine(f)` | 读取一行 |
| `File.write(f, s)` | 写入字符串 |
| `File.writeLine(f, s)` | 写入一行 |
| `File.hasNextLine(f)` | 是否有下一行 |
| `File.eof(f)` | 是否到达末尾 |

### Character（字符工具）

| 方法 | 说明 |
|------|------|
| `isDigit(c)` | 是否为数字 |
| `isLetter(c)` | 是否为字母 |
| `isLetterOrDigit(c)` | 是否为字母或数字 |
| `isWhitespace(c)` | 是否为空白字符 |
| `isUpperCase(c)` / `isLowerCase(c)` | 大小写检查 |
| `toUpperCase(c)` / `toLowerCase(c)` | 大小写转换 |
| `getNumericValue(c)` | 获取数字值 |
| `fromInt(v)` / `toInt(c)` | 整数与字符互转 |

### System

| 方法 | 说明 |
|------|------|
| `System.printf(fmt, ...)` | 格式化输出 |
| `System.println(s)` | 输出字符串 |
| `System.exit(code)` | 退出程序 |
| `System.currentTimeMillis()` | 获取当前时间戳 |

---

## 编译目标

Lemon 支持 6 种编译目标：

| 目标 | 命令 | 说明 |
|------|------|------|
| **C 代码** | `--target c` | 生成 `.c` 文件，再通过 GCC 编译（默认） |
| **NASM 汇编** | `--target nasm` | 生成 x86-64 汇编输出 |
| **原生可执行文件** | `--target native` | 生成 COFF64 + 内置 PE32+ 链接器 |
| **直接 exe** | `--target exe` | 同 native，内置链接器生成 exe |
| **字节码** | `--target bytecode` | 生成 `.lmb` 格式，lemonvm 执行 |
| **混合** | `--target hybrid` | 原生代码 + 嵌入式字节码，AOT+JIT 混合 |

### 内置 PE32+ 链接器

编译器内置了原生 PE32+ 链接器，可直接从 COFF64 目标文件生成 Windows 可执行文件：

- DLL 导入表（msvcrt.dll）
- 导入跳转 thunk
- GCC 特定符号内置桩（`__main`）
- 嵌入式 `.lmb` 字节码段
- 完全独立生成可用的 Windows exe，无需任何外部工具链

---

## 编译器架构

### 编译管线

```
.lm 源文件
  ↓ 词法分析 (Lexer) → Token 流（60+ 种 Token）
  ↓ 语法分析 (Parser) → AST（46 种表达式节点 + 12 种语句节点）
  ↓ 语义分析 (SemanticAnalyzer) → 4 阶段类型检查
  ↓   Phase 1: 符号收集
  ↓   Phase 2: 继承与接口验证
  ↓   Phase 3: 类型检查
  ↓   Phase 4: 控制流检查
  ↓ 优化器 (Optimizer) → 常量折叠/传播、死代码消除、代数化简
  ↓ 代码生成 → 目标代码（C/NASM/原生/字节码/混合）
```

### 双编译器架构

| | Rust 版 (T0) | Lemon 版 (T1+) |
|---|---|---|
| 路径 | `src/` | `src_lem/` |
| 代码量 | ~6000 行 | ~7000 行 |
| 功能 | 更完整（泛型、方法重载） | 自举所需功能完整 |
| 用途 | 引导编译 | 生产使用 |

### 自举验证

```
T0 (Rust lemonc) → 编译 src_lem → T1 (lemonc_t1.exe)
T1 → 编译 src_lem → T2 (lemonc_t2.exe)
T2 → 编译 src_lem → T3 (lemonc_t3.exe)
T3 → 编译 src_lem → T4 (t4.c)
验证：T3.c SHA256 == T4.c SHA256 → 固定点验证通过 ✅
```

---

## 混合执行引擎

Lemon v2.0 引入了 AOT + JIT 混合执行引擎，允许同一程序中同时使用原生代码和字节码。

### 架构

```
.lm 源码 → 语义分析 + 执行策略决策
  ├── NativeCodeGen → COFF64 → PE 链接器 → 原生机器码
  └── BytecodeCompiler → 嵌入式字节码段 → LeVM 运行时
```

### 执行策略

| 代码类型 | 执行方式 | 原因 |
|----------|----------|------|
| 普通方法/构造函数 | 原生 AOT | 性能最优 |
| 虚方法 | 原生 AOT | vtable 需要确定性地址 |
| `@reflectable` 方法 | JIT/VM | 运行时反射需要 |
| 含 instanceof/match/try 的方法 | JIT/VM | 动态类型操作 |
| 热点循环体 | AOT + JIT 优化 | 先解释执行，热点后编译 |

### LeVM 虚拟机

- 从独立进程重构为可嵌入库
- `LeVM::from_bytes()` — 从内存中的 .lmb 字节码创建 VM
- `LeVM::call()` / `LeVM::call_by_name()` — 调用 VM 函数
- `LeVM::register_native()` — 注册原生函数
- C FFI 接口（12 个函数）支持原生与 VM 互操作

### JIT 编译器

- 50+ 字节码指令到 x86-64 机器码的编译
- Windows x64 调用约定（rcx, rdx, r8, r9 传参）
- 热点检测：可配置阈值（默认 100 次调用），自动触发 JIT 编译
- SSE2 浮点运算支持
- 栈帧布局：push rbp → mov rbp,rsp → sub rsp,locals → ... → 恢复 → ret

### 字节码指令集（60+ 条）

| 类别 | 指令 |
|------|------|
| 栈操作 | PushConst, PushFloat, PushBool, PushString, PushNull, Pop, Dup, Swap |
| 局部变量 | LoadLocal, StoreLocal, LoadGlobal, StoreGlobal |
| 字段访问 | LoadField, StoreField |
| 算术 | Add, Sub, Mul, Div, Mod, Neg, FAdd, FSub, FMul, FDiv, FCmp |
| 位运算 | BitAnd, BitOr, BitXor, BitNot, Shl, Shr |
| 比较 | Eq, Ne, Lt, Gt, Le, Ge |
| 逻辑 | And, Or, Not |
| 控制流 | Jump, JumpIf, JumpIfNot, Return |
| 调用 | Call, CallMethod, CallNative, InvokeVirtual |
| 对象 | New, NewArray, ArrayGet, ArraySet, ArrayLen, ArrayPush, Delete |
| 集合 | MapNew, MapGet, MapPut, MapContains, MapLen, MapRemove, MapKeys |
| 字符串 | StringConcat, StringLen, StringEquals |
| 类型 | Cast, InstanceOf, TypeId, CheckNotNull |
| 优化 | IncLocal(idx, delta) |

---

## 关键源文件索引

源代码位于 `lemonc/` 子目录中：

| 文件 | 核心内容 |
|------|---------|
| `src_lem/lexer/Lexer.lm` | 词法分析器（60+ 种 Token） |
| `src_lem/lexer/TokenKind.lm` | Token 类型定义 |
| `src_lem/parser/Parser.lm` | 递归下降 + Pratt 表达式解析器 |
| `src_lem/parser/AST.lm` | AST 节点定义（46 种表达式 + 12 种语句） |
| `src_lem/semantic/SemanticAnalyzer.lm` | 4 阶段语义分析器 |
| `src_lem/codegen/CCodeGen.lm` | C 代码生成器 + 运行时库生成 |
| `src_lem/LemonCompiler.lm` | 编译器主入口 |
| `src/codegen/c_gen.rs` | Rust 版 C 代码生成器（含泛型/重载） |
| `src/codegen/native_gen.rs` | 原生 x86-64 代码生成器 |
| `src/jit/compiler.rs` | 字节码编译器 |
| `src/jit/vm.rs` | LeVM 虚拟机 |
| `src/jit/jit_compiler.rs` | JIT 编译器（50+ 指令） |
| `src/jit/ffi.rs` | C FFI 接口（12 个函数） |
| `src/linker/linker.rs` | 内置 PE32+ 链接器 |
| `src/ast/execution_strategy.rs` | 执行策略决策模块 |
| `src/runtime/mod.rs` | 内置运行时库（17 个函数） |

---

## 已知限制

| 功能 | 状态 |
|------|------|
| Lambda / 闭包 | 语法可解析，运行时未完整实现 |
| import 语句 | 语法可解析，语义未实现 |
| 泛型类实例化（Lemon 版） | Rust 版完整，Lemon 版缺失 |
| 方法重载（Lemon 版） | Rust 版完整，Lemon 版缺失 |
| do-while 循环 | 未实现 |
| 元组类型 | 未实现 |
| Option\<T\> / T? | 未实现 |
| 运算符重载 | 未实现 |
| 字符串插值 | 未实现 |
| GC 实际使用 | 框架存在但未接入 |
| 数学库 (Math) | 缺失 |
| 集合库 (Set/Queue/Stack) | 缺失 |
