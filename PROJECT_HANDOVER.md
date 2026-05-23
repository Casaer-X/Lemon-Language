# Lemon 语言项目交接文档

> 最后更新：2026-05-23 | 编译器版本：v1.6.0 | 自举验证已通过

---

## 一、项目概述

### 1.1 项目是什么

**Language Lemon** 是一门自研的系统级编程语言，目标是结合 C 语言的底层控制能力与 Java 风格的面向对象特性。项目核心是一个**自举编译器**——编译器自身用 Lemon 语言编写，能够编译自身源码，已完成三阶段自举验证（固定点验证通过）。

### 1.2 核心组件

| 组件 | 路径 | 语言 | 说明 |
|------|------|------|------|
| **lemonc (Rust版/T0)** | `lemonc/src/` | Rust | 引导编译器，用于编译 Lemon 源码生成 C 代码 |
| **lemonc (Lemon版/T1+)** | `lemonc/src_lem/` | Lemon | 自举编译器，用 Lemon 语言重写的完整编译器 |
| **lemonvm** | `lemonc/src/jit/` | Rust | JIT 运行时，执行 .lmb 字节码（功能不完整） |
| **vscode-lemon** | 独立仓库 | TypeScript | VS Code 语法高亮扩展 |

### 1.3 仓库结构

```
Language Lemon/                    # 主仓库（umbrella repo）
├── CHANGELOG.md                   # 版本变更日志
├── BOOTSTRAP_PLAN.md              # 自举计划详细文档
├── PROJECT_HANDOVER.md            # 本文档
├── README.md / README.zh-CN.md    # 项目介绍
├── changelogs/                    # 历史版本日志
├── lemonc/                        # 编译器子仓库（独立 git）
│   ├── Cargo.toml                 # Rust 项目配置
│   ├── .cargo/config.toml         # GNU 目标静态链接配置
│   ├── src/                       # Rust 版编译器源码（T0）
│   ├── src_lem/                   # Lemon 版编译器源码（自举版）
│   ├── build_t1/                  # T1 构建产物
│   ├── build_t2/                  # T2 构建产物
│   ├── build_t3/                  # T3 构建产物
│   └── examples/                  # Lemon 示例程序
└── *.c                            # 根目录散落的编译产物（应清理）
```

### 1.4 技术栈

| 类别 | 技术 |
|------|------|
| 引导编译器 | Rust 2021 Edition |
| 自举编译器 | Lemon 语言 |
| 构建工具 | Cargo + GCC (MinGW) |
| 目标平台 | Windows x86_64（主要），Linux/macOS 理论支持 |
| 编译目标 | C 代码 → GCC 编译为 exe |

---

## 二、已完成的工作

### 2.1 自举验证（Phase 6）— 已完成 ✅

**这是项目最重要的里程碑。** Lemon 编译器已完成三阶段自举验证：

```
T0 (Rust lemonc) → 编译 src_lem → T1 (lemonc_t1.exe)
T1 → 编译 src_lem → T2 (lemonc_t2.exe)
T2 → 编译 src_lem → T3 (lemonc_t3.exe)
T3 → 编译 src_lem → T4 (t4.c)

验证：T3.c SHA256 == T4.c SHA256 → 固定点验证通过 ✅
```

自举验证意味着 Lemon 编译器完全用自身语言实现，不再依赖 Rust。

### 2.2 Lemon 版编译器源码结构

```
lemonc/src_lem/
├── LemonCompiler.lm              # 编译器主入口，命令行解析与文件读取
├── lexer/
│   ├── Span.lm                   # 源码位置信息
│   ├── TokenKind.lm              # Token 类型枚举（60+ 种）
│   ├── Token.lm                  # Token 结构体
│   └── Lexer.lm                  # 词法分析器
├── parser/
│   ├── AST.lm                    # AST 节点定义（46 种声明/表达式/语句）
│   └── Parser.lm                 # 递归下降语法分析器（~2900 行）
├── semantic/
│   ├── SemanticError.lm          # 语义错误类型（19 种）
│   └── SemanticAnalyzer.lm       # 语义分析器（4 阶段分析）
└── codegen/
    └── CCodeGen.lm               # C 代码生成器（~2850 行，含运行时库）
```

