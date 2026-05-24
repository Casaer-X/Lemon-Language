# Lemon 版编译器完整实现计划

> 本文档规划了 Lemon 版编译器 (src_lem/) 的完整实现路线，目标是使 Lemon 版编译器功能与 Rust 版 (src/) 对齐，并最终替代 Rust 版成为唯一的编译器实现。

---

## 当前状态概览

| 模块 | Rust 版 (src/) | Lemon 版 (src_lem/) | 差距 |
|------|----------------|---------------------|------|
| 词法分析 | ✅ 完整 | ✅ 完整 | 无 |
| 语法分析 | ✅ 完整 | ✅ 完整 | 无 |
| 语义分析 | ✅ 完整 | ✅ 基本完整 | 缺枚举变体检查、访问权限检查 |
| C 代码生成 | ✅ 完整 | ⚠️ 部分缺失 | 缺泛型实例化、方法重载 |
| AST 优化器 | ✅ 有 | ❌ 无 | 完全缺失 |
| 原生代码生成 | ✅ 有 | ❌ 无 | 完全缺失 |
| NASM 生成 | ✅ 有 | ❌ 无 | 完全缺失 |
| 字节码编译 | ✅ 有 | ❌ 无 | 完全缺失 |
| 虚拟机 | ✅ 有 | ❌ 无 | 完全缺失 |
| JIT 编译器 | ✅ 有 | ❌ 无 | 完全缺失 |
| PE 链接器 | ✅ 有 | ❌ 无 | 完全缺失 |
| 运行时库 | ✅ 有 | ❌ 无 | 完全缺失 |
| 执行策略 | ✅ 有 | ❌ 无 | 完全缺失 |
| 构建系统 | ✅ 有 | ❌ 无 | 完全缺失 |
| --build 模式 | ✅ 有 | ❌ 无 | 完全缺失 |

---

## 实施路线图

### Phase 1：核心功能补全（P0 优先级）

> 目标：使 Lemon 版编译器能正确编译使用泛型和方法重载的 Lemon 程序。

#### 1.1 泛型实例化

**当前问题**：`Array<T>`、`Map<K,V>` 等泛型容器在生成 C 代码时丢失类型参数信息，导致元素类型推断依赖硬编码。

**实现方案**：

```
1. 新增数据结构：
   - generic_instances: Map<String, Array<Array<TypeRef>>>
     记录每个泛型类的所有具体类型参数实例
   - generic_classes: Map<String, ClassDecl>
     存储泛型类定义

2. 收集阶段 (collect_generic_instances)：
   遍历 AST，收集所有 new ClassName<TypeArgs>(...) 的实例化信息
   - 扫描 New 表达式中的类型参数
   - 扫描字段声明中的泛型类型
   - 扫描方法参数和返回值中的泛型类型
   - 去重：同一组类型参数只实例化一次

3. 代码生成阶段：
   - generate_generic_struct_def()：为每个实例生成 C struct 定义
     例：Array<int> → struct Array_int { int length; int* data; }
   - generate_generic_class()：生成实例的构造函数、方法等
   - build_type_param_mapping()：建立类型参数到实际类型的映射
   - substitute_type()：递归替换类型参数

4. 命名规则：
   Array<int> → Array_int
   Map<String, int> → Map_String_int
   Pair<int, String> → Pair_int_String
```

**涉及文件**：`src_lem/codegen/CCodeGen.lm`

**验证标准**：
- `new Array<String>()` 生成 `struct Array_String` 和相关函数
- `new Map<String, int>()` 生成 `struct Map_String_int` 和相关函数
- 自举编译不受影响（当前编译器自身不使用泛型实例化语法）

#### 1.2 方法重载解析

**当前问题**：同名不同参数的方法无法区分，直接映射为 `ClassName_methodName` 会冲突。

**实现方案**：

