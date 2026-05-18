# Language Lemon 项目移交文档

## 一、项目概述

**项目名称：** Lemon 语言编译器（lemonc）+ JIT 运行时（lemonvm）
**版本：** v1.0.0
**状态：** 活跃开发中
**最后更新：** 2025-08-16

本项目包含两个核心组件：

1. **lemonc** - 用 Rust 编写的 Lemon 语言编译器，支持词法分析、语法分析、语义分析、中间代码生成、优化和多种目标代码生成
2. **lemonvm** - JIT（即时编译）运行时，负责加载并执行 lemonc 生成的 .lmb 字节码文件

**Language Lemon** 是一门正在开发中的系统级编程语言，目标是结合 C 语言的底层控制能力与 Java 的面向对象特性，同时保持低性能开销和完善的垃圾回收机制。项目目前处于**编译器原型可用阶段**。

## 2. 技术栈与依赖

| 组件 | 技术/工具 | 版本/说明 |
|------|----------|----------|
| 编程语言 | Rust | 2021 Edition |
| 构建工具 | Cargo | 标准 Rust 包管理器 |
| 词法分析 | 手写递归下降 | 自定义 Token 类型 |
| 语法分析 | 手写递归下降 | LL(1) 风格 |
| 中间表示 | 自定义 IR | 三地址码风格 |
| 代码生成 | 自定义 | C/NASM/原生代码/字节码 |
| 字节码编译 | ✅ 可用 | .lmb 字节码文件生成 | 所有平台 |
| JIT 编译 | 自定义 x86-64 代码生成 | 运行时热点编译 |
| JIT 运行时 | ✅ 可用 | 解释执行 + x86-64 JIT | Windows/Linux/macOS |
| 测试框架 | Cargo test | 标准 Rust 测试 |
| 目标平台 | Windows/Linux/macOS | 通过 C 后端跨平台 |
| 字节码平台 | 平台无关 | .lmb 字节码 + lemonvm |

### 设计目标

| 维度 | 目标 |
|------|------|
| 底层控制 | 类似 C 的内存布局可控、零开销 C 互操作 |
| 面向对象 | 类（单继承）、接口、泛型、多态 |
| 性能 | 默认栈分配，显式堆分配，GC 延迟可控 |
| GC | 非追踪式（引用计数 + 周期检测），暂停可预测 |
| 并发 | 现代化并发 GC，不依赖写屏障 |

### 核心设计矛盾

"像 C 一样底层"与"完善 GC"通常不可兼得，项目采用**可选托管系统语言**路线：
- 默认栈分配，显式堆分配
- 提供 `@manual`、`@gc`、`@arena` 等分配注解
- 类似 **Zig + 轻量 GC + 对象系统** 的方向

---

## 二、项目结构