### 2.3 语言特性实现状态

| 特性 | 状态 | 说明 |
|------|------|------|
| 原始类型 | ✅ | void/bool/byte/char/short/int/long/float/double |
| String | ✅ | const char* 映射，10+ 内建方法 |
| StringBuilder | ✅ | C 运行时实现，完整 API |
| Array\<T\> | ✅ | 动态数组，add/get/set/size/removeAt |
| Map\<K,V\> | ✅ | 哈希映射，FNV-1a + 开放寻址 + rehash |
| 类/继承 | ✅ | 单继承，super 调用 |
| 接口 | ✅ | 多接口实现，itable 调度 |
| 虚方法 | ✅ | virtual/@override，vtable 调度 |
| 构造函数 | ✅ | 支持与类名同名的构造函数 |
| 析构函数 | ✅ | ~ClassName() 语法 |
| 枚举/代数类型 | ✅ | enum class + tagged union + match |
| 泛型类 | ⚠️ | Rust 版支持，Lemon 版部分支持 |
| 方法重载 | ⚠️ | Rust 版支持 mangled 命名，Lemon 版未实现 |
| 异常处理 | ✅ | try/catch/finally，基于 setjmp/longjmp |
| for/while/break/continue | ✅ | for 循环正确翻译为 C for 循环 |
| for-each 迭代 | ✅ | for (Type item in collection) |
| switch/match | ✅ | match 表达式，支持变体绑定 |
| 字符串拼接 + | ✅ | 自动类型转换 |
| null 合并 ?? | ✅ | a ?? b → ((a)!=NULL?(a):(b)) |
| 文件 I/O | ✅ | File.open/close/readAll/write 等 |
| GC 框架 | ⚠️ | 标记-清除框架存在，但未实际使用 |
| Lambda | ❌ | 未实现 |
| 模块系统 | ⚠️ | package 声明可解析，import 未实现 |

### 2.4 编译器流水线

```
.lm 源文件 → 词法分析(Lexer) → Token流
          → 语法分析(Parser) → AST
          → 语义分析(SemanticAnalyzer) → 类型检查/继承验证
          → 代码生成(CCodeGen) → .c 文件
          → GCC 编译 → .exe 可执行文件
```

### 2.5 构建与自举流程

```bash
# 1. 构建 T0（Rust 版编译器）
cd lemonc
cargo build --target x86_64-pc-windows-gnu --release --bin lemonc

# 2. T0 编译 Lemon 源码生成 T1
.\target\x86_64-pc-windows-gnu\release\lemonc.exe --build src_lem
# 输出: src_lem/src_lem.c
Move-Item src_lem\src_lem.c build_t1\t1.c
gcc -O2 -o build_t1\lemonc_t1.exe build_t1\t1.c

# 3. T1 编译 Lemon 源码生成 T2
.\build_t1\lemonc_t1.exe src_lem\lexer\Span.lm src_lem\lexer\TokenKind.lm `
  src_lem\lexer\Token.lm src_lem\lexer\Lexer.lm src_lem\parser\AST.lm `
  src_lem\parser\Parser.lm src_lem\semantic\SemanticError.lm `
  src_lem\semantic\SemanticAnalyzer.lm src_lem\codegen\CCodeGen.lm `
  src_lem\LemonCompiler.lm -o build_t2\t2.c
gcc -O2 -o build_t2\lemonc_t2.exe build_t2\t2.c

# 4. T2 编译自身生成 T3（自举验证）
.\build_t2\lemonc_t2.exe [同上文件列表] -o build_t3\t3.c
gcc -O2 -o build_t3\lemonc_t3.exe build_t3\t3.c

# 5. T3 编译自身生成 T4（固定点验证）
.\build_t3\lemonc_t3.exe [同上文件列表] -o build_t3\t4.c
# 比较 SHA256：T3.c == T4.c → 固定点验证通过
```

