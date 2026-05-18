# Lemon 语言自举计划

> 自举（Bootstrap）是指用 Lemon 语言自身重写 Lemon 编译器，使编译器能够编译自身。
> 本文档评估当前 Lemon 语言的自我编译能力，识别缺失功能，并制定分阶段实施路线图。

---

## 一、当前语言能力评估

### 1.1 数据类型

| 类别 | 支持情况 | 详情 |
|------|---------|------|
| 原始类型 | ✅ 完整 | `void`, `bool`, `byte`, `char`, `short`, `int`, `long`, `float`, `double` |
| String | ⚠️ 基础 | 映射为 `const char*`，不可变，提供 10 个内建方法 |
| StringBuilder | ✅ 已实现 | C 运行时实现：new/append/appendChar/appendInt/appendLong/appendFloat/appendDouble/appendBool/toString/length/charAt/setCharAt/deleteCharAt/insert/clear |
| Array | ⚠️ 基础 | `Array<T>` 动态数组，支持 add/get/set/size/removeAt |
| Map | ⚠️ 基础 | `Map<K,V>` 哈希映射，FNV-1a + 开放寻址法 |
| 泛型 | ✅ 可用 | 单态化实现，支持类型约束 `T extends Comparable` |
| 函数指针 | ✅ 可用 | `void(int, String)` 形式 |
| 枚举/代数类型 | ✅ 已实现 | enum class + tagged union，支持变体携带数据 |
| 元组 | ❌ 缺失 | 无 tuple 类型 |
| Option/Maybe | ❌ 缺失 | 仅有 null，无可空类型安全表达 |

### 1.2 控制流

| 特性 | 支持情况 | 详情 |
|------|---------|------|
| if/else if/else | ✅ 完整 | — |
| for 循环 | ✅ 完整 | C 风格三段式 for |
| while 循环 | ✅ 完整 | — |
| break/continue | ✅ 完整 | — |
| return | ✅ 完整 | 支持值返回和空返回 |
| try/catch/finally | ✅ 完整 | 基于 setjmp/longjmp |
| throw | ✅ 完整 | — |
| switch/match | ✅ 已实现 | match 表达式，支持变体绑定、通配符、或模式 |
| for-each 迭代 | ✅ 已实现 | `for (Type item in collection)` 语法 |
| do-while | ❌ 缺失 | — |

### 1.3 OOP 特性

| 特性 | 支持情况 | 详情 |
|------|---------|------|
| 类定义 | ✅ 完整 | 字段、方法、构造函数、析构函数 |
| 继承 | ✅ 完整 | `extends` 单继承，`super` 调用 |
| 接口 | ✅ 完整 | `implements`，支持多接口，itable 调度 |
| 虚方法 | ✅ 完整 | `virtual`/`@override`，vtable 调度 |
| 抽象类 | ✅ 完整 | `abstract` 修饰符 |
| 访问控制 | ⚠️ 基础 | `public`/`private`，默认 public |
| 静态成员 | ✅ 完整 | `static` 方法/字段 |
| 方法重载 | ✅ 完整 | 按参数数量/类型区分 |
| 泛型类 | ✅ 完整 | 单态化实现 |
| final 修饰 | ✅ 完整 | 不可继承/重写 |
| 反射 | ⚠️ 实验性 | `@reflectable` 注解，`typeid` 运算符 |
| 析构函数 | ✅ 完整 | `~ClassName()` 语法 |

### 1.4 标准库

| 模块 | 支持情况 | 详情 |
|------|---------|------|
| String | ⚠️ 基础 | length/toUpperCase/toLowerCase/equals/trim/substring/indexOf/replace/intToString/toInt |
| Array | ⚠️ 基础 | add/get/set/size/removeAt |
| Map | ⚠️ 基础 | put/get/size/containsKey/remove |
| 文件 I/O | ✅ 已实现 | C 运行时实现：open/close/readAll/readLine/write/writeLine/hasNextLine/eof |
| 垃圾回收 | ⚠️ 框架 | gc_init/gc_alloc/gc_mark/gc_sweep，标记-清除框架 |
| 数学库 | ❌ 缺失 | 无 Math 类 |
| 字符处理 | ✅ 已实现 | C 运行时实现：isDigit/isLetter/isLetterOrDigit/isWhitespace/isUpperCase/isLowerCase/toUpperCase/toLowerCase/getNumericValue/isAlpha/isAlphaNumeric/isPrintable/fromInt/toInt |
| 集合库 | ❌ 缺失 | 无 Stack/Queue/Set/LinkedList |
| 正则表达式 | ❌ 缺失 | — |

### 1.5 代码生成目标

| 目标 | 支持情况 | 详情 |
|------|---------|------|
| C 代码 | ✅ 完整 | 默认目标，生成 .c 文件 |
| NASM 汇编 | ✅ 可用 | x86-64 汇编输出 |
| 原生可执行文件 | ✅ 可用 | 直接生成 COFF64 目标文件（Windows） |
| 直接编译为 exe | ✅ 可用 | 内置 PE32+ 链接器，无需外部 C 编译器即可生成 exe |
| 字节码 | ✅ 可用 | .lmb 格式，lemonvm JIT 执行 |
| **内置链接器** | ✅ **重大突破** | 原生 PE32+ 链接器，从 COFF64 直接生成 Windows 可执行文件；支持 DLL 导入表（msvcrt.dll）、导入跳转 thunk、GCC 特定符号内置桩（\_\_main），可独立生成完全可用的 Windows exe |

### 1.6 编译器管线

```
源码 → 词法分析(Lexer) → Token流 → 语法分析(Parser) → AST
     → 语义分析(Semantic) → IR生成 → 优化器 → 代码生成 → 目标代码
```

当前编译器（lemonc）完全用 Rust 编写，约 6000+ 行代码，涵盖：
- **词法分析器**（lexer.rs）：逐字符扫描，生成带位置信息的 Token
- **语法分析器**（parser.rs）：递归下降解析，构建 AST
- **语义分析器**（semantic.rs）：类型检查、继承验证、接口检查
- **IR 生成**（ir/）：中间表示生成
- **优化器**（optimizer.rs）：常量折叠/传播、死代码消除、代数化简
- **代码生成器**（codegen/）：C 代码、NASM、原生机器码、字节码四种后端

---

## 二、自举所需但当前缺失的功能

### 2.1 枚举类型与模式匹配（严重性：🔴 致命）— ✅ 已实现

**编译器需求：** AST 节点本质上是代数数据类型（ADT）。当前 Rust 实现中，`Declaration`、`Expr`、`Stmt`、`ClassMember` 等全部使用 enum 定义，包含数十个变体。词法分析器的 `TokenKind` 也是一个 60+ 变体的枚举。没有枚举类型，无法在 Lemon 中自然表达 AST。