```
1. 新增数据结构：
   - method_signatures: Map<String, Array<(String, Array<TypeRef>)>>
     每个类的每个方法名对应多个签名（方法名 → [(mangled_name, param_types)])

2. 收集阶段 (collect_method_signatures)：
   遍历类成员，收集每个方法的参数类型列表

3. 名称修饰 (mangle_method_name)：
   基于方法名和参数类型生成唯一 C 函数名
   例：print() → ClassName_print_void
        print(String s) → ClassName_print_String
        print(int v) → ClassName_print_int

4. 解析阶段 (resolve_method_overload)：
   根据调用点的实际参数类型，选择正确的重载版本
   - 精确匹配：参数类型完全一致
   - 隐式转换：int → long, float → double
   - 无匹配：报错

5. 调用点修改：
   - MethodCall 表达式中使用 mangled name 而非原始方法名
   - Call(FieldAccess) 中同样处理
```

**涉及文件**：`src_lem/codegen/CCodeGen.lm`

**验证标准**：
- 同名不同参数的方法可正确编译和调用
- String.substring(start) 和 String.substring(start, end) 可正确区分

#### 1.3 StringBuilder 运行时补全

**当前缺失方法**：`appendLong`, `appendFloat`, `appendDouble`, `appendBool`, `setCharAt`, `charAt`, `deleteCharAt`, `insert`, `clear`, `free`

**实现方案**：在 `emitRuntimeLibrary()` 中添加缺失的 C 函数实现。

**涉及文件**：`src_lem/codegen/CCodeGen.lm`

---

### Phase 2：构建系统与多目标编译（P1 优先级）

> 目标：Lemon 版编译器支持 --build 模式和多编译目标。

#### 2.1 --build 项目构建模式

**实现方案**：

```
1. 目录扫描：
   扫描指定目录下所有 .lm 文件，合并为单一编译单元

2. 依赖分析：
   解析 package 和 import 声明，确定编译顺序
   （当前 import 未实现，先按文件名排序）

3. 增量编译（后续）：
   基于文件修改时间判断是否需要重新编译

4. 命令行：
   lemonc --build [dir]        # 构建 dir 目录下的所有 .lm 文件
   lemonc --build src_lem      # 构建编译器自身
```

**涉及文件**：`src_lem/LemonCompiler.lm`（新增构建逻辑）

#### 2.2 多目标编译

**实现方案**：

```
1. 命令行解析扩展：
   --target c          # 生成 C 代码（默认）
   --target nasm       # 生成 NASM 汇编
   --target native     # 生成原生 x86-64 COFF + PE 链接
   --target bytecode   # 生成 .lmb 字节码
   --target hybrid     # 生成混合 AOT+JIT 可执行文件

2. 代码生成器分发：
   根据 --target 选择不同的代码生成后端
   - c → CCodeGen（已有）
   - nasm → NasmCodeGen（需新建）
   - native → NativeCodeGen（需新建）
   - bytecode → BytecodeCompiler（需新建）
   - hybrid → CCodeGen + BytecodeCompiler + 链接器（需新建）

3. 编译管线：
   lemonc file.lm --target native -o app.exe
   → 词法分析 → 语法分析 → 语义分析 → 原生代码生成 → PE链接 → app.exe
```

**涉及文件**：`src_lem/LemonCompiler.lm`，新增代码生成器模块

#### 2.3 源码注解解析

**实现方案**：

```
解析源码中的 // @compile 注解：
// @compile target=native
// @compile optimize=2
// @compile output=myapp.exe
// @compile dep=math,io
// @compile entry=true

在词法分析阶段提取注解，传递给编译器主入口。
```

**涉及文件**：`src_lem/lexer/Lexer.lm`，`src_lem/LemonCompiler.lm`

---

### Phase 3：原生代码生成（P2 优先级）

> 目标：Lemon 版编译器可直接生成 x86-64 机器码和 Windows 可执行文件。

#### 3.1 x86-64 指令编码器

**实现方案**：

```
新建 src_lem/codegen/X8664.lm：
- 操作码编码表（MOV, ADD, SUB, MUL, DIV, CMP, JMP, CALL, RET 等）
- REX 前缀生成
- ModR/M + SIB 编码
- 立即数编码（8/32/64 位）
- 寄存器编码表（RAX=0, RCX=1, ..., R8-R15）

辅助方法：
- emit_rex(w, r, x, b)
- emit_modrm(mod, reg, rm)
- emit_mov_r64_imm64(reg, imm)
- emit_mov_r64_r64(dst, src)
- emit_add_r64_r64(dst, src)
- emit_sub_r64_imm32(dst, imm)
- emit_cmp_r64_r64(a, b)
- emit_jmp_rel32(offset)
- emit_jcc_rel32(cc, offset)
- emit_call_rel32(offset)
- emit_ret()
- emit_push_r64(reg)
- emit_pop_r64(reg)
```