```
Language Lemon/
├── lemon_conversations.txt         # Lemon项目相关聊天记录
├── os_labs/                        # 操作系统实验程序
│   ├── memory_allocation.c         # 内存分配算法模拟
│   └── page_replacement.c          # 页面置换算法模拟
└── lemonc/                         # Lemon语言编译器 + JIT 运行时（Rust）
    ├── Cargo.toml
    ├── .cargo/config.toml          # GNU目标静态CRT链接配置
    ├── GUIDE.md                    # 用户使用手册
    ├── ERRORS_AND_WARNINGS.md      # 错误与警告参考
    ├── examples/
    │   ├── hello.lm                # Lemon示例程序（类/继承/虚方法/接口）
    │   ├── jit_simple.lm           # JIT 测试示例
    │   └── native_class_test.lm    # 原生代码生成测试
    └── src/
        ├── main.rs                 # lemonc 编译器主入口（AOT 编译器）
        ├── lib.rs                  # 库入口，暴露所有模块
        ├── bin/
        │   └── lemonvm.rs          # lemonvm JIT 运行时入口
        ├── lexer/
        │   ├── mod.rs
        │   ├── token.rs            # Token定义（50+种）
        │   └── lexer.rs            # 完整词法分析器
        ├── parser/
        │   ├── mod.rs
        │   └── parser.rs           # 递归下降语法分析器
        ├── ast/
        │   ├── mod.rs
        │   ├── node.rs             # AST节点定义
        │   ├── optimizer.rs        # AST优化器（常量折叠/传播/死代码消除）
        │   └── semantic.rs         # 语义分析器（类型检查/名称解析/继承验证）
        ├── ir/
        │   ├── mod.rs
        │   ├── instruction.rs      # IR指令集（SSA三地址码）
        │   ├── type_system.rs      # IR类型系统
        │   ├── function.rs         # IR函数与基本块
        │   ├── module.rs           # IR模块
        │   ├── gen.rs              # AST→IR生成器
        │   └── regalloc.rs         # 线性扫描寄存器分配器
        ├── codegen/
        │   ├── mod.rs
        │   ├── c_gen.rs            # C代码生成器（含vtable/GC运行时）
        │   ├── nasm_gen.rs         # NASM 汇编代码生成器
        │   ├── native_gen.rs       # 原生代码生成器（COFF64）
        │   ├── bc_gen.rs           # 旧版字节码生成器（保留兼容）
        │   └── bytecode.rs         # 旧版字节码定义（保留兼容）
        ├── jit/                    # JIT 运行时模块
        │   ├── mod.rs              # 模块入口
        │   ├── bytecode.rs         # 字节码指令集定义
        │   ├── compiler.rs         # 字节码编译器（AST → Bytecode）
        │   ├── jit_compiler.rs     # JIT 编译器（Bytecode → x86-64）
        │   ├── vm.rs               # 字节码虚拟机（解释执行）
        │   └── serialize.rs        # 字节码序列化（.lmb 文件格式）
        └── diagnostics/
            └── mod.rs              # 错误/警告报告
```

---

## 三、编译器流水线

```
hello.lm
  → [1/6] 词法分析 (Lexer)         → 207 tokens
  → [2/6] 语法分析 (Parser)         → 5 declarations (AST)
  → [2.5/6] 语义分析 (Semantic)     → 类型检查/名称解析/继承验证
  → [3/6] IR 生成 (IR Gen)          → IR Module
  → [4/6] 优化 (Optimizer)          → 常量折叠/传播/死代码消除
  → [5/6] C 代码生成 (C CodeGen)    → hello.c
  → [GCC 编译]                      → hello.exe
```

### lemonc 命令行参数

| 参数 | 说明 |
|------|------|
| `input.lm` | 输入文件（必需） |
| `-o output.c` | 指定输出文件 |
| `-O0` | 禁用优化 |
| `-O1` / `-O2` / `-O3` | 启用优化（默认 -O1） |
| `--lex-only` | 仅词法分析 |
| `--parse-only` | 仅语法分析 |
| `--target <tgt>` | 编译目标：`c`、`nasm`、`exe`、`native`、`bytecode` |

### lemonvm 命令行参数

| 参数 | 说明 |
|------|------|
| `input.lmb` | 输入字节码文件（必需） |
| `--debug` | 打印字节码指令和常量池 |
| `--jit` | 启用 JIT 编译（默认） |
| `--no-jit` | 禁用 JIT 编译 |
| `--jit-threshold <n>` | 设置 JIT 编译阈值（默认 100） |

---

## 四、已实现功能详情

### 4.1 词法分析器 (`src/lexer/`)

- **Token 类型**: 50+ 种
- **特性**: 行列号追踪、转义字符处理、行注释/块注释跳过
- **状态**: ✅ 完成，单元测试通过

### 4.2 语法分析器 (`src/parser/parser.rs`)

- **算法**: 递归下降 + 优先级攀爬
- **支持**: 类/接口/继承/虚方法/注解/构造函数/析构函数/泛型参数/指针类型
- **错误恢复**: 安全的 `ok()` 处理，避免 panic
- **状态**: ✅ 完成，成功解析 `hello.lm`

