# Language Lemon 用户指南 v4.1.0

> 一门结合 C 语言底层控制能力与 Java 风格面向对象的系统级编程语言。
> 自举编译器 + 多目标代码生成（原生/JIT/字节码/混合）+ SSA IR。

---

## 目录

1. [快速开始](#快速开始)
2. [语言基础](#语言基础)
3. [类型系统](#类型系统)
4. [类与面向对象](#类与面向对象)
5. [控制流](#控制流)
6. [枚举与 Match](#枚举与-match)
7. [泛型](#泛型)
8. [数组与 Map](#数组与-map)
9. [标准库](#标准库)
10. [编译器选项](#编译器选项)
11. [自举验证](#自举验证)
12. [VS Code 扩展](#vs-code-扩展)

---

## 快速开始

### 安装编译器

```bash
git clone https://github.com/Casaer-X/lemonc.git
cd lemonc
cargo build --release
```

### 第一个程序

创建 `hello.lm`：

```lemon
package main;

public class HelloLemon {
    public static void main(String[] args) {
        System.printf("Hello, World!\n");
    }
}
```

### 编译运行

```bash
# 生成 C 代码并编译为可执行文件
lemonc hello.lm -o hello.exe
./hello.exe

# 仅生成 C 代码（默认目标）
lemonc hello.lm --target c -o hello.c

# 生成 SSA IR
lemonc hello.lm --target ir

# 生成 x86-64 原生代码
lemonc hello.lm --target native

# 生成字节码
lemonc hello.lm --target bytecode

# 混合执行（AOT + JIT 策略）
lemonc hello.lm --target hybrid
```

---

## 语言基础

### 程序结构

每个 `.lm` 文件以 `package` 声明开头：

```lemon
package myapp;
```

### 注释

```lemon
// 单行注释

/* 多行
   注释 */
```

### 变量

```lemon
int x = 42;
double pi = 3.14159;
bool flag = true;
String name = "Lemon";
char c = 'A';
```

---

## 类型系统

### 基本类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `void` | 无返回值 | 函数返回类型 |
| `bool` | 布尔值 | `true`, `false` |
| `byte` | 8 位有符号整数 | `(byte)127` |
| `char` | 16 位无符号字符 | `'A'`, `'\\n'` |
| `short` | 16 位有符号整数 | `(short)32767` |
| `int` | 32 位有符号整数 | `42`, `-1` |
| `long` | 64 位有符号整数 | `10000000000L` |
| `float` | 32 位浮点数 | `3.14f` |
| `double` | 64 位浮点数 | `3.14159265359` |

### 引用类型

```lemon
String s = "hello";           // 字符串
Array<int> arr;               // 数组
Map<String, int> map;         // 映射表
```

### 类型转换

```lemon
int i = (int)3.14;            // 显式转换
long l = 100L;                // 字面量后缀
float f = 1.0f;
double d = 3.14;
```

---

## 类与面向对象

### 类定义

```lemon
public class Point {
    public int x;
    public int y;

    // 构造函数
    public Point(int x, int y) {
        this.x = x;
        this.y = y;
    }

    // 实例方法
    public double distance() {
        return Math.sqrt((double)(this.x * this.x + this.y * this.y));
    }

    // 静态方法
    public static Point origin() {
        return new Point(0, 0);
    }
}
```

### 继承

```lemon
public class Animal {
    protected String name;

    public Animal(String name) {
        this.name = name;
    }

    public String getName() {
        return this.name;
    }
}

public class Dog extends Animal {
    public String breed;

    public Dog(String name, String breed) {
        super(name);
        this.breed = breed;
    }
}
```

### 接口

```lemon
interface Drawable {
    void draw();
    String getShape();
}

public class Circle implements Drawable {
    public double radius;

    public Circle(double radius) {
        this.radius = radius;
    }

    public void draw() {
        System.printf("Drawing circle r=%.2f\n", this.radius);
    }

    public String getShape() {
        return "circle";
    }
}
```

### 修饰符

| 修饰符 | 说明 |
|--------|------|
| `public` | 公开访问 |
| `private` | 仅类内访问 |
| `static` | 静态成员 |
| `abstract` | 抽象类/方法 |
| `virtual` | 虚方法（可被子类重写） |
| `override` | 重写父类虚方法 |
| `final` | 不可继承/不可重写 |
| `reflectable` | 支持反射 |

### 访问控制

```lemon
public class Example {
    public int publicField;       // 任何地方可访问
    private int privateField;     // 仅类内可访问
    protected int protectedField; // 类内和子类可访问

    public void publicMethod() { }
    private void privateMethod() { }
}
```

---

## 控制流

### if-else

```lemon
if (x > 0) {
    System.printf("positive\n");
} else if (x < 0) {
    System.printf("negative\n");
} else {
    System.printf("zero\n");
}
```

### for 循环

```lemon
// 经典 for 循环
for (int i = 0; i < 10; i++) {
    System.printf("%d\n", i);
}

// 遍历数组
Array<int> numbers = new Array<int>();
for (int i = 0; i < numbers.size(); i++) {
    int val = numbers.get(i);
    System.printf("%d\n", val);
}
```

### while 循环

```lemon
int count = 0;
while (count < 5) {
    System.printf("count = %d\n", count);
    count++;
}
```

### break / continue

```lemon
for (int i = 0; i < 100; i++) {
    if (i == 50) break;       // 终止循环
    if (i % 2 == 0) continue; // 跳过当前迭代
    System.printf("%d\n", i);
}
```

### try-catch-finally

```lemon
try {
    riskyOperation();
} catch (Exception e) {
    System.printf("Error: %s\n", e.getMessage());
} finally {
    cleanup();
}
```

---

## 枚举与 Match

### 枚举定义

```lemon
enum Color {
    Red, Green, Blue
}

enum Status {
    Pending, Active, Completed, Failed
}
```

### Match 表达式

```lemon
Color c = Color.Red;

// 完备匹配（必须覆盖所有变体）
String name = match (c) {
    Color.Red   => "红色";
    Color.Green => "绿色";
    Color.Blue  => "蓝色";
};

// 带 wildcard 的匹配
Status s = Status.Active;
String label = match (s) {
    Status.Active    => "进行中";
    Status.Completed => "已完成";
    Status.Failed    => "失败";
    _                => "其他";
};
```

> **注意**：如果 match 没有 wildcard (`_`)，编译器会检查是否覆盖了枚举的所有变体，缺少任何变体会报告 `nonExhaustiveMatch` 错误。

---

## 泛型

Lemon 支持类和方法级别的泛型：

```lemon
// 泛型容器类
public class Box<T> {
    private T value;

    public Box(T value) {
        this.value = value;
    }

    public T get() {
        return this.value;
    }

    public void set(T value) {
        this.value = value;
    }
}

// 使用泛型类
Box<int> intBox = new Box<int>(42);
int val = intBox.get();
```

---

## 数组与 Map

### 数组操作

```lemon
// 创建数组
Array<int> numbers = new Array<int>();

// 添加元素
numbers.add(1);
numbers.add(2);
numbers.add(3);

// 访问元素
int first = numbers.get(0);

// 获取大小
int len = numbers.size();
```

### Map 操作

```lemon
// 创建 Map
Map<String, int> ages = new Map<String, int>();

// 设置键值对
ages.put("Alice", 25);
ages.put("Bob", 30);

// 获取值
int aliceAge = ages.get("Alice");

// 检查键
if (ages.containsKey("Bob")) {
    System.printf("Bob exists\n");
}
```

---

## 标准库

Lemon 编译器自带标准库，位于 `stdlib/` 目录：

| 模块 | 功能 |
|------|------|
| `algorithm` | 算法函数（sort, search 等） |
| `io` | 文件 I/O 操作 |
| `math` | 数学函数（sqrt, sin, cos, pow 等） |
| `random` | 随机数生成 |
| `string` | 字符串操作 |
| `system` | 系统调用 |
| `time` | 时间函数 |

### 使用标准库

```lemon
import lemon.stdlib.io;

public class FileReader {
    public static void main(String[] args) {
        String content = IO.readFile("data.txt");
        System.printf("Content: %s\n", content);
    }
}
```

---

## 编译器选项

### lemonc 命令

```bash
lemonc [options] <input files...>
```

### 目标选项

| 选项 | 说明 |
|------|------|
| `--target c` | 生成 C 代码（默认） |
| `--target ir` | 生成 SSA IR 文本 |
| `--target native` | 生成 x86-64 机器码转储 |
| `--target bytecode` | 生成 Lemon 字节码 (.lmb) |
| `--target hybrid` | 混合执行（AOT + JIT 策略分析） |
| `--build` | 项目构建模式 |

### 输出选项

| 选项 | 说明 |
|------|------|
| `-o <file>` | 指定输出文件路径 |
| `--output-ir <file>` | 指定 IR 输出路径 |

---

## 自举验证

lemonc_lm 是一个自举编译器（用 Lemon 语言编写的 Lemon 编译器）。

### 验证流程

```
T0 (Rust 编译器)  →  T1.c  →  [GCC]  →  T1.exe
                                          ↓
                        lemonc_lm/*.lm ──→ T2.c
                                          ↓
                        lemonc_lm/*.lm ──→ T3.c

固定点验证: T2.c SHA256 ≡ T3.c SHA256 ✓
```

### 编译器架构

```
lemonc_lm/
├── lexer/          # 词法分析器 (5 文件，60+ Token 类型)
├── parser/         # 语法分析器 (5 文件，递归下降 + Pratt 表达式解析)
├── semantic/       # 语义分析器 (4 文件，类型检查/继承验证/访问控制/Match完备性)
├── ast/            # AST 节点定义 + 优化器
├── codegen/        # 代码生成器
│   ├── CCodeGen.lm     # C 代码生成 (3791 行)
│   ├── NativeCodeGen.lm # x86-64 原生代码生成
│   ├── NasmCodeGen.lm   # NASM 汇编生成
│   ├── X8664.lm         # x86-64 指令编码
│   ├── COFF64.lm        # COFF 目标文件格式
│   └── PELinker.lm      # PE32+ 链接器
├── ir/             # SSA IR (IR/IRFunction/IRGen/IRType)
├── jit/             # JIT 与字节码
│   ├── Bytecode.lm         # 字节码操作码定义 (138 个)
│   ├── BytecodeCompiler.lm # AST → 字节码编译器
│   ├── LeVM.lm             # 基于栈的字节码 VM
│   └── JitCompiler.lm      # 字节码 → x86-64 JIT 编译器
├── runtime/        # 运行时库
└── LemonCompiler.lm # 编译器入口
```

---

## VS Code 扩展

### 安装

1. 从 [vscode-lemon releases](https://github.com/Casaer-X/vscode-lemon/releases) 下载最新 `.vsix`
2. VS Code → Extensions → `...` → Install from VSIX...

或从源码安装：

```bash
cd vscode-lemon
npm install
npm run compile
# 按 F5 启动扩展开发主机
```

### 功能

- **语法高亮** — 关键字、类型、操作符、注释、字符串、数字等完整着色
- **代码片段** — `class`, `method`, `if`, `for`, `while`, `match`, `try`, `ctor`, `main` 等 23 个模板
- **括号匹配** — 自动配对 `{}`, `[]`, `()`, `""`, `''`
- **注释切换** — `Ctrl+/` 行注释，`Shift+Alt+A` 块注释
- **缩进规则** — 自动缩进/反缩进

### 代码片段速查

| 前缀 | 生成内容 |
|------|---------|
| `class` | 类声明 |
| `pclass` | public class 声明 |
| `xclass` | 带继承的 class 声明 |
| `iface` | 接口声明 |
| `enum` | 枚举声明 |
| `method` | 实例方法 |
| `smethod` | 静态方法 |
| `ctor` | 构造函数 (含 super 调用) |
| `main` | main 方法 |
| `field` | 字段声明 |
| `if` | if 语句 |
| `ifelse` | if-else 语句 |
| `for` | for 循环 |
| `foreach` | 数组遍历循环 |
| `while` | while 循环 |
| `match` | match 表达式 |
| `try` | try-catch 块 |
| `ret` | return 语句 |
| `printf` | System.printf 调用 |
| `pkg` | package 声明 |
| `var` | 变量声明 |
| `arr` | 数组创建 |
| `map` | Map 创建 |

---

## 版本历史

详见 [CHANGELOG.md](../CHANGELOG.md) 和 [changelogs/](../changelogs/) 目录。

当前版本：**v4.1.0** — IR 中间表示

- SSA IR 指令定义（40+ 操作码）
- AST → IR 生成器
- `--target ir` 输出选项
- 自举固定点已验证