**涉及文件**：新建 `src_lem/codegen/X8664.lm`

#### 3.2 原生代码生成器

**实现方案**：

```
新建 src_lem/codegen/NativeCodeGen.lm：
- 将 AST 直接编译为 x86-64 机器码
- 生成 COFF64 目标文件格式
- Windows x64 调用约定（RCX, RDX, R8, R9 传参）
- 栈帧布局（RBP 相对寻址）
- 局部变量分配
- 字段偏移计算
- 虚方法表（vtable）生成
- 接口方法表（itable）生成

核心方法：
- generate(ast) → COFF 字节
- gen_class(class) → 类的方法代码
- gen_method(method) → 方法的机器码
- gen_stmt(stmt) → 语句的机器码
- expr_rax(expr) → 表达式求值到 RAX
```

**涉及文件**：新建 `src_lem/codegen/NativeCodeGen.lm`

#### 3.3 COFF64 目标文件生成

**实现方案**：

```
新建 src_lem/codegen/COFF64.lm：
- COFF 文件头（IMAGE_FILE_HEADER）
- .text 段（代码）
- .data 段（已初始化数据）
- .rdata 段（只读数据：字符串常量）
- .bss 段（未初始化数据）
- 符号表（函数名、全局变量名）
- 重定位表（函数调用、字符串引用）
- .lmb 段（嵌入式字节码，hybrid 模式）
```

**涉及文件**：新建 `src_lem/codegen/COFF64.lm`

#### 3.4 PE32+ 链接器

**实现方案**：

```
新建 src_lem/codegen/PELinker.lm：
- 合并多个 COFF 目标文件
- 解析符号表和重定位
- 生成 PE32+ 可执行文件
  - DOS 头 + PE 签名
  - COFF 文件头 + Optional Header
  - 段表 + 段数据
  - 导入表（msvcrt.dll：printf, malloc, free, etc.）
  - 导入跳转 thunk（IAT）
  - 入口点设置
- 嵌入式 .lmb 段支持（hybrid 模式）
  - 导出 _lmb_data_start / _lmb_data_size 符号
```

**涉及文件**：新建 `src_lem/codegen/PELinker.lm`

#### 3.5 NASM 汇编生成器

**实现方案**：

```
新建 src_lem/codegen/NasmCodeGen.lm：
- 生成 NASM 语法的 x86-64 汇编代码
- section .text / .data / .bss
- global / extern 声明
- 调用约定注释
- 可读性优于原生代码，便于调试
```

**涉及文件**：新建 `src_lem/codegen/NasmCodeGen.lm`

---

### Phase 4：字节码与虚拟机（P2 优先级）

> 目标：Lemon 版编译器可生成字节码并由内置虚拟机执行。

#### 4.1 字节码指令定义

**实现方案**：

```
新建 src_lem/jit/Bytecode.lm：
- 60+ 条字节码指令定义（与 Rust 版对齐）
- 指令编码/解码
- BytecodeModule 结构：函数表、类表、字符串池、全局变量表
- BytecodeFunction 结构：名称、参数、局部变量数、指令序列
- BytecodeClass 结构：名称、字段、方法索引、vtable
```

**涉及文件**：新建 `src_lem/jit/Bytecode.lm`

#### 4.2 字节码编译器

**实现方案**：

```
新建 src_lem/jit/BytecodeCompiler.lm：
- 将 AST 编译为 BytecodeModule
- 栈式字节码生成
- 局部变量索引分配
- 字符串常量池管理
- 标签和跳转目标管理
- 函数/方法编译
- 类和接口编译
- 枚举编译（tagged union → 字节码）

核心方法：
- compile(ast) → BytecodeModule
- compile_class(class) → 类的字节码
- compile_method(method) → 方法的字节码
- compile_stmt(stmt) → 语句的字节码
- compile_expr(expr) → 表达式的字节码
```

**涉及文件**：新建 `src_lem/jit/BytecodeCompiler.lm`

#### 4.3 字节码序列化

**实现方案**：