**当前状况：** ✅ 已完整实现。`enum class` 支持 tagged union，变体可携带数据。`match` 表达式支持变体绑定、通配符、或模式。

**已实现功能：**
- `enum class` + tagged union，支持变体携带数据（payload）
- `match` 表达式，支持变体解构和绑定
- 通配符模式 `_`
- 或模式（or-patterns）

**影响范围：** 词法分析器、语法分析器、语义分析器、代码生成器——全部阶段

### 2.2 字符串操作能力（严重性：🔴 致命）— ✅ 部分已实现

**编译器需求：** 编译器是文本处理程序。词法分析器需要逐字符扫描和构建字符串；代码生成器需要大量字符串拼接来输出目标代码；错误报告需要格式化消息。

**当前状况：** ✅ 核心功能已实现。String 映射为 `const char*`，不可变，有 10 个内建方法。已新增：
- ✅ 字符串拼接运算符 `+`（支持自动类型转换）
- ✅ 可变字符串构建器 StringBuilder（C 运行时实现，完整 API）
- ❌ 字符串分割（split）
- ❌ 前缀/后缀检查（startsWith/endsWith）
- ❌ 字符串格式化（format）
- ⚠️ 字符与字符串的互转（部分通过 Character 类支持）
- ❌ 字符串比较运算符（`<`, `>`, `<=`, `>=`）

**已实现功能：**
- `StringBuilder` 类（C 运行时）：new/append/appendChar/appendInt/appendLong/appendFloat/appendDouble/appendBool/toString/length/charAt/setCharAt/deleteCharAt/insert/clear
- 字符串 `+` 拼接运算符（自动类型转换）

**仍需实现：**
- 字符串分割和格式化
- startsWith/endsWith
- 字符串比较运算符

**影响范围：** 全部阶段，尤其是词法分析和代码生成

### 2.3 文件 I/O（严重性：🔴 致命）— ✅ 已实现

**编译器需求：** 编译器必须读取源文件、写入输出文件。当前 lemonc 需要读取 `.lm` 文件并输出 `.c`/`.asm`/`.exe`/`.lmb` 文件。

**当前状况：** ✅ 已完整实现。C 运行时提供完整的 File I/O 支持：
- File.open/close/readAll/readLine/write/writeLine/hasNextLine/eof
- 命令行参数获取（已有 `String[] args`）

**已实现功能：**
- File 类（C 运行时）：open/close/readAll/readLine/write/writeLine/hasNextLine/eof
- 读取整个文件为字符串
- 逐行读取
- 写入字符串到文件

**仍需实现：**
- 文件存在性检查（exists）
- 二进制文件读写

**影响范围：** 编译器入口、文件读取、输出生成

### 2.4 字符处理（严重性：🟠 严重）— ✅ 已实现

**编译器需求：** 词法分析器是字符级处理器，需要判断字符类别（字母、数字、空白、符号）、字符比较、字符转义处理。

**当前状况：** ✅ 已完整实现。`char` 类型有完整的内建方法支持。Character 工具类在 C 运行时中实现，提供全面的字符判断和转换功能。

**已实现功能：**
- Character 工具类（C 运行时）：isDigit/isLetter/isLetterOrDigit/isWhitespace/isUpperCase/isLowerCase/toUpperCase/toLowerCase/getNumericValue/isAlpha/isAlphaNumeric/isPrintable/fromInt/toInt
- char 与 int 的互转（fromInt/toInt）
- 字符比较（通过 == 运算符）

**影响范围：** 词法分析器

### 2.5 模块系统与独立编译（严重性：🟠 严重）

**编译器需求：** lemonc 当前约 6000+ 行 Rust 代码，分布在 20+ 个源文件中。用 Lemon 重写后，需要将编译器拆分为多个模块（lexer、parser、semantic、codegen 等），每个模块独立开发和测试。

**当前状况：** Lemon 有 `package` 和 `import` 语法，项目构建系统（`--build`）支持多文件编译，但：
- 缺乏可见性控制（跨包访问规则不明确）
- 缺乏模块接口定义
- 缺乏独立编译能力（每次需编译全部文件）
- import 语义不够清晰（是源码包含还是模块引用？）

**最低需求：**
- 明确的模块边界和接口
- 模块间类型和函数的导出/导入
- 确保多文件项目能正确编译和链接

**影响范围：** 项目组织、开发效率

### 2.6 switch/match 语句（严重性：🟠 严重）— ✅ 已实现

**编译器需求：** 编译器中大量使用基于 Token 类型的分支分发。当前 Rust 实现中，词法分析器和语法分析器都大量使用 match 表达式。没有 switch/match，只能用 if-else 链，代码冗长且效率低。

**当前状况：** ✅ 已完整实现。
- `switch` 语句：支持 case/default/break
- `match` 表达式：支持变体绑定、通配符、或模式

**影响范围：** 词法分析器、语法分析器、代码生成器

### 2.7 集合类型扩展（严重性：🟡 中等）

**编译器需求：** 编译器需要多种数据结构：AST 节点列表（Array）、符号表（Map）、字符串常量池（Set）、作用域栈（Stack）等。

**当前状况：** 仅有 Array 和 Map，缺少 Stack、Set、Queue、LinkedList 等。

**最低需求：**
- Stack 类（push/pop/peek/isEmpty）
- Set 类（add/contains/remove/size）
- 可通过 Array 模拟 Stack，但效率较低

**影响范围：** 语法分析器（作用域栈）、语义分析器（符号表）

### 2.8 错误报告框架（严重性：🟡 中等）

**编译器需求：** 编译器需要精确的错误报告，包含文件名、行号、列号、错误级别、建议信息等。

**当前状况：** Lemon 的 Token 有 Span（行号、列号），但没有结构化的错误报告类。语义分析器有 `SemanticError` 枚举，但 Lemon 中无法表达。

**最低需求：**
- SourceLocation 类（file/line/column）
- Diagnostic 类（level/message/location）
- 格式化输出（带颜色/位置标记）

**影响范围：** 全部阶段的错误处理

### 2.9 可空类型安全（严重性：🟡 中等）

**编译器需求：** 编译器中大量使用可选值：`Option<Expr>`（可选初始化器）、`Option<Block>`（抽象方法无方法体）、`Option<TypeRef>`（可选父类）等。

**当前状况：** 有 `null` 值，但没有 Option 类型或可空类型标注。所有引用类型均可为 null，缺乏编译期空安全检查。

**最低需求：**
- Option<T> 泛型类（或可空类型语法 `T?`）
- 安全的空值检查和解构

**影响范围：** 全部阶段

### 2.10 其他缺失功能