**注意**：T0 的 `--build` 模式会自动合并 src_lem 下所有 .lm 文件，但 T1/T2 不支持 `--build`，需要手动列出所有源文件。

---

## 三、架构设计与关键决策

### 3.1 双编译器架构

项目存在两套编译器实现：

| | Rust 版 (T0) | Lemon 版 (T1+) |
|---|---|---|
| 路径 | `src/` | `src_lem/` |
| 语言 | Rust | Lemon |
| 代码量 | ~6000 行 | ~7000 行 |
| 功能完整度 | 更完整（泛型、方法重载） | 自举所需功能完整 |
| 用途 | 引导编译 | 生产使用 |
| 维护状态 | 需与 Lemon 版保持同步 | 主要维护对象 |

**关键决策**：Rust 版是引导编译器，只需保证能正确编译 Lemon 版编译器源码即可。长期来看，Rust 版可以逐步精简，只保留 Lemon 版编译所需的最低功能集。

### 3.2 C 代码生成策略

Lemon 编译器采用**C 转译**策略：将 Lemon 源码翻译为 C 代码，再通过 GCC 编译为可执行文件。这意味着：

- **优点**：跨平台（任何有 C 编译器的平台都能运行）、可读性好、调试方便
- **缺点**：依赖外部 C 编译器、类型推断需要大量启发式规则

### 3.3 类型推断机制（核心难点）

由于 Lemon 语言的类型信息在翻译为 C 时会部分丢失（C 的 `void*` 无法携带类型信息），CCodeGen 使用多种启发式规则来推断类型：

1. **varTypes 映射**：跟踪变量名到 C 类型的映射
2. **classFieldTypeMap**：类字段名到 C 类型的映射
3. **inferArrayElementTypeFromFieldName**：通过字段名硬编码推断数组元素类型
4. **inferClassFromExpr**：从表达式推断类名
5. **inferTypeFromExpr**：从表达式推断 C 类型
6. **exprIsStringType**：判断表达式是否为字符串类型

**这是整个编译器最脆弱的部分**，详见第四章。

### 3.4 运行时库

CCodeGen 在生成的 C 代码中内嵌完整的运行时库，包括：

- **内存管理**：gc_init/gc_alloc/gc_mark/gc_sweep（标记-清除框架）
- **字符串操作**：String_concat/substring/equals/trim/replace/intToString/longToString/doubleToString/fromChar/join/escapeCString 等
- **数组操作**：LemonArray_new/add/get/set/size/removeAt/push（含 rehash 机制）
- **映射操作**：LemonMap_new/put/get/size/containsKey/remove/keys（含 rehash 机制）
- **字符操作**：Character_isDigit/isLetter/isWhitespace/toUpperCase/toLowerCase/fromInt/toString 等
- **文件操作**：File_open/close/readAll/readLine/write/writeLine/hasNextLine/eof
- **异常处理**：setjmp/longjmp 框架
- **StringBuilder**：StringBuilder_new/append/appendChar/appendInt/toString/length/charAt 等

---

## 四、已知问题与待完善事项

### 4.1 严重问题（影响正确性）

#### 4.1.1 类型推断依赖硬编码映射

**位置**：`CCodeGen.lm` 的 `inferArrayElementTypeFromFieldName` 函数（第 2414-2435 行）

**问题**：该函数通过 20 条 if-else 硬编码字段名到数组元素类型的映射。每新增一个 AST 字段都需要手动添加规则，极易遗漏。

```lemon
// 当前实现（硬编码）
if (fieldName.equals("tokens")) return "Token*";
if (fieldName.equals("params") || fieldName.equals("parameters")) return "Param*";
if (fieldName.equals("methods")) return "MethodDecl*";
// ... 20 条规则
```