```
新建 src_lem/jit/Serialize.lm：
- .lmb 文件格式定义
  - 魔数：0x4C4D4230 ("LMB0")
  - 版本号
  - 函数表（数量 + 每个函数的名称、参数、局部变量数、代码长度、代码字节）
  - 类表（数量 + 每个类的名称、字段、方法索引）
  - 字符串池（数量 + 每个字符串的长度和 UTF-8 字节）
  - 全局变量表
  - 入口点索引
- write_module(module, path) → 写入 .lmb 文件
- read_module(path) → 读取 .lmb 文件为 BytecodeModule
```

**涉及文件**：新建 `src_lem/jit/Serialize.lm`

#### 4.4 虚拟机 (LeVM)

**实现方案**：

```
新建 src_lem/jit/LeVM.lm：
- 基于栈的虚拟机
- 指令解释执行循环
- 函数调用栈帧管理
- 局部变量和全局变量存取
- 原生函数注册和调用
- 热点检测（执行计数 → JIT 触发）

核心结构：
- LeVM 类：
  - module: BytecodeModule
  - stack: Array<VMValue>
  - frames: Array<CallFrame>
  - globals: Array<VMValue>
  - nativeFunctions: Map<String, LeNativeFunc>
  - executionCounts: Map<int, long>
  - jitThreshold: long

- VMValue 联合体：
  - Int(long), Float(double), Bool(bool), String(String)
  - Null, Ptr(void*), Object(VMObject), Array(Array<VMValue>), Map(Array<(VMValue,VMValue)>)

- CallFrame 结构：
  - funcIdx, pc, locals, stackBase

核心方法：
- new(module) → 创建 VM
- fromBytes(data) → 从字节码数据创建 VM
- call(funcIdx, args) → 调用函数
- callByName(name, args) → 按名称调用
- registerNative(name, func) → 注册原生函数
- run() → 执行主循环
- step() → 执行单条指令
```

**涉及文件**：新建 `src_lem/jit/LeVM.lm`

#### 4.5 JIT 编译器

**实现方案**：

```
新建 src_lem/jit/JitCompiler.lm：
- 将热点字节码函数编译为 x86-64 机器码
- Windows x64 调用约定
- 栈帧布局
- 标签/跳转修补
- SSE2 浮点运算
- 热点检测阈值配置

核心结构：
- JitCompiler 类：
  - labelPositions: Map<int, int>
  - pendingJumps: Array<PendingJump>
  - nextLabel: int

- JitFunction 类：
  - funcIdx, name, code(Array<byte>), codeSize, frameSize, paramCount

- JitState 类：
  - compiledFunctions: Map<int, JitFunction>
  - executionCounts: Map<int, long>
  - hotThreshold: long
  - enabled: bool

核心方法：
- compileFunction(func, module) → JitFunction
- compileInstruction(instr) → x86-64 机器码
- compileModule(module, jitState) → 编译所有热点函数
```

**涉及文件**：新建 `src_lem/jit/JitCompiler.lm`

---

### Phase 5：运行时库与混合执行（P2 优先级）

> 目标：Lemon 版编译器可生成独立可执行文件，支持 AOT+JIT 混合执行。

#### 5.1 原生运行时库

**实现方案**：

```
新建 src_lem/runtime/Runtime.lm：
- 生成 C 运行时函数（嵌入到生成的 C 代码中）
- 或生成 COFF 目标文件中的运行时代码

运行时函数列表（17 个）：
内存管理：
- Lemon_malloc(size) / Lemon_free(ptr) / Lemon_realloc(ptr, size)

数组操作：
- LemonArray_new(capacity) / LemonArray_length(arr) / LemonArray_get(arr, idx)
- LemonArray_set(arr, idx, value) / LemonArray_push(arr, value)

字符串操作：
- LemonString_length(s) / LemonString_concat(a, b) / LemonString_equals(a, b)
- LemonString_intToString(v) / LemonString_floatToString(v) / LemonString_join(arr, sep)

I/O 操作：
- LemonIO_print(s) / LemonIO_println(s) / LemonIO_readLine()

VM 互操作：
- LemonVM_init(data, size) / LemonVM_callByName(vm, name) / LemonVM_destroy(vm)
```

**涉及文件**：新建 `src_lem/runtime/Runtime.lm`