| 功能 | 严重性 | 说明 |
|------|--------|------|
| for-each 迭代语法 | 🟡 中等 | ✅ 已实现：`for (Type item in collection)` |
| 字符串插值 | 🟢 轻微 | `"$name is $age"` 形式，代码生成中大量拼接字符串 |
| 运算符重载 | 🟢 轻微 | `==` 自定义比较，对 AST 节点比较有用 |
| 委托/组合 | 🟢 轻微 | 减少继承层次 |
| 闭包捕获改进 | 🟢 轻微 | Lambda 当前支持，但捕获语义需验证 |
| 内联函数 | 🟢 轻微 | 编译器性能优化 |
| 宏系统 | 🟢 轻微 | 代码生成中的模板化 |

---

## 三、自举路线图

```
Phase 1 ─── Phase 2 ─── Phase 3 ─── Phase 4 ─── Phase 5 ─── Phase 6
补齐核心     重写词法     重写语法     重写语义     重写代码     自举验证
缺失功能     分析器       分析器       分析器       生成器
  ✅           ⚠️🔥
已完成      进行中（内置PE链接器已突破）
```

### 总体原则

1. **渐进式替换**：每个阶段用 Lemon 重写一个编译器组件，其余组件仍使用 Rust 版本，通过 C 互操作衔接
2. **验证驱动**：每个阶段必须通过完整的测试套件，确保重写后的组件行为与 Rust 版本一致
3. **最小依赖**：优先实现编译器自举所需的语言特性，避免过度设计
4. **双轨并行**：Rust 版编译器持续维护，直到 Lemon 版本完全自举

---

## 四、各阶段详细规划

### Phase 1：补齐核心缺失功能 — ✅ 已完成

**目标：** 为 Lemon 语言添加自举所需的关键语言特性和标准库，使 Lemon 具备编写编译器组件的基础能力。

**状态：** ✅ 全部核心功能已实现。Lemon 已具备编写编译器组件的基础能力。

#### 1.1 需要新增的语言特性

| 特性 | 优先级 | 实现方案 | 预计工作量 |
|------|--------|----------|-----------|
| 枚举类型（enum class） | P0 | ✅ 已实现：`enum` 语法，编译为 tagged union（struct + kind 字段 + union payload） | 3-4 周 |
| match 表达式 | P0 | ✅ 已实现：`match` 语法，支持变体绑定、通配符、或模式 | 2-3 周 |
| switch 语句 | P0 | ✅ 已实现：`switch`/`case` 语法，支持 case/default/break | 1 周 |
| 字符串拼接 `+` | P0 | ✅ 已实现：编译器内建处理，支持自动类型转换 | 1 周 |
| for-each 循环 | P1 | ✅ 已实现：`for (T item in collection)` 语法 | 1 周 |
| 可空类型 `T?` | P1 | ❌ 未实现：语法糖，编译为带 null 检查的引用或 Option 结构体 | 1-2 周 |

**enum 设计草案：**

```
enum TokenKind {
    Class,
    Interface,
    If,
    Else,
    Identifier(String),
    IntegerLiteral(long),
    StringLiteral(String),
    // ...
}

enum Expr {
    IntegerLiteral(long),
    StringLiteral(String),
    BinaryOp(BinaryOp, Expr, Expr),
    UnaryOp(UnaryOp, Expr),
    Call(Expr, Array<Expr>),
    // ...
}
```

**编译为 C 的策略：**

```c
// enum TokenKind 编译为：
typedef struct {
    int kind;  // 0=Class, 1=Interface, 2=If, ...
} TokenKind;

// enum Expr 编译为：
typedef struct {
    int kind;  // 0=IntegerLiteral, 1=StringLiteral, 2=BinaryOp, ...
    union {
        int64_t integer_value;
        const char* string_value;
        struct { int op; Expr* left; Expr* right; } binary_op;
        // ...
    } data;
} Expr;
```

#### 1.2 需要新增的标准库

| 类 | 优先级 | 方法 | 预计工作量 |
|----|--------|------|-----------|
| StringBuilder | P0 | ✅ 已实现（C 运行时）：new/append/appendChar/appendInt/appendLong/appendFloat/appendDouble/appendBool/toString/length/charAt/setCharAt/deleteCharAt/insert/clear | 1 周 |
| File | P0 | ✅ 已实现（C 运行时）：open/close/readAll/readLine/write/writeLine/hasNextLine/eof | 1-2 周 |
| Character | P0 | ✅ 已实现（C 运行时）：isDigit/isLetter/isLetterOrDigit/isWhitespace/isUpperCase/isLowerCase/toUpperCase/toLowerCase/getNumericValue/isAlpha/isAlphaNumeric/isPrintable/fromInt/toInt | 3 天 |
| Stack | P1 | ❌ 未实现：new/push/pop/peek/isEmpty/size | 3 天 |
| Set | P1 | ❌ 未实现：new/add/contains/remove/size | 3 天 |

**StringBuilder 设计草案：**

```
class StringBuilder {
    private char[] buffer;
    private int length;
    private int capacity;

    public StringBuilder() {
        this.capacity = 256;
        this.buffer = new char[this.capacity];
        this.length = 0;
    }

    public StringBuilder append(String s) {
        int slen = s.length();
        this.ensureCapacity(this.length + slen);
        // 逐字符拷贝
        for (int i = 0; i < slen; i++) {
            this.buffer[this.length + i] = s.charAt(i);
        }
        this.length += slen;
        return this;
    }

    public StringBuilder appendChar(char c) { /* ... */ }
    public StringBuilder appendInt(int v) { return this.append(String.intToString(v)); }

    public String toString() {
        return String.fromCharArray(this.buffer, 0, this.length);
    }

    private void ensureCapacity(int needed) {
        if (needed > this.capacity) {
            int newCap = this.capacity * 2;
            if (newCap < needed) newCap = needed;
            char[] newBuf = new char[newCap];
            for (int i = 0; i < this.length; i++) {
                newBuf[i] = this.buffer[i];
            }
            this.buffer = newBuf;
            this.capacity = newCap;
        }
    }
}
```

#### 1.3 验证标准

- [x] enum 类型可声明、实例化、在 match 中解构 ✅
- [x] match 表达式编译正确，支持变体绑定、通配符、或模式 ✅
- [x] switch 语句支持 case/default/break ✅
- [x] 字符串 `+` 拼接运算符工作正常（支持自动类型转换） ✅
- [x] StringBuilder 通过单元测试（C 运行时实现，完整 API） ✅
- [x] File 类可读写文本文件（C 运行时实现） ✅
- [x] Character 工具类所有方法正确（C 运行时实现） ✅
- [x] for-each 循环 `for (Type item in collection)` 正常工作 ✅
- [ ] 现有测试套件全部通过（无回归）
- [ ] 可空类型 `T?` / Option<T>（P1，尚未实现）