**根本原因**：Lemon 语言的 Array\<T\> 在翻译为 C 时变成 `LemonArray*`，丢失了泛型参数 T 的类型信息。代码生成器只能通过字段名"猜"元素类型。

**推荐方案**：
1. **短期**：在语义分析阶段收集字段到元素类型的映射，传递给代码生成器
2. **长期**：在 C 代码中用注释或结构体字段携带类型信息，或在生成的 C 代码中使用带类型包装的数组

#### 4.1.2 exprIsStringType 方法名硬编码

**位置**：`CCodeGen.lm` 的 `exprIsStringType` 函数（第 2293-2374 行）

**问题**：返回字符串的方法名列表在 4 处重复出现且不完全一致：
- MethodCall 分支：12 个方法名
- Call(FieldAccess) 通用分支：13 个方法名
- Call(FieldAccess) CCodeGen 分支：9 个方法名
- Call(Variable) 分支：18 个函数名

维护时极易遗漏导致不一致，造成某些方法调用被错误地当作非字符串处理。

**推荐方案**：统一为一个 Set\<String\> 常量，所有分支共用。

#### 4.1.3 genObjMethodCall 容器类型硬编码

**位置**：`CCodeGen.lm` 的 `genObjMethodCall` 函数（第 2051-2185 行）

**问题**：对 LemonArray/LemonMap/StringBuilder 的方法调用全部硬编码处理，包括：
- 方法名到 C 函数名的映射
- 参数包装（int → void* 的装箱/拆箱）
- 返回值类型转换

新增任何容器类型或方法都需要修改此函数。

**推荐方案**：建立方法签名注册表，将方法名、参数类型、返回类型统一管理。

### 4.2 中等问题（影响功能完整性）

#### 4.2.1 Lemon 版不支持 --build 模式

**问题**：T0（Rust 版）支持 `--build src_lem` 自动合并目录下所有 .lm 文件，但 T1/T2（Lemon 版）不支持，需要手动列出所有源文件。

**影响**：构建流程繁琐，容易遗漏文件。

**推荐方案**：在 LemonCompiler.lm 中实现目录扫描和文件合并逻辑。

#### 4.2.2 泛型类实例化未实现

**问题**：Rust 版 c_gen.rs 有完整的泛型类实例化支持（`collect_generic_instances`、`generate_generic_struct_def`），但 Lemon 版 CCodeGen.lm 完全没有泛型支持。

**影响**：无法编译使用泛型类的 Lemon 程序（当前编译器自身源码不使用泛型，所以自举不受影响）。

#### 4.2.3 方法重载未实现

**问题**：Rust 版有方法重载解析（`resolve_method_overload`、`mangle_method_name`），Lemon 版仅存储 `methodSignatures` 但未实现重载解析。

**影响**：无法定义同名不同参数的方法。

#### 4.2.4 JIT 编译器功能不完整

**位置**：`src/jit/compiler.rs`

**缺失功能**（共 8 处 TODO）：
- 枚举支持
- ForEach 支持
- Switch 支持
- 异常处理 (try/catch/throw)
- Lambda 支持
- Match 表达式支持
- 类型转换

#### 4.2.5 import 语句未实现

**问题**：`package` 声明可解析，但 `import` 语句未实现。当前所有源文件必须合并为单一编译单元。

### 4.3 代码质量问题

#### 4.3.1 根目录散落编译产物

根目录下有 17 个 .c 文件是编译产物（AST.c, Span.c, test_hello.c 等），应该清理或加入 .gitignore。

#### 4.3.2 build 目录残留调试文件

- `build_t2/` 有 `debug.gdb`、`t2_err.txt`、`t2_out.txt`
- `build_t3/` 有 `debug.gdb` 和多个临时测试 .lm 文件
- `build/` 有 `debug.gdb` 和临时测试文件

这些应清理或加入 .gitignore。

#### 4.3.3 Rust 版与 Lemon 版功能不同步