#### 5.2 执行策略决策

**实现方案**：

```
新建 src_lem/ast/ExecutionStrategy.lm：
- 分析每个方法/函数的执行策略
- AOT：普通方法、构造函数、虚方法
- JIT：@reflectable 方法、含动态操作的方法
- AotWithProfile：可优化热点

核心方法：
- decideStrategy(member, class, config) → ExecutionStrategy
- decideFunctionStrategy(func, config) → ExecutionStrategy
- analyzeProgram(program, config) → Map<String, ExecutionStrategy>
- hasDynamicOperations(stmt) → bool
```

**涉及文件**：新建 `src_lem/ast/ExecutionStrategy.lm`

#### 5.3 混合执行集成

**实现方案**：

```
在 LemonCompiler.lm 中集成混合执行流程：
1. 解析命令行 --target hybrid
2. 运行执行策略分析
3. AOT 方法 → NativeCodeGen → COFF
4. JIT 方法 → BytecodeCompiler → .lmb 段
5. PELinker 合并 COFF + .lmb → exe
6. 生成 VM 初始化桩代码
```

**涉及文件**：`src_lem/LemonCompiler.lm`

---

### Phase 6：AST 优化器与 IR（P2 优先级）

> 目标：提升生成代码的质量和性能。

#### 6.1 AST 优化器

**实现方案**：

```
新建 src_lem/ast/Optimizer.lm：
- 常量折叠：3 + 4 → 7, "hello" + " world" → "hello world"
- 常量传播：var x = 5; var y = x + 1 → var y = 6
- 死代码消除：if (false) { ... } → 删除
- 代数化简：x * 1 → x, x + 0 → x, x * 0 → 0
- 布尔化简：x && true → x, x || false → x

核心方法：
- optimize(ast) → Program
- optimizeStmt(stmt) → Stmt
- optimizeExpr(expr) → Expr
- isConstant(expr) → bool
- evaluateConstant(expr) → Expr
```

**涉及文件**：新建 `src_lem/ast/Optimizer.lm`

#### 6.2 IR 中间表示（可选）

**实现方案**：

```
新建 src_lem/ir/ 目录：
- IR.lm：IR 指令定义（SSA 形式）
- IRGen.lm：AST → IR 生成
- IRType.lm：IR 类型系统
- IRFunction.lm：IR 函数结构
- IRModule.lm：IR 模块结构

IR 指令集：
- 算术：Add, Sub, Mul, Div, Mod, Neg
- 比较：Eq, Ne, Lt, Gt, Le, Ge
- 内存：Load, Store, Alloca, GetElementPtr
- 控制：Branch, ConditionalBranch, Call, Return
- 转换：BitCast, IntToPtr, PtrToInt, ZExt, SExt, Trunc

优势：
- 统一多后端代码生成的中间层
- 便于实现更高级的优化（循环不变量外提、内联等）
- 便于未来支持更多目标架构（ARM、RISC-V 等）
```

**涉及文件**：新建 `src_lem/ir/` 目录

---

### Phase 7：语义分析增强（P3 优先级）

> 目标：提升编译器的错误检测能力。

#### 7.1 枚举变体语义检查

```
在 SemanticAnalyzer.lm 中添加：
- isEnumType(typeName) → bool：判断类型名是否为枚举类型
- enumHasVariant(enumName, variantName) → bool：检查枚举是否有指定变体
- 在 checkExpr 中对 FieldAccess 和 Call 增加枚举变体访问检查
  例：Color.Red → 检查 Color 是枚举且 Red 是其变体
  例：TokenKind.Identifier(name) → 检查变体携带的数据类型匹配
```

#### 7.2 访问权限检查

```
在 SemanticAnalyzer.lm 中添加：
- InvalidAccess 错误类型
- 检查 private 成员是否只在类内部访问
- 检查 protected 成员是否只在类及其子类中访问
- 检查 private 类的构造函数是否不能在外部 new
```

#### 7.3 Match 完备性检查

```
在 SemanticAnalyzer.lm 中添加：
- NonExhaustiveMatch 错误类型
- 检查 match 表达式是否覆盖所有可能的模式
- 如果没有 _ 通配符，检查是否所有枚举变体都被匹配
```

---

## 文件结构规划