### 4.3 语义分析器 (`src/ast/semantic.rs`)

- **类型检查**: 验证类型引用是否已定义
- **名称解析**: 作用域栈追踪变量定义
- **继承验证**: 循环继承检测、方法覆盖验证、抽象方法实现检查
- **警告**: 字段遮蔽、缺少 @override 标记
- **状态**: ✅ 完成

### 4.4 AST 优化器 (`src/ast/optimizer.rs`)

| 优化 | 说明 | 示例 |
|------|------|------|
| 常量折叠 | 编译时计算常量表达式 | `1+2` → `3` |
| 常量传播 | 追踪常量变量值 | `int a=5; return a+1` → `return 6` |
| 死代码消除 | 移除不可达代码 | `if(false){...}` → 移除 |
| 代数简化 | 恒等变换 | `0+x` → `x`, `x*1` → `x` |
| 短路优化 | 布尔表达式简化 | `false && x` → `false` |

### 4.5 C 代码生成器 (`src/codegen/c_gen.rs`)

| 功能 | 状态 |
|------|------|
| 类 → struct + 方法函数 | ✅ |
| 继承字段扁平化 | ✅ |
| 虚函数分派 (vtable) | ✅ |
| super 构造函数/方法调用 | ✅ |
| 默认构造函数生成 | ✅ |
| 指针类型 (`TypeInfo*`) | ✅ |
| String 方法调用 | ✅ |
| 类型推断 | ✅ |
| 字符串字面量转义 | ✅ |

### 4.6 运行时库（嵌入生成的 C 代码中）

| 组件 | 功能 |
|------|------|
| **GC 框架** | `gc_init`, `gc_alloc`, `gc_mark`, `gc_sweep`（标记-清除） |
| **TypeInfo** | `type_of()` 运行时类型信息 |
| **String 方法** | `length`, `toUpperCase`, `toLowerCase`, `equals`, `trim`, `substring`, `indexOf`, `replace`, `intToString`, `toInt` |

---

## 五、编译与构建

### 环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Rust | 1.95.0+ | Lemon编译器 |
| GCC (MinGW) | 8.1.0+ | 编译生成的 C 代码 |

### 构建命令

```bash
# 构建 Lemon 编译器和 JIT 运行时
cd lemonc
cargo build --target x86_64-pc-windows-gnu --release

# 编译 Lemon 程序为 C 代码
lemonc examples/hello.lm

# 编译生成的 C 代码
gcc examples/hello.c -o examples/hello.exe

# 运行
./examples/hello.exe
```

### 字节码编译与 JIT 执行

```bash
# 1. 编译为字节码
lemonc examples/jit_simple.lm --target bytecode

# 2. 使用 JIT 运行时执行
lemonvm examples/jit_simple.lmb

# 3. 查看字节码详情
lemonvm examples/jit_simple.lmb --debug

# 4. 禁用 JIT，纯解释执行
lemonvm examples/jit_simple.lmb --no-jit
```

### 预期输出

```
Hello, Lemon!
!!! HELLO, WORLD!
 !!!!!! HELLO, WORLD!
 !!!Type: unknown
```

### Rust 工具链配置

- 目标: `x86_64-pc-windows-gnu`（MinGW 链接）
- 镜像: `RUSTUP_DIST_SERVER=https://rsproxy.cn`
- 静态 CRT: `.cargo/config.toml` 中配置 `target-feature=+crt-static`

---

## 六、Lemon 语言 BNF 语法（设计稿）