Rust 版 c_gen.rs（3666 行）比 Lemon 版 CCodeGen.lm（2850 行）多约 800 行，主要是泛型实例化和方法重载功能。两套代码需要手动保持同步，容易产生不一致。

**推荐方案**：随着 Lemon 版成为主要维护对象，Rust 版可以逐步精简为最小引导编译器。

#### 4.3.4 GCC 编译警告

T1/T2/T3 的 C 代码用 GCC 编译时会产生大量警告（主要是类型转换和格式字符串），虽然不影响正确性，但应逐步修复。

### 4.4 性能问题

#### 4.4.1 字符串拼接效率低

当前字符串拼接 `a + b + c` 生成嵌套的 `String_concat(String_concat(a, b), c)`，每次拼接都分配新内存。应考虑使用 StringBuilder 优化。

#### 4.4.2 LemonMap 初始容量小

LemonMap 默认初始容量为 8，rehash 阈值 75%。编译器自身使用大量 Map，频繁 rehash 影响性能。

#### 4.4.3 无内存释放机制

当前生成的 C 代码中，所有 malloc 分配的内存都不会被释放（GC 框架存在但未使用）。长时间运行的程序会内存泄漏。

---

## 五、关键代码位置索引

### 5.1 Lemon 版编译器核心文件

| 文件 | 行数 | 核心内容 |
|------|------|---------|
| `src_lem/codegen/CCodeGen.lm` | ~2850 | **最核心文件**。C 代码生成器，包含类型推断、运行时库生成、表达式/语句翻译 |
| `src_lem/parser/Parser.lm` | ~2900 | 语法分析器，递归下降 + Pratt 表达式解析 |
| `src_lem/parser/AST.lm` | ~800 | AST 节点定义，46 种声明/表达式/语句 |
| `src_lem/semantic/SemanticAnalyzer.lm` | ~1200 | 语义分析器，4 阶段分析 |
| `src_lem/lexer/Lexer.lm` | ~500 | 词法分析器 |
| `src_lem/LemonCompiler.lm` | ~200 | 编译器主入口 |

### 5.2 CCodeGen.lm 关键函数

| 函数 | 行号范围 | 功能 | 备注 |
|------|---------|------|------|
| `generate()` | 60-160 | 代码生成主流程 | 6 阶段：收集→运行时→字面量→前向声明→vtable→实现 |
| `ct()` | 330-380 | TypeRef → C 类型映射 | 核心类型转换函数 |
| `emitRuntimeLibrary()` | 400-1100 | 生成运行时 C 代码 | 最长的单函数，含所有运行时函数 |
| `emitMethod()` | 1361-1410 | 生成方法 C 函数 | 含 varTypes 保存/恢复 |
| `emitStmt()` | 1440-1700 | 生成语句 | for/while/if/try/switch/match/foreach |
| `genExpr()` | 1700-1910 | 生成表达式 | 分发到各子函数 |
| `genObjMethodCall()` | 2051-2185 | 对象方法调用 | **最复杂函数**，硬编码容器类型处理 |
| `genStringConcat()` | 2270-2290 | 字符串拼接 | 生成 String_concat 嵌套调用 |
| `toStringExpr()` | 2300-2315 | 非字符串→字符串转换 | 处理 const char*/int/double 等 |
| `exprIsStringType()` | 2293-2374 | 判断表达式是否为字符串 | **4 处硬编码方法名列表** |
| `inferClassFromExpr()` | 2459-2589 | 从表达式推断类名 | **类型推断核心**，FieldAccess 优先查 lookupFieldType |
| `inferArrayElementTypeFromFieldName()` | 2414-2435 | 字段名→元素类型映射 | **20 条硬编码规则** |
| `inferTypeFromExpr()` | 2598-2650 | 从表达式推断 C 类型 | 调用 inferClassFromExpr |

### 5.3 Rust 版编译器核心文件