---

### Phase 2：用 Lemon 重写词法分析器 — ⚠️ 进行中

**目标：** 用 Lemon 语言重写词法分析器，替代当前 Rust 实现的 `lexer.rs`。

**状态：** ⚠️ 部分完成。Lemon 版词法分析器已在 `src_lem/lexer/` 目录下编写，包含以下文件：
- `Span.lm` — 位置信息类
- `TokenKind.lm` — Token 类型枚举
- `Token.lm` — Token 类
- `Lexer.lm` — 词法分析器核心逻辑
- `LexerTest.lm` — 词法分析器测试

> **🔥 重大突破：原生 PE32+ 链接器**
>
> Lemon 编译器现已内置原生 PE32+ 链接器，可直接从 COFF64 目标文件生成 Windows PE 可执行文件，
> **无需外部 C 编译器**。这对自举具有革命性意义：
> - Lemon 编译器可以完全独立地生成可执行文件，不再依赖 GCC/Clang
> - 自举验证时，Lemon 版编译器可直接输出 exe，无需安装任何外部工具链
> - 编译管线缩短为：`源码 → lemonc → exe`（一步到位）
> - 这使得 Lemon 成为真正的"自包含"编译器，大幅降低自举的工程复杂度

#### 2.0 原生链接器对测试方法的影响

内置 PE32+ 链接器的完整可用性对 Phase 2 的测试方法产生了根本性影响：

**`--target native` 路径现已独立工作（无需 GCC）：**

此前，`--target native` 生成的 COFF64 目标文件仍需通过外部链接器（如 GCC 的 `ld`）才能生成可执行文件。现在，内置链接器直接将 COFF64 目标文件链接为 PE32+ 可执行文件，整个编译管线完全内部化：

```
.lm 源码 → lemonc 前端 → COFF64 目标文件 → 内置 PE32+ 链接器 → PE32+ exe
```

**Phase 2.4 测试 Lemon 词法分析器的新路径：**

可以使用 `--target native` 直接编译和运行 Lemon 版词法分析器的测试程序，无需安装 GCC 或任何外部工具链。测试流程简化为：

```bash
lemonc --target native LexerTest.lm -o LexerTest.exe
./LexerTest.exe
```

**内置链接器已支持的关键功能：**

| 功能 | 说明 |
|------|------|
| DLL 导入表 | 自动生成 msvcrt.dll 的导入目录和导入名称表 |
| 导入跳转 thunk | 为每个导入函数生成 `__imp__` 间接跳转桩 |
| 内置符号桩 | 为 GCC 特定符号（如 `__main`）提供内置实现，无需链接 libgcc |
| COFF64 解析 | 完整解析 COFF64 目标文件的节表、符号表、重定位表 |
| PE32+ 生成 | 生成合法的 DOS 头 + PE 头 + 节 + .idata 导入表 |

**原生链接器开发过程中修复的关键 Bug：**

在实现内置 PE32+ 链接器的过程中，发现并修复了以下重要 Bug：

| Bug | 说明 | 修复 |
|-----|------|------|
| DOS 头 e_lfanew 偏移错误 | `e_lfanew` 字段位于偏移 58 而非正确的 60，导致 PE 头定位失败 | 修正为偏移 60 |
| COFF 解析器辅助符号索引映射 | 辅助符号（auxiliary symbol）的索引计算不正确，导致符号表解析错位 | 修正辅助符号索引跳过逻辑 |
| C 代码生成器重复定义 String_length | `String_length` 函数被重复生成，导致链接时多重定义错误 | 去重，确保每个内建方法只生成一次 |
| C 代码生成器缺少 Array_String 类型 | `Array<String>` 的单态化类型未生成，导致链接时未定义引用 | 添加 Array_String 的自动单态化生成 |
| %lld 格式问题 | MSVC 的 `printf` 不支持 `%lld`（应为 `%I64d`），导致 long 类型输出错误 | 在 native 目标下使用正确的 MSVC 格式说明符 |
| MajorSubsystemVersion 为 0 | PE 头的子系统版本号设为 0，导致 Windows 拒绝加载 exe | 修正为 6（对应 Windows Vista+） |
| .idata 节特性标志错误 | `.idata` 节的对齐标志不正确，导致 Windows 加载器无法正确映射导入表 | 修正节特性标志，添加正确的对齐和读写权限 |

#### 2.1 词法分析器分析

当前 Rust 词法分析器（[lexer.rs](lemonc/src/lexer/lexer.rs)）的核心逻辑：

- **输入：** 源码字符串
- **输出：** Token 数组（带 Span 位置信息）
- **核心逻辑：** 逐字符扫描，识别关键字/标识符/字面量/运算符/分隔符
- **Token 类型：** 60+ 种（见 [token.rs](lemonc/src/lexer/token.rs)）
- **代码量：** 约 400 行 Rust

#### 2.2 Lemon 版词法分析器设计

```
enum TokenKind {
    Class, Interface, Extends, Implements,
    Abstract, Virtual, Override, Final,
    Static, Public, Private, Reflectable,
    New, Delete, Null, True, False,
    If, Else, For, While, Return, Break, Continue,
    Try, Catch, Throw, Import, Package, Extern,
    Sizeof, TypeId, This, Super, InstanceOf,
    At, As, Finally,
    Void, Bool, Byte, Char, Short, Int, Long, Float, Double,
    Identifier(String),
    IntegerLiteral(long),
    FloatLiteral(double),
    StringLiteral(String),
    CharLiteral(char),
    Plus, Minus, Star, Slash, Percent,
    Amp, Pipe, Caret, Tilde,
    Lt, Gt, Le, Ge, Eq, Ne,
    And, Or, Not,
    Assign, PlusAssign, MinusAssign,
    StarAssign, SlashAssign, PercentAssign,
    AndAssign, OrAssign, XorAssign,
    Shl, Shr, ShlAssign, ShrAssign,
    Inc, Dec, Arrow,
    LeftParen, RightParen,
    LeftBrace, RightBrace,
    LeftBracket, RightBracket,
    Comma, Dot, Semicolon, Colon, Question,
    EndOfFile,
    Error(String)
}

class Span {
    int start;
    int end;
    int line;
    int column;
}

class Token {
    TokenKind kind;
    Span span;
}

class Lexer {
    private String source;
    private int pos;
    private int line;
    private int col;

    public Lexer(String src) {
        this.source = src;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
    }

    public Array<Token> tokenize() {
        Array<Token> tokens = new Array<Token>();
        while (true) {
            Token tok = this.nextToken();
            tokens.add(tok);
            match (tok.kind) {
                TokenKind.EndOfFile => break;
                _ => {}
            }
        }
        return tokens;
    }

    private Token nextToken() {
        this.skipWhitespace();
        int startPos = this.pos;
        int startLine = this.line;
        int startCol = this.col;

        char c = this.peekChar();
        if (c == '\0') {
            return this.makeToken(TokenKind.EndOfFile, startPos, this.pos);
        }

        // 单字符 Token
        match (c) {
            '(' => { this.advance(); return this.makeToken(TokenKind.LeftParen, startPos, this.pos); }
            ')' => { this.advance(); return this.makeToken(TokenKind.RightParen, startPos, this.pos); }
            // ... 其余单字符
            _ => {}
        }

        // 多字符 Token：标识符/关键字
        if (Character.isAlpha(c) || c == '_') {
            return this.scanIdentifierOrKeyword();
        }

        // 数字字面量
        if (Character.isDigit(c)) {
            return this.scanNumber();
        }

        // 字符串字面量
        if (c == '"') {
            return this.scanString();
        }

        // 运算符
        return this.scanOperator();
    }
}
```