```
program         ::= (package_decl)? (import_decl)* (declaration)*
declaration     ::= class_decl | interface_decl | function_decl | var_decl
class_decl      ::= annotation* modifier* "class" IDENT type_params? ("extends" type_ref)? ("implements" type_ref ("," type_ref)*)? "{" class_member* "}"
interface_decl  ::= "interface" IDENT type_params? ("extends" type_ref ("," type_ref)*)? "{" interface_member* "}"
function_decl   ::= modifier* type_ref IDENT "(" params? ")" block
class_member    ::= field_decl | method_decl | constructor_decl | destructor_decl
method_decl     ::= annotation* modifier* type_ref IDENT "(" params? ")" (block | ";")
type_ref        ::= primitive_type | IDENT type_args? | type_ref "[]" | type_ref "*" | type_ref "->" "(" type_ref_list ")" type_ref
primitive_type  ::= "void" | "bool" | "byte" | "char" | "short" | "int" | "long" | "float" | "double"
annotation      ::= "@" IDENT
modifier        ::= "public" | "private" | "static" | "virtual" | "override" | "final" | "abstract" | "reflectable" | "extern"
block           ::= "{" stmt* "}"
stmt            ::= block | expr_stmt | if_stmt | for_stmt | while_stmt | return_stmt | break_stmt | continue_stmt | try_stmt | var_decl_stmt
expr            ::= literal | "this" | "super" | "null" | IDENT | expr "." IDENT | expr "->" IDENT | expr "(" args? ")" | expr "[" expr "]" | "new" IDENT "(" args? ")" | "delete" expr | expr op expr | unop expr | expr unop | "(" type_ref ")" expr | expr "instanceof" type_ref | "sizeof" "(" type_ref ")" | expr "?" expr ":" expr | lambda
lambda          ::= "(" params? ")" "=>" (expr | block)
```

---

## 七、GC 设计方案

### 运行时 GC 框架（已实现）

当前实现了标记-清除 GC 框架：

```c
typedef struct GcHeader {
    TypeInfo* type_info;
    int marked;
    struct GcHeader* next;
} GcHeader;

void* gc_alloc(size_t size, TypeInfo* ti);  // 分配 GC 管理的内存
void gc_mark(void* obj);                     // 标记对象为可达
void gc_sweep();                             // 回收不可达对象
```

### 未来方向：混合方案

- **默认**: 栈上值类型，无 GC 开销
- **`@gc` 注解**: 托管堆上引用类型，引用计数 + 周期检测
- **`@arena` 注解**: 区域分配，整区域一次性回收
- **`@manual` 注解**: 手动管理，类 C 的 malloc/free

---

## 八、开发路线图

### Phase 0 — 词法分析 ✅
- [x] Token 定义
- [x] Lexer 实现
- [x] 单元测试

### Phase 1 — 语法分析 ✅
- [x] Parser 递归下降实现
- [x] AST 构建与验证
- [x] 错误恢复

### Phase 2 — 语义分析 ✅
- [x] 类型检查
- [x] 名称解析
- [x] 继承/接口实现验证
- [x] 循环继承检测

### Phase 3 — IR 生成 + 优化 ✅
- [x] 表达式级 IR 生成
- [x] 常量折叠
- [x] 常量传播
- [x] 死代码消除

### Phase 4 — 代码生成 ✅
- [x] C 代码生成器
- [x] 虚函数分派 (vtable)
- [x] 继承字段扁平化
- [x] 类型推断
- [x] 运行时库嵌入

### Phase 5 — 运行时 ✅（基础）
- [x] GC 框架（标记-清除）
- [x] TypeInfo 运行时
- [x] String 方法库
- [x] 字节码虚拟机 (lemonvm)
- [x] JIT 编译器 (x86-64)
- [ ] 引用计数 + 周期检测
- [ ] Array/Map 内建类型
- [ ] C FFI 接口

### Phase 6 — 未来工作
- [ ] 接口方法表 (itable)
- [ ] 泛型实现
- [ ] 异常处理 (try/catch/finally)
- [ ] 模块系统 (import/package)
- [ ] x86-64 原生代码生成完善
- [ ] JIT 编译器完整指令集支持
- [ ] 自举编译

---

*文档更新日期: 2026-05-12*
*编译器版本: v0.2.0*