| 文件 | 功能 |
|------|------|
| `src/main.rs` | 编译器主入口 |
| `src/lexer/lexer.rs` | 词法分析器 |
| `src/parser/parser.rs` | 语法分析器 |
| `src/ast/semantic.rs` | 语义分析器 |
| `src/ast/optimizer.rs` | AST 优化器 |
| `src/codegen/c_gen.rs` | C 代码生成器（比 Lemon 版多泛型/重载） |
| `src/codegen/nasm_gen.rs` | NASM 汇编生成器 |
| `src/codegen/native_gen.rs` | 原生代码生成器（COFF64） |
| `src/codegen/x86_64.rs` | x86-64 指令编码 |
| `src/linker/linker.rs` | PE32+ 链接器 |
| `src/jit/compiler.rs` | JIT 字节码编译器 |
| `src/jit/vm.rs` | 字节码虚拟机 |

---

## 六、自举过程中修复的关键 Bug 清单

以下 Bug 均在 T1→T2 或 T2→T3 自举过程中发现并修复，记录于此供参考：

| # | Bug 描述 | 根因 | 修复方式 |
|---|---------|------|---------|
| 1 | T2 参数类型生成 `4332613 12724896` | `toStringExpr` 把 `const char*` 指针当作 int 转 String | 添加 `const char*`/`char*` 直接返回逻辑 |
| 2 | `String_join(parts, ".")` 崩溃 | C 运行时 `String_join(sep, arr)` 参数顺序与 Lemon 调用不一致 | 修改 C 函数签名为 `String_join(arr, sep)` |
| 3 | `expr.args.size()` 生成 `String_size` | `inferClassFromExpr` 对 FieldAccess 先查 varTypes，`args` 与方法参数名冲突 | 改为先查 `lookupFieldType`，再查 varTypes |
| 4 | LemonMap 越界写入导致崩溃 | 无 rehash 机制，哈希表满时越界写入 | 添加 75% 负载因子自动 rehash |
| 5 | for 循环 continue 跳过递增 | Lemon for 翻译为 C while，continue 跳过循环变量递增 | 改为翻译为 C for 循环 |
| 6 | 构造函数未被识别 | 方法名与类名相同时未识别为构造函数，`==` 指针比较 | 添加 `currentClassName` 字段，用 `String.equals` |
| 7 | 构造函数命名不匹配 | `genNewExpr` 生成 `_ctor_ClassName`，`emitConstructor` 生成 `_ClassName` | 统一为 `_ctor` 后缀 |
| 8 | 方法间变量类型污染 | `varTypes` 在方法间共享，参数名污染 | 添加 varTypes 保存/恢复机制 |
| 9 | `\0` 转义解析为 `'0'` | Lexer 未处理 `\0` 转义 | 添加 `esc == '0'` 分支 |
| 10 | 运行时函数缺失 | T2 链接时缺 String_fromChar 等 | 完善 `emitRuntimeLibrary` |

---

## 七、开发环境配置

### 7.1 必需工具

| 工具 | 版本 | 安装方式 |
|------|------|---------|
| Rust | 1.95.0+ | `rustup` |
| GCC (MinGW-w64) | 8.1.0+ | MSYS2 或独立安装 |
| x86_64-pc-windows-gnu target | - | `rustup target add x86_64-pc-windows-gnu` |

### 7.2 Rust 工具链配置

```bash
# 添加 GNU 目标
rustup target add x86_64-pc-windows-gnu

# 构建编译器
cd lemonc
cargo build --target x86_64-pc-windows-gnu --release --bin lemonc
```

`.cargo/config.toml` 已配置静态 CRT 链接：
```toml
[target.x86_64-pc-windows-gnu]
rustflags = ["-C", "target-feature=+crt-static"]
```

### 7.3 常见构建问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `link.exe not found` | 默认使用 MSVC 工具链 | 使用 `--target x86_64-pc-windows-gnu` |
| `undefined reference to __imp_...` | 动态链接 MSVCRT | 确认 `.cargo/config.toml` 有 `+crt-static` |
| GCC 编译 T1/T2 报错 | 生成的 C 代码有类型错误 | 检查 CCodeGen.lm 的类型推断逻辑 |
| T2 崩溃 (0xC0000005) | 内存访问错误 | 用 `gcc -g -O0` + GDB 调试定位 |