#### 2.3 需要新增的语言特性

| 特性 | 来源阶段 | 说明 |
|------|---------|------|
| enum 类型 | Phase 1 | TokenKind 必须用 enum 表达 |
| match 表达式 | Phase 1 | 字符/Token 类型分发 |
| Character 工具类 | Phase 1 | isDigit/isAlpha/isWhitespace |
| StringBuilder | Phase 1 | 构建标识符/字符串字面量 |
| String.charAt() | Phase 1 新增 | 逐字符访问源码 |
| char 数组 | 需新增 | 字符串内部表示 |

#### 2.4 需要新增的标准库

| 类/方法 | 说明 |
|---------|------|
| String.charAt(int) | 获取指定位置的字符 |
| String.fromCharArray(char[], int, int) | 从字符数组构建字符串 |
| String.codePointAt(int) | 获取字符的 ASCII/Unicode 码点 |

#### 2.5 预计工作量

| 任务 | 预计时间 |
|------|---------|
| Lemon 版 Lexer 编写 | 1-2 周 |
| 与 Rust 版输出对比测试 | 3 天 |
| Bug 修复和边界情况处理 | 1 周 |
| **合计** | **2-3 周** |

#### 2.6 验证标准

- [ ] Lemon 版 Lexer 对所有 `.lm` 测试文件的 Token 输出与 Rust 版完全一致
- [ ] 正确处理所有 60+ 种 Token 类型
- [ ] 正确处理注释（行注释 `//` 和块注释 `/* */`）
- [ ] 正确处理字符串转义（`\n`, `\t`, `\\`, `\"`）
- [ ] 正确追踪行号和列号（Span 信息）
- [ ] 错误 Token 能正确报告位置
- [ ] 性能：对 10000 行源码的词法分析时间不超过 Rust 版的 3 倍
- [x] Lemon 版 Lexer 源码已编写（src_lem/lexer/） ✅
- [x] Span/TokenKind/Token/Lexer 类已定义 ✅

---

### Phase 3：用 Lemon 重写语法分析器

**目标：** 用 Lemon 语言重写递归下降语法分析器，替代当前 Rust 实现的 `parser.rs`。

#### 3.1 语法分析器分析

当前 Rust 语法分析器（[parser.rs](lemonc/src/parser/parser.rs)）的核心逻辑：

- **输入：** Token 数组
- **输出：** AST（Program 节点）
- **核心逻辑：** 递归下降解析，每个语法结构对应一个解析方法
- **AST 节点类型：** 15+ 种声明、9 种语句、20+ 种表达式（见 [node.rs](lemonc/src/ast/node.rs)）
- **代码量：** 约 1500 行 Rust（最大组件）

#### 3.2 Lemon 版语法分析器设计

```
enum Declaration {
    Class(ClassDecl),
    Interface(InterfaceDecl),
    Function(FunctionDecl),
    Variable(VarDecl),
    Import(ImportDecl),
    Package(PackageDecl),
}

enum Stmt {
    Block(Block),
    Expr(Expr),
    If(Expr, Stmt, Option<Stmt>),
    For(Option<Stmt>, Option<Expr>, Option<Expr>, Stmt),
    While(Expr, Stmt),
    Return(Option<Expr>),
    Break,
    Continue,
    Try(Block, Array<CatchClause>, Option<Block>),
    VarDecl(VarDecl),
}

enum Expr {
    IntegerLiteral(long),
    FloatLiteral(double),
    StringLiteral(String),
    CharLiteral(char),
    BoolLiteral(bool),
    Null,
    This,
    Super,
    Variable(String),
    BinaryOp(BinaryOp, Expr, Expr),
    UnaryOp(UnaryOp, Expr),
    Assignment(Expr, Expr),
    Call(Expr, Array<Expr>),
    MethodCall(Expr, String, Array<Expr>),
    FieldAccess(Expr, String),
    ArrayAccess(Expr, Expr),
    New(String, Array<TypeRef>, Array<Expr>),
    Delete(Expr),
    Cast(TypeRef, Expr),
    InstanceOf(Expr, TypeRef),
    Sizeof(TypeRef),
    TypeId(Expr),
    Lambda(Array<Param>, LambdaBody),
    Ternary(Expr, Expr, Expr),
    Throw(Expr),
}

class Parser {
    private Array<Token> tokens;
    private int pos;
    private Array<String> errors;

    public Parser(Array<Token> toks) {
        this.tokens = toks;
        this.pos = 0;
        this.errors = new Array<String>();
    }

    public Program parse() {
        Array<Declaration> decls = this.parseProgram();
        return new Program(decls);
    }

    private Declaration parseDeclaration() {
        Token tok = this.peek();
        match (tok.kind) {
            TokenKind.Class => return this.parseClassDecl();
            TokenKind.Interface => return this.parseInterfaceDecl();
            TokenKind.Import => return this.parseImportDecl();
            TokenKind.Package => return this.parsePackageDecl();
            _ => {
                // 尝试解析函数或变量声明
                return this.parseFunctionOrVarDecl();
            }
        }
    }

    private Expr parseExpression() {
        return this.parseAssignment();
    }

    private Expr parseAssignment() {
        Expr left = this.parseTernary();
        if (this.matchKind(TokenKind.Assign)) {
            Expr right = this.parseAssignment();
            return Expr.Assignment(left, right);
        }
        return left;
    }

    // ... 递归下降的优先级层次
}
```

#### 3.3 需要新增的语言特性

| 特性 | 来源阶段 | 说明 |
|------|---------|------|
| enum 类型（携带数据的变体） | Phase 1 | AST 节点必须用携带数据的 enum |
| match 表达式（变体解构） | Phase 1 | Token 类型分发和 AST 遍历 |
| Option<T> | Phase 1 | 可选的 else 分支、可选的初始值等 |
| 泛型类增强 | 需增强 | `Array<Token>`、`Array<Expr>` 等嵌套泛型 |