完成所有阶段后，src_lem/ 目录结构如下：

```
src_lem/
├── LemonCompiler.lm          # 编译器主入口（增强：多目标、构建系统）
├── lexer/
│   ├── Lexer.lm              # 词法分析器（已有）
│   └── TokenKind.lm          # Token 类型定义（已有）
├── parser/
│   ├── Parser.lm             # 语法分析器（已有）
│   └── AST.lm                # AST 节点定义（已有）
├── semantic/
│   ├── SemanticAnalyzer.lm   # 语义分析器（增强：枚举检查、访问权限）
│   └── SemanticError.lm      # 语义错误类型（增强）
├── ast/
│   ├── Optimizer.lm          # AST 优化器（新建）
│   └── ExecutionStrategy.lm  # 执行策略决策（新建）
├── codegen/
│   ├── CCodeGen.lm           # C 代码生成器（增强：泛型、重载）
│   ├── NativeCodeGen.lm      # 原生 x86-64 代码生成器（新建）
│   ├── NasmCodeGen.lm        # NASM 汇编生成器（新建）
│   ├── X8664.lm              # x86-64 指令编码器（新建）
│   ├── COFF64.lm             # COFF 目标文件格式（新建）
│   └── PELinker.lm           # PE32+ 链接器（新建）
├── jit/
│   ├── Bytecode.lm           # 字节码指令定义（新建）
│   ├── BytecodeCompiler.lm   # 字节码编译器（新建）
│   ├── Serialize.lm          # .lmb 序列化（新建）
│   ├── LeVM.lm               # 虚拟机（新建）
│   └── JitCompiler.lm        # JIT 编译器（新建）
├── runtime/
│   └── Runtime.lm            # 原生运行时库（新建）
└── ir/                        # IR 中间表示（可选）
    ├── IR.lm                 # IR 指令定义
    ├── IRGen.lm              # AST → IR 生成
    ├── IRType.lm             # IR 类型系统
    ├── IRFunction.lm         # IR 函数结构
    └── IRModule.lm           # IR 模块结构
```

---

## 实施优先级总结

| 阶段 | 优先级 | 核心内容 | 预估新增代码量 |
|------|--------|----------|---------------|
| Phase 1 | P0 | 泛型实例化 + 方法重载 + StringBuilder 补全 | ~800 行 |
| Phase 2 | P1 | --build 模式 + 多目标编译 + 源码注解 | ~500 行 |
| Phase 3 | P2 | 原生代码生成 + COFF + PE 链接器 + NASM | ~3000 行 |
| Phase 4 | P2 | 字节码 + 虚拟机 + JIT 编译器 | ~2500 行 |
| Phase 5 | P2 | 运行时库 + 执行策略 + 混合执行集成 | ~800 行 |
| Phase 6 | P2 | AST 优化器 + IR（可选） | ~1500 行 |
| Phase 7 | P3 | 语义分析增强 | ~300 行 |

**总计预估新增代码量**：~9400 行

---

## 自举验证要求

每完成一个阶段后，必须重新走完整自举链验证：

```
T0 (Rust lemonc) → 编译 src_lem → T1
T1 → 编译 src_lem → T2
T2 → 编译 src_lem → T3
T3 → 编译 src_lem → T4
验证：T3.c SHA256 == T4.c SHA256
```

**关键约束**：
1. 修改 CCodeGen.lm 后必须验证自举不受影响
2. 新增模块不能破坏现有编译能力
3. 每个阶段完成后提交一次更改
4. Rust 版和 Lemon 版的代码生成结果应保持一致

---

## 里程碑

- **M1**：Phase 1 完成 → Lemon 版支持泛型和方法重载
- **M2**：Phase 2 完成 → Lemon 版支持 --build 和多目标
- **M3**：Phase 3 完成 → Lemon 版可独立生成 Windows exe
- **M4**：Phase 4 完成 → Lemon 版可生成和执行字节码
- **M5**：Phase 5 完成 → Lemon 版支持 AOT+JIT 混合执行
- **M6**：Phase 6 完成 → Lemon 版具备优化能力
- **M7**：Phase 7 完成 → Lemon 版语义分析完整
- **最终目标**：Lemon 版编译器完全替代 Rust 版，实现自给自足