---

## 八、测试

### 8.1 现有测试文件

| 文件 | 测试内容 |
|------|---------|
| `src_lem/codegen/test_hello.lm` | 基础 Hello World |
| `src_lem/codegen/test_simple.lm` | 简单表达式和变量 |
| `src_lem/codegen/test_class.lm` | 类定义和方法调用 |
| `src_lem/codegen/test_inherit.lm` | 继承和方法覆盖 |
| `src_lem/codegen/test_iface.lm` | 接口实现和 itable 调度 |
| `src_lem/codegen/test_map.lm` | Map\<String, String\> |
| `src_lem/codegen/test_map_int.lm` | Map\<String, int\> 装箱/拆箱 |
| `src_lem/codegen/test_sb.lm` | StringBuilder |
| `src_lem/codegen/test_step.lm` | 综合测试 |
| `src_lem/codegen/test_ge.lm` | 泛型/枚举测试 |
| `src_lem/lexer/LexerTest.lm` | 词法分析器自测 |
| `src_lem/parser/AstTest.lm` | AST 测试 |
| `src_lem/parser/EnumTest.lm` | 枚举测试 |
| `src_lem/semantic/SemanticTest.lm` | 语义分析测试 |

### 8.2 运行测试

```bash
# 用 T1 编译并运行测试
.\build_t1\lemonc_t1.exe src_lem\codegen\test_hello.lm -o test.c
gcc -O2 -o test.exe test.c
.\test.exe
```

### 8.3 自举验证测试

```bash
# 完整自举验证（约 5-10 分钟）
# 1. 构建 T0 → T1 → T2 → T3 → T4
# 2. 比较 T3.c 和 T4.c 的 SHA256
# 如果一致，则自举验证通过
```

---

## 九、后续工作建议

### 9.1 优先级高

1. **重构类型推断机制**：将 `inferArrayElementTypeFromFieldName` 的硬编码替换为语义分析阶段收集的类型信息
2. **统一 exprIsStringType 的方法名列表**：提取为共享常量
3. **实现 --build 模式**：让 Lemon 版编译器支持目录扫描
4. **清理根目录编译产物**：删除 17 个 .c 文件，更新 .gitignore

### 9.2 优先级中

5. **实现泛型类实例化**：从 Rust 版移植 `collect_generic_instances` 逻辑
6. **实现方法重载**：从 Rust 版移植 `resolve_method_overload` 逻辑
7. **修复 GCC 编译警告**：逐步消除类型转换和格式字符串警告
8. **实现 import 语句**：支持多文件模块化编译

### 9.3 优先级低

9. **优化字符串拼接**：使用 StringBuilder 替代嵌套 String_concat
10. **实现 GC 实际使用**：将标记-清除框架接入对象分配
11. **完善 JIT 编译器**：补齐 8 处 TODO 功能
12. **性能基准测试**：对比 Rust 版与 Lemon 版编译速度

---

## 十、重要提醒

1. **修改 CCodeGen.lm 后必须重新走完整自举链**（T0→T1→T2→T3→T4），确保固定点验证仍通过
2. **Rust 版 c_gen.rs 的修改需同步到 Lemon 版**，否则 T0 编译出的 T1 可能与预期不一致
3. **`emitRuntimeLibrary` 函数超过 700 行**，是单文件最长的函数，修改时需格外小心
4. **LemonMap 的 rehash 机制使用递归**，极端情况下可能栈溢出，应改为迭代实现
5. **varTypes 的保存/恢复机制**：在 `emitMethod`、`emitCtor`、`emitCtorMethod` 中都有，新增类似函数时务必加上
6. **构造函数识别**：Parser 通过 `currentClassName` 字段跟踪，如果解析嵌套类或内部类可能出问题