#### 3.4 需要新增的标准库

| 类/方法 | 说明 |
|---------|------|
| Array<T> 泛型增强 | 确保嵌套泛型（如 `Array<Array<Expr>>`）正确单态化 |
| String.join(Array<String>) | 错误消息拼接 |

#### 3.5 预计工作量

| 任务 | 预计时间 |
|------|---------|
| AST 节点类/enum 定义 | 1 周 |
| Parser 核心逻辑编写 | 2-3 周 |
| 与 Rust 版 AST 对比测试 | 1 周 |
| 错误恢复和边界情况 | 1 周 |
| **合计** | **5-6 周** |

#### 3.6 验证标准

- [ ] Lemon 版 Parser 对所有 `.lm` 测试文件的 AST 输出与 Rust 版结构一致
- [ ] 正确解析所有语法结构（类、接口、泛型、异常处理、Lambda 等）
- [ ] 正确处理运算符优先级和结合性
- [ ] 语法错误能正确报告位置和期望的 Token
- [ ] 错误恢复机制有效（遇到错误后能继续解析）
- [ ] Lemon 版 Parser + Rust 版 Semantic/CodeGen 能完整编译测试程序

---

### Phase 4：用 Lemon 重写语义分析器

**目标：** 用 Lemon 语言重写语义分析器，替代当前 Rust 实现的 `semantic.rs`。

#### 4.1 语义分析器分析

当前 Rust 语义分析器（[semantic.rs](lemonc/src/ast/semantic.rs)）的核心逻辑：

- **输入：** AST
- **输出：** 语义错误/警告列表
- **核心逻辑：**
  - 类型检查（变量类型、返回类型、赋值兼容性）
  - 继承验证（循环继承检测、重写合法性）
  - 接口检查（方法签名匹配、未实现方法检测）
  - 作用域和可见性检查
  - 裸方法调用检测
- **代码量：** 约 800 行 Rust

#### 4.2 Lemon 版语义分析器设计

```
enum SemanticError {
    UndefinedType(String),
    UndefinedVariable(String),
    UndefinedMethod(String, String),       // class, method
    UndefinedClass(String),
    DuplicateDefinition(String),
    TypeMismatch(String, String),          // expected, found
    NotAClass(String),
    CircularInheritance(String),
    MissingOverride(String, String),       // class, method
    InvalidOverride(String, String, String), // class, method, reason
    AbstractMethodNotImplemented(String, String),
    FieldShadowing(String, String),        // class, field
    InvalidAccess(String, String),         // member, class
    InterfaceMethodNotImplemented(String, String, String), // class, interface, method
    InterfaceMethodSignatureMismatch(String, String, String, String),
    BareMethodCall(String, String),        // method, class
}

class SemanticAnalyzer {
    private Map<String, ClassDecl> classTable;
    private Map<String, InterfaceDecl> interfaceTable;
    private Array<SemanticError> errors;
    private Array<String> warnings;

    public SemanticAnalyzer() {
        this.classTable = new Map<String, ClassDecl>();
        this.interfaceTable = new Map<String, InterfaceDecl>();
        this.errors = new Array<SemanticError>();
        this.warnings = new Array<String>();
    }

    public Array<SemanticError> analyze(Program ast) {
        this.buildSymbolTable(ast);
        this.checkInheritance();
        this.checkInterfaces();
        this.checkTypeUsage();
        return this.errors;
    }

    private void buildSymbolTable(Program ast) {
        for (int i = 0; i < ast.declarations.size(); i++) {
            Declaration decl = ast.declarations.get(i);
            match (decl) {
                Declaration.Class(c) => {
                    if (this.classTable.containsKey(c.name)) {
                        this.errors.add(SemanticError.DuplicateDefinition(c.name));
                    } else {
                        this.classTable.put(c.name, c);
                    }
                }
                Declaration.Interface(iface) => {
                    this.interfaceTable.put(iface.name, iface);
                }
                _ => {}
            }
        }
    }
}
```

#### 4.3 需要新增的语言特性

| 特性 | 来源阶段 | 说明 |
|------|---------|------|
| enum 类型（携带多个字段） | Phase 1 | SemanticError 的变体携带不同数据 |
| match 表达式 | Phase 1 | AST 节点分发 |
| Map 增强操作 | 需新增 | keys()/values()/forEach() |
| String 比较运算符 | Phase 1 | 类型名比较 |

#### 4.4 需要新增的标准库

| 类/方法 | 说明 |
|---------|------|
| Map.keys() | 获取所有键的集合 |
| Map.values() | 获取所有值的集合 |
| String.startsWith()/endsWith() | 类型名前缀匹配 |

#### 4.5 预计工作量

| 任务 | 预计时间 |
|------|---------|
| 符号表构建 | 1 周 |
| 继承验证 | 1 周 |
| 接口检查 | 1 周 |
| 类型检查 | 2 周 |
| 与 Rust 版错误输出对比 | 3 天 |
| **合计** | **5-6 周** |

#### 4.6 验证标准

- [ ] Lemon 版 Semantic 对所有测试文件的错误/警告输出与 Rust 版一致
- [ ] 正确检测循环继承
- [ ] 正确验证接口方法签名匹配
- [ ] 正确检测未实现的抽象方法
- [ ] 正确检测裸方法调用
- [ ] Lemon 版 Lexer + Parser + Semantic + Rust 版 CodeGen 能完整编译测试程序

---

### Phase 5：用 Lemon 重写代码生成器

**目标：** 用 Lemon 语言重写代码生成器，替代当前 Rust 实现的 `c_gen.rs`、`nasm_gen.rs`、`native_gen.rs`、`bc_gen.rs`。

#### 5.1 代码生成器分析

当前 Rust 代码生成器（[c_gen.rs](lemonc/src/codegen/c_gen.rs)）的核心逻辑：

- **输入：** AST
- **输出：** C 源代码 / NASM 汇编 / 原生机器码 / 字节码
- **核心逻辑：**
  - C 代码生成：遍历 AST，生成对应的 C 代码（结构体、函数、vtable、itable）
  - 字符串常量池管理
  - 虚方法表生成
  - 接口方法表生成
  - 泛型实例化
  - 方法重载解析
  - 异常处理代码生成（setjmp/longjmp）
- **代码量：** C 生成器约 2250 行，其余后端各约 500-1000 行

#### 5.2 Lemon 版代码生成器设计

> **🔥 内置 PE 链接器对 Phase 5 的影响**
>
> 由于内置 PE32+ 链接器已完全可用，Lemon 版代码生成器可以直接输出 COFF64 目标文件，
> 然后通过内置 PE 链接器生成可执行文件。这意味着自举后的编译器将**完全独立于任何外部工具链**：
>
> - **无需 GCC/Clang**：Lemon 版编译器可直接输出 COFF64 → PE32+ exe，不需要 C 编译器作为中间步骤
> - **无需外部链接器**：内置链接器处理所有符号解析、重定位、DLL 导入
> - **编译管线**：`.lm` 源码 → Lemon 版前端 → Lemon 版 COFF64 代码生成器 → 内置 PE 链接器 → exe
> - **自包含性**：自举后的 Lemon 编译器仅依赖 msvcrt.dll（Windows 系统 DLL），无需任何第三方工具
>
> 这大幅简化了 Phase 5 的工作量——不再需要生成 C 代码再通过 GCC 编译，而是直接生成 COFF64 目标文件，
> 与内置链接器无缝衔接。

```
class CCodeGen {
    private StringBuilder output;
    private int indent;
    private Array<String> stringLiterals;
    private int stringCounter;
    private String currentClass;
    private String parentClass;
    private Map<String, String> varTypes;
    private Map<String, Array<KeyValuePair>> classFields;
    private Map<String, Array<VirtualMethodEntry>> virtualMethods;
    private Map<String, Array<InterfaceMethodEntry>> interfaceMethods;
    private Map<String, Array<String>> classImplements;
    private Set<String> interfaceNames;
    private int excCounter;

    public CCodeGen() {
        this.output = new StringBuilder();
        this.indent = 0;
        this.stringLiterals = new Array<String>();
        this.stringCounter = 0;
        this.varTypes = new Map<String, String>();
        this.classFields = new Map<String, Array<KeyValuePair>>();
        this.virtualMethods = new Map<String, Array<VirtualMethodEntry>>();
        this.interfaceMethods = new Map<String, Array<InterfaceMethodEntry>>();
        this.classImplements = new Map<String, Array<String>>();
        this.interfaceNames = new Set<String>();
        this.excCounter = 0;
    }

    public String generate(Program ast) {
        this.collectClassFields(ast);
        this.collectVirtualMethods(ast);
        this.collectInterfaceInfo(ast);
        this.collectGenericInstances(ast);
        this.collectMethodSignatures(ast);

        this.emitLine("#include <stdio.h>");
        this.emitLine("#include <stdlib.h>");
        this.emitLine("#include <string.h>");
        this.emitLine("#include <stdint.h>");

        this.emitLine("");

        this.emitRuntimeHelpers();
        this.emitStringLiterals();

        for (int i = 0; i < ast.declarations.size(); i++) {
            this.generateDeclaration(ast.declarations.get(i));
        }

        return this.output.toString();
    }

    private void emitLine(String line) {
        for (int i = 0; i < this.indent; i++) {
            this.output.append("    ");
        }
        this.output.append(line);
        this.output.append("\n");
    }
}
```

#### 5.3 需要新增的语言特性

| 特性 | 来源阶段 | 说明 |
|------|---------|------|
| StringBuilder | Phase 1 | 代码生成的核心工具 |
| 文件 I/O | Phase 1 | 写入输出文件 |
| String 格式化 | 需新增 | 生成 C 代码时的格式化输出 |
| 泛型增强 | 需增强 | 复杂泛型实例化（嵌套 Map 等） |

#### 5.4 需要新增的标准库

| 类/方法 | 说明 |
|---------|------|
| String.format() | printf 风格的格式化字符串 |
| File.writeAll() | 将生成结果写入文件 |
| StringBuilder.appendFloat/Double | 浮点数转字符串追加 |

#### 5.5 预计工作量

| 任务 | 预计时间 |
|------|---------|
| C 代码生成器重写 | 3-4 周 |
| 运行时辅助函数生成 | 1 周 |
| 字符串常量池管理 | 3 天 |
| vtable/itable 生成 | 1 周 |
| 泛型实例化代码生成 | 1 周 |
| 异常处理代码生成 | 1 周 |
| NASM 后端重写 | 2 周 |
| 原生机器码后端重写 | 3 周 |
| 字节码后端重写 | 2 周 |
| 与 Rust 版输出对比测试 | 2 周 |
| **合计** | **16-20 周** |

> 注：可先只实现 C 代码生成后端，其余后端后续补充。

#### 5.6 验证标准

- [ ] Lemon 版 CCodeGen 生成的 C 代码与 Rust 版完全一致（或语义等价）
- [ ] 生成的 C 代码能通过 GCC/Clang 编译
- [ ] 编译后的可执行文件行为正确
- [ | 字符串常量池正确生成
- [ ] vtable 和 itable 正确生成
- [ ] 泛型类正确单态化
- [ ] 异常处理（try/catch/finally）正确生成
- [ ] Lemon 版完整编译器（Lexer+Parser+Semantic+CCodeGen）能编译所有测试程序

---

### Phase 6：自举验证

**目标：** 验证 Lemon 编译器能够编译自身，完成自举。

#### 6.1 自举验证流程

> **🔥 内置 PE 链接器使自举验证完全无需外部工具链**
>
> 由于内置 PE32+ 链接器已完全可用，自举验证的整个流程不再依赖 GCC 或任何外部 C 编译器。
> Rust 版 lemonc 和 Lemon 版编译器都通过内置链接器直接生成 PE32+ 可执行文件。

```
第一轮（T0）：
  Rust 版 lemonc → 编译 Lemon 版编译器源码 → lemonc_v1.exe
  （通过内置 PE 链接器直接生成 exe，无需 GCC）

第二轮（T1）：
  lemonc_v1.exe → 编译 Lemon 版编译器源码 → lemonc_v2.exe
  （Lemon 版编译器自身也使用内置 PE 链接器）

第三轮（T2）：
  lemonc_v2.exe → 编译 Lemon 版编译器源码 → lemonc_v3.exe

验证：
  lemonc_v2.exe 与 lemonc_v3.exe 二进制完全一致（固定点验证）
```

这是经典的**三阶段自举验证**，且全程无需任何外部工具链：
1. **T0**：用现有编译器（Rust 版）通过内置 PE 链接器编译新编译器源码
2. **T1**：用新编译器通过内置 PE 链接器编译自身
3. **T2**：用 T1 产物再次编译自身
4. **验证**：T1 和 T2 产物二进制一致，说明编译器已稳定

#### 6.2 自举测试矩阵

| 测试项 | 说明 |
|--------|------|
| 编译自身 | Lemon 编译器能编译自身的全部源码 |
| 输出一致性 | T1 和 T2 产物二进制一致 |
| 功能等价 | Lemon 版编译器能正确编译所有测试程序 |
| 性能对比 | 编译速度与 Rust 版的差距在可接受范围（<5x） |
| 错误报告 | Lemon 版编译器的错误报告质量不低于 Rust 版 |
| 跨平台 | 至少在 Windows 上完成自举 |

#### 6.3 预计工作量

| 任务 | 预计时间 |
|------|---------|
| 集成测试和 Bug 修复 | 2-3 周 |
| 三阶段自举验证 | 1 周 |
| 性能优化 | 1-2 周 |
| 文档和发布 | 1 周 |
| **合计** | **5-7 周** |

#### 6.4 验证标准

- [ ] 三阶段自举成功，T1 和 T2 产物二进制一致
- [ ] Lemon 版编译器能编译自身
- [ ] Lemon 版编译器能编译所有现有测试程序
- [ ] 编译速度在 Rust 版的 5 倍以内
- [ ] 无内存泄漏（通过 Valgrind/ASan 验证）

---

## 五、总体时间估算

| 阶段 | 预计时间 | 累计时间 | 状态 |
|------|---------|---------|------|
| Phase 1：补齐核心缺失功能 | 8-12 周 | 8-12 周 | ✅ 已完成 |
| Phase 2：重写词法分析器 | 2-3 周 | 10-15 周 | ⚠️ 进行中（源码已编写，待测试验证） |
| Phase 3：重写语法分析器 | 5-6 周 | 15-21 周 | ❌ 未开始 |
| Phase 4：重写语义分析器 | 5-6 周 | 20-27 周 | ❌ 未开始 |
| Phase 5：重写代码生成器 | 16-20 周 | 36-47 周 | ❌ 未开始 |
| Phase 6：自举验证 | 5-7 周 | 41-54 周 | ❌ 未开始 |
| **总计** | **41-54 周** | **约 10-14 个月** | |

> 注：以上为单人全职开发的估算。如果是业余时间开发，实际时间可能翻倍（20-28 个月）。

---

## 六、风险与缓解策略

| 风险 | 概率 | 影响 | 缓解策略 |
|------|------|------|---------|
| ~~enum/match 实现复杂度超预期~~ | ~~高~~ | ~~延迟 Phase 1~~ | ✅ 已实现，风险已消除 |
| 泛型单态化导致编译时间爆炸 | 中 | 编译自身时极慢 | 限制泛型实例化深度；引入泛型共享（box 化）策略 |
| C 代码生成器重写工作量过大 | 高 | 延迟 Phase 5 | 优先只实现 C 后端；其余后端延后；内置 PE 链接器已降低外部依赖 |
| 运行时库性能不足 | 中 | 编译速度慢 | ✅ 关键运行时已用 C 实现（StringBuilder、File I/O、Character），性能有保障 |
| 内存管理问题 | 中 | 运行时崩溃 | 完善 GC 实现；关键路径使用手动 delete |
| 自举过程中发现语言设计缺陷 | 中 | 需要修改语言设计 | 预留语言版本迁移机制；保持 Rust 版编译器可用作为后备 |
| ~~外部工具链依赖（GCC/ld）~~ | ~~高~~ | ~~无法独立生成可执行文件~~ | ✅ **风险已消除**：内置 PE32+ 链接器已完全可用，支持 DLL 导入（msvcrt.dll）、导入跳转 thunk、内置符号桩（\_\_main），可独立生成完全可用的 Windows exe，无需任何外部工具链 |

---

## 七、里程碑检查点

```
M1: enum + match + switch + StringBuilder + File + Character 可用 ✅ 已达成
    └── Phase 1 完成，Lemon 具备编写编译器组件的基础能力

M2: Lemon 版 Lexer 通过全部测试 ⚠️ 进行中
    └── Phase 2 进行中，源码已编写（src_lem/lexer/），待测试验证

M3: Lemon 版 Parser 通过全部测试
    └── Phase 3 完成，编译器前端完全用 Lemon 实现

M4: Lemon 版 Semantic 通过全部测试
    └── Phase 4 完成，编译器分析阶段完全用 Lemon 实现

M5: Lemon 版 CCodeGen 通过全部测试
    └── Phase 5 完成，编译器完全用 Lemon 实现

M6: 三阶段自举验证通过
    └── Phase 6 完成，Lemon 语言实现自举 🎉
```

---

## 附录 A：当前编译器代码量统计

| 组件 | 文件 | 行数（估算） |
|------|------|-------------|
| 词法分析器 | lexer.rs + token.rs | ~600 |
| 语法分析器 | parser.rs | ~1500 |
| AST 定义 | node.rs | ~320 |
| 语义分析器 | semantic.rs | ~800 |
| 优化器 | optimizer.rs | ~400 |
| C 代码生成器 | c_gen.rs | ~2250 |
| NASM 生成器 | nasm_gen.rs | ~600 |
| 原生代码生成器 | native_gen.rs + x86_64.rs | ~1500 |
| 字节码生成器 | bc_gen.rs + bytecode.rs | ~800 |
| IR | ir/*.rs | ~600 |
| JIT/VM | jit/*.rs | ~1500 |
| 构建系统 | build_system/*.rs | ~400 |
| 其他 | main.rs + lib.rs + diagnostics | ~200 |
| **总计** | | **~11,000** |

## 附录 B：自举所需最小语言特性清单

按优先级排序，P0 为必须，P1 为强烈建议，P2 为锦上添花：

| 优先级 | 特性 | 用途 | 状态 |
|--------|------|------|------|
| P0 | enum 类型（携带数据的变体） | 表达 AST 节点、Token 类型、错误类型 | ✅ 已实现 |
| P0 | match 表达式（变体解构） | Token/AST 分发 | ✅ 已实现 |
| P0 | switch 语句 | 简单值分发 | ✅ 已实现 |
| P0 | StringBuilder 类 | 代码生成输出 | ✅ 已实现 |
| P0 | File I/O 类 | 读写源文件和输出文件 | ✅ 已实现 |
| P0 | Character 工具类 | 词法分析字符判断 | ✅ 已实现 |
| P0 | 字符串 + 拼接 | 消息拼接、代码生成 | ✅ 已实现 |
| P0 | String.charAt() | 逐字符访问源码 | ✅ 已实现 |
| P1 | Option<T> / T? | 可选值安全表达 | ❌ 未实现 |
| P1 | for-each 循环 | 集合遍历 | ✅ 已实现 |
| P1 | Stack<T> 类 | 作用域栈、解析栈 | ❌ 未实现 |
| P1 | Set<T> 类 | 接口名集合、去重 | ❌ 未实现 |
| P1 | String.startsWith/endsWith | 前缀匹配 | ❌ 未实现 |
| P2 | 字符串插值 | 代码生成模板 | ❌ 未实现 |
| P2 | 运算符重载 | 自定义比较 | ❌ 未实现 |
| P2 | 元组类型 | 多返回值 | ❌ 未实现 |
| P2 | 内联函数 | 性能优化 | ❌ 未实现 |
