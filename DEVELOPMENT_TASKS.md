# Lemon 语言开发任务规划

> 创建日期：2026-05-23 | 更新日期：2026-05-23 | 基于 PROJECT_HANDOVER.md v1.6.0

---

## 总览

本文档规划三个阶段的开发任务：

| 阶段 | 目标 | 核心理念 |
|------|------|---------|
| **阶段 A** | 混合执行引擎（Native AOT + JIT） | 编译器默认生成原生代码，部分由 JIT 运行，两种模式配合 |
| **阶段 B** | 原生独立程序（无需外部 C 编译器） | 一步生成 exe，零外部依赖 |
| **阶段 C** | 逐步修复已知问题和待完善事项 | 持续改进 |

---

## 核心架构：混合执行引擎

### 设计理念

Lemon 编译器采用 **Native AOT + JIT 混合执行** 模型：

```
                    ┌─────────────────────────────────────────┐
                    │          lemonc 编译器                    │
                    │                                         │
                    │  .lm 源码                               │
                    │    ↓                                    │
                    │  语义分析 + 执行策略决策                   │
                    │    ↓                        ↓           │
                    │  NativeCodeGen          BytecodeCompiler│
                    │  (x86-64 机器码)         (字节码 .lmb)   │
                    │    ↓                        ↓           │
                    │  COFF64 目标文件          嵌入式字节码段   │
                    │    ↓                        ↓           │
                    │  PE 链接器 ──→ 独立 .exe                  │
                    │    ├─ .text 段 (原生机器码)               │
                    │    ├─ .data 段 (全局数据)                 │
                    │    ├─ .lmb 段 (嵌入式字节码)  ← 新增      │
                    │    └─ 内嵌 VM 运行时       ← 新增         │
                    └─────────────────────────────────────────┘

运行时执行模型：
┌─────────────────────────────────────────────────┐
│                  Lemon .exe                       │
│                                                   │
│  main() ──→ 原生代码执行                           │
│    │                                              │
│    ├─ 普通方法调用 ──→ 直接原生调用（零开销）        │
│    │                                              │
│    ├─ JIT 标记方法 ──→ VM 解释执行字节码            │
│    │    │                                         │
│    │    └─ 热点检测 ──→ JIT 编译为原生代码           │
│    │                   (后续调用走原生路径)           │
│    │                                              │
│    ├─ 反射/动态调用 ──→ VM 解释执行                 │
│    │                                              │
│    └─ 异常处理 ──→ 原生 + VM 协作                   │
└─────────────────────────────────────────────────┘
```

### 执行策略分类

| 代码类型 | 执行方式 | 原因 |
|----------|---------|------|
| 普通方法/函数 | **原生 AOT** | 性能最优，零启动开销 |
| 构造函数/析构函数 | **原生 AOT** | 对象生命周期管理需要确定性 |
| 虚方法调用 | **原生 AOT**（vtable 间接调用） | 已知调用目标，无需 JIT |
| 接口方法调用 | **原生 AOT**（itable 间接调用） | 同上 |
| 热点循环体 | **原生 AOT** + JIT 优化反馈 | 先 AOT 执行，JIT 根据运行时信息优化 |
| 反射调用 (`@reflectable`) | **JIT/VM** | 运行时类型信息需要 VM 支持 |
| 动态代码生成 | **JIT/VM** | 运行时才能确定调用目标 |
| `match` 表达式（枚举变体） | **原生 AOT** | 编译时已知所有变体 |
| 异常处理 (try/catch) | **原生 AOT** + VM 协作 | 正常路径原生执行，异常展开走 VM |
| 泛型实例化 | **原生 AOT** | 编译时单态化 |
| Lambda/闭包 | **原生 AOT** | 编译时生成闭包类 |

### 原生与 VM 的交互接口

```c
// 原生代码调用 VM 函数（进入 VM 世界）
void* lemon_vm_call(LeVM* vm, uint32_t func_idx, void** args, int argc);

// VM 调用原生函数（回到原生世界）
typedef void* (*LeNativeFunc)(void** args, int argc);
void lemon_vm_register_native(LeVM* vm, const char* name, LeNativeFunc func);

// JIT 编译后的函数指针（VM → 原生桥接）
typedef void* (*LeJittedFunc)(void** args);
LeJittedFunc lemon_jit_compile(LeVM* vm, uint32_t func_idx);
```

---

## 阶段 A：混合执行引擎实现

### A.0 现状分析

当前编译器有三条独立的代码生成路径，互不连通：

| 路径 | 输出 | 运行方式 | 问题 |
|------|------|---------|------|
| CCodeGen → C → GCC → exe | 原生 exe | 纯原生 | 依赖外部 C 编译器 |
| NativeCodeGen → COFF → PE → exe | 原生 exe | 纯原生 | 功能严重不足 |
| BytecodeCompiler → .lmb → lemonvm | 字节码 | 纯 VM | 需要独立 VM 进程 |

**目标**：将三条路径合并为一条，生成同时包含原生代码和嵌入式 VM 的独立 exe。

### A.1 嵌入式 VM 运行时

**目标**：将当前独立的 `lemonvm` 改造为可嵌入 exe 的库。

| # | 任务 | 说明 |
|---|------|------|
| A.1.1 | VM 库化改造 | 将 `src/jit/vm.rs` 改造为 `LeVM` 结构体，支持实例化而非全局状态 |
| A.1.2 | VM 初始化接口 | `LeVM* le_vm_create(const uint8_t* lmb_data, uint32_t lmb_size)` |
| A.1.3 | VM 销毁接口 | `void le_vm_destroy(LeVM* vm)` |
| A.1.4 | VM 函数调用接口 | `void* le_vm_call(LeVM* vm, uint32_t func_idx, void** args, int argc)` |
| A.1.5 | 原生函数注册 | `void le_vm_register_native(LeVM* vm, const char* name, LeNativeFunc func)` |
| A.1.6 | JIT 编译接口 | `LeJittedFunc le_jit_compile(LeVM* vm, uint32_t func_idx)` |
| A.1.7 | 热点检测配置 | `void le_vm_set_jit_threshold(LeVM* vm, uint32_t threshold)` |
| A.1.8 | VM 线程安全 | 多线程场景下 VM 实例隔离 |
| A.1.9 | VM 内存管理 | VM 自身分配的内存与原生代码共享 GC |
| A.1.10 | 嵌入式 .lmb 数据段 | 将字节码作为 .rdata 段嵌入 exe，VM 启动时直接读取内存 |

### A.2 字节码编译器完善

**文件**：`src/jit/compiler.rs`

| # | 任务 | 当前状态 | 目标 |
|---|------|---------|------|
| A.2.1 | 枚举声明编译 | TODO: Enum support | 生成枚举类的字节码：字段定义、构造器、变体数据 |
| A.2.2 | ForEach 循环编译 | TODO: ForEach support | 翻译为 iterator + while 循环模式 |
| A.2.3 | Switch 语句编译 | TODO: Switch support | 翻译为 JumpIf 链 + Jump 表 |
| A.2.4 | Try/Catch/Finally 编译 | TODO: Exception handling | 实现异常表（exception table） |
| A.2.5 | Match 表达式编译 | TODO: Match expression | 翻译为类型检查 + 字段访问 + JumpIf 链 |
| A.2.6 | Throw 表达式编译 | TODO: Exception handling | 生成异常抛出指令 |
| A.2.7 | Lambda 表达式编译 | TODO: Lambda support | 生成闭包类 + 捕获变量 |
| A.2.8 | 一元运算符完善 | Plus/AddressOf/PreInc/PreDec/PostInc/PostDec 空分支 | 生成对应的字节码指令序列 |
| A.2.9 | 赋值目标扩展 | 非 Variable/FieldAccess 目标空分支 | 支持 ArrayAccess 赋值 |
| A.2.10 | Call 目标扩展 | 非 Variable/FieldAccess 的 callee 空分支 | 支持间接调用（函数指针） |
| A.2.11 | Cast 实际转换 | 仅编译内部表达式 | 生成类型检查 + 转换指令 |
| A.2.12 | InstanceOf 实际检查 | 硬编码 PushBool(true) | 检查对象的类型信息 |
| A.2.13 | Sizeof 实际计算 | 硬编码 PushConst(8) | 根据类型计算大小 |
| A.2.14 | NullCoalesce 修复 | 错误映射为 Shr | 生成 JumpIfNotNull + Jump 序列 |

### A.3 字节码指令扩展

**文件**：`src/jit/bytecode.rs`、`src/jit/serialize.rs`

| # | 新增指令 | 操作数 | 用途 |
|---|---------|--------|------|
| A.3.1 | `PushDouble(f64)` | 8字节浮点 | 替代 PushFloat，语义更清晰 |
| A.3.2 | `LoadArray` | 无 | 数组元素读取 |
| A.3.3 | `StoreArray` | 无 | 数组元素写入 |
| A.3.4 | `ArrayPush` | 无 | 数组添加元素 |
| A.3.5 | `MapNew` | 无 | 创建映射 |
| A.3.6 | `MapGet` | 无 | 映射读取 |
| A.3.7 | `MapPut` | 无 | 映射写入 |
| A.3.8 | `MapContains` | 无 | 映射包含检查 |
| A.3.9 | `StringConcat` | 无 | 字符串拼接 |
| A.3.10 | `StringLength` | 无 | 字符串长度 |
| A.3.11 | `StringEquals` | 无 | 字符串比较 |
| A.3.12 | `CheckCast(u32)` | 类型索引 | 类型检查 + 转换 |
| A.3.13 | `CheckNotNull` | 无 | 空检查（NullCoalesce 用） |
| A.3.14 | `Throw` | 无 | 抛出异常 |
| A.3.15 | `CatchEntry(u32)` | 异常类型索引 | 异常处理入口 |
| A.3.16 | `LeaveTry` | 无 | 离开 try 块 |
| A.3.17 | `FAdd/FSub/FMul/FDiv` | 无 | 浮点算术 |
| A.3.18 | `FCmp` | 无 | 浮点比较 |
| A.3.19 | `IncLocal(u32, i32)` | 变量索引,增量 | 局部变量递增（i++优化） |
| A.3.20 | `InvokeVirtual(u32, u32)` | 方法索引,参数数 | 虚方法调用 |
| A.3.21 | `CallNative(u32)` | 原生函数索引 | **VM → 原生桥接调用** |
| A.3.22 | `GetTypeId(u32)` | 类型索引 | 获取类型的 TypeId |

### A.4 虚拟机完善

**文件**：`src/jit/vm.rs`

| # | 任务 | 当前状态 | 目标 |
|---|------|---------|------|
| A.4.1 | Cast 指令实现 | TODO: Type casting | 检查对象类型信息，返回转换后的引用 |
| A.4.2 | InstanceOf 正确实现 | 硬编码返回 true | 检查对象的 type_info |
| A.4.3 | TypeId 正确实现 | 硬编码返回 0 | 返回对象的 type_info 指针 |
| A.4.4 | And/Or 短路求值 | 非短路 | 改为 JumpIfNot/JumpIf 实现 |
| A.4.5 | 浮点比较支持 | Lt/Gt/Le/Ge 仅整数 | 区分整数和浮点比较 |
| A.4.6 | 新增指令实现 | 不存在 | 实现 A.3 中所有新增指令 |
| A.4.7 | 字符串操作内置方法 | 仅 Printf | 实现 String_length/concat/equals/substring 等 |
| A.4.8 | 数组操作内置方法 | 基础 | 实现 Array_new/add/get/set/size/removeAt |
| A.4.9 | 映射操作内置方法 | 不存在 | 实现 Map_new/put/get/size/containsKey/remove |
| A.4.10 | 异常处理机制 | 不存在 | 实现异常表、try/catch/finally 语义 |
| A.4.11 | GC 集成 | Delete 仅弹出 | 实现引用计数或标记-清除 GC |
| A.4.12 | **CallNative 指令** | 不存在 | VM 调用原生函数的桥接机制 |
| A.4.13 | **原生函数注册表** | 不存在 | 维护函数名 → 原生函数指针的映射 |
| A.4.14 | **热点检测与 JIT 触发** | 未实际使用 | 函数调用计数超过阈值时触发 JIT 编译 |

### A.5 JIT 编译器完善

**文件**：`src/jit/jit_compiler.rs`

| # | 任务 | 当前状态 | 目标 |
|---|------|---------|------|
| A.5.1 | 变量存取指令 | NOP | 实现 LoadLocal/StoreLocal (栈帧偏移寻址) |
| A.5.2 | 字段存取指令 | NOP | 实现 LoadField/StoreField (对象偏移寻址) |
| A.5.3 | 控制流指令 | NOP | 实现 Jump/JumpIf/JumpIfNot (相对跳转) |
| A.5.4 | 函数调用指令 | NOP | 实现 Call/CallMethod (Windows x64 调用约定) |
| A.5.5 | 对象创建指令 | NOP | 实现 New (malloc + 构造器调用) |
| A.5.6 | 字符串指令 | NOP | 实现 PushString (RIP 相对寻址) |
| A.5.7 | 除法/取模指令 | NOP | 实现 Div/Mod (x86 idiv) |
| A.5.8 | 位运算指令 | NOP | 实现 BitAnd/BitOr/BitXor/BitNot/Shl/Shr |
| A.5.9 | 比较指令完善 | 仅 Eq/Ne/Lt/Gt | 补充 Le/Ge |
| A.5.10 | 浮点运算 | PushFloat 处理不当 | 使用 SSE2 指令 (addsd/subsd/mulsd/divsd) |
| A.5.11 | 数组操作指令 | NOP | 实现 ArrayGet/ArraySet/ArrayLen/NewArray |
| A.5.12 | Print/Printf 指令 | NOP | 调用 C 运行时 printf |
| A.5.13 | Return 指令完善 | 仅基本返回 | 处理返回值 + 栈帧清理 |
| A.5.14 | **CallNative 指令** | NOP | JIT 编译的代码调用原生函数 |
| A.5.15 | **JIT 代码安装** | 编译结果未使用 | 将 JIT 编译的机器码写入可执行内存，更新函数指针 |
| A.5.16 | **JIT → 原生调用约定** | 不存在 | JIT 编译的函数遵循 Windows x64 调用约定，可直接被原生代码调用 |
| A.5.17 | 寄存器分配优化 | 完全基于栈 | 实现简单的寄存器缓存策略 |

### A.6 混合编译管线

**目标**：改造编译器主流程，同时生成原生代码和字节码。

| # | 任务 | 说明 |
|---|------|------|
| A.6.1 | **执行策略决策器** | 在语义分析后，根据方法特征决定 AOT 还是 JIT 编译 |
| A.6.2 | **双代码生成器并行** | 对每个编译单元同时调用 NativeCodeGen 和 BytecodeCompiler |
| A.6.3 | **AOT 函数导出表** | 原生代码生成时，为每个 AOT 函数生成导出符号 |
| A.6.4 | **JIT 函数桩（stub）** | 对标记为 JIT 的函数，在原生代码中生成调用 VM 的桩函数 |
| A.6.5 | **嵌入式 .lmb 段** | 将字节码数据作为 PE 的自定义段嵌入 exe |
| A.6.6 | **VM 启动初始化** | exe 启动时初始化嵌入式 VM，注册原生函数，加载字节码 |
| A.6.7 | **异常处理桥接** | 原生代码的异常可被 VM 捕获，VM 的异常可在原生代码中传播 |
| A.6.8 | **`--target hybrid` 命令行** | 新增编译目标模式，默认生成混合执行 exe |
| A.6.9 | **`--jit-threshold` 命令行** | 控制热点检测阈值 |
| A.6.10 | **`--aot-only` / `--jit-only` 命令行** | 强制全 AOT 或全 JIT 模式（调试用） |

### A.7 执行策略决策规则

**文件**：新增 `src/ast/execution_strategy.rs`

```rust
enum ExecutionStrategy {
    Aot,           // 编译为原生代码
    Jit,           // 编译为字节码，运行时 JIT
    AotWithProfile, // AOT 编译，但收集运行时 profile 供后续 JIT 优化
}

fn decide_strategy(member: &ClassMember, class: &ClassDecl) -> ExecutionStrategy {
    // 规则 1：所有方法默认 AOT
    // 规则 2：@reflectable 注解的方法走 JIT
    // 规则 3：虚方法/接口方法走 AOT（vtable/itable 需要确定性地址）
    // 规则 4：异常处理相关的 catch 块走 JIT（简化展开逻辑）
    // 规则 5：含动态类型操作的走 JIT
    // 规则 6：--jit-only 模式下全部走 JIT
    // 规则 7：--aot-only 模式下全部走 AOT
}
```

| # | 任务 | 说明 |
|---|------|------|
| A.7.1 | 默认策略：全部 AOT | 初始版本所有方法都编译为原生代码 |
| A.7.2 | `@reflectable` 注解识别 | 标记的方法编译为字节码 |
| A.7.3 | 动态调用检测 | 含 `instanceof` + 强转的模式走 JIT |
| A.7.4 | 异常处理策略 | try 块原生执行，catch 块走 VM |
| A.7.5 | 热点 JIT 升级 | 运行时检测热点，将 VM 函数 JIT 编译为原生代码 |
| A.7.6 | 去优化（Deoptimization） | JIT 优化假设失败时，回退到 VM 解释执行 |

### A.8 .lmb 文件格式扩展

**文件**：`src/jit/serialize.rs`

| # | 任务 | 说明 |
|---|------|------|
| A.8.1 | 新增指令序列化/反序列化 | 为 A.3 中所有新增指令添加操作码 |
| A.8.2 | 异常表段 | 在 .lmb 文件中添加异常表段 |
| A.8.3 | 枚举/变体信息段 | 添加枚举类型和变体数据的序列化 |
| A.8.4 | **原生函数引用表** | 字节码中引用的原生函数名列表（用于运行时绑定） |
| A.8.5 | **执行策略元数据** | 每个函数的执行策略标记（AOT/JIT/混合） |
| A.8.6 | 版本兼容性 | 版本号升级，旧版 .lmb 文件检测 |

---

## 阶段 B：原生独立程序（无需外部 C 编译器）

### B.0 目标

实现 `lemonc --target hybrid` 从 .lm 文件一步生成独立 exe，**无需安装任何外部工具**。

生成的 exe 包含：
- 原生 x86-64 机器码（.text 段）
- 全局数据（.data/.rdata 段）
- 嵌入式字节码（.lmb 段）
- 嵌入式 VM 运行时（.text 段）
- DLL 导入表（msvcrt.dll 基础函数）

### B.1 NativeCodeGen 功能补全

**文件**：`src/codegen/native_gen.rs`

| # | 任务 | 当前状态 | 目标 |
|---|------|---------|------|
| B.1.1 | 浮点数字面量 | 返回 0 | 使用 SSE2 movdqa 加载浮点常量 |
| B.1.2 | 浮点数运算 | 不存在 | 实现 addss/addsd/subsd/mulsd/divsd |
| B.1.3 | 数组操作 | ArrayAccess 返回 0 | 实现 LemonArray_new/add/get/set/size |
| B.1.4 | 映射操作 | 不存在 | 实现 LemonMap_new/put/get/size/containsKey |
| B.1.5 | Break 语句 | 空分支 | 生成 jmp 到循环结束标签 |
| B.1.6 | Continue 语句 | 空分支 | 生成 jmp 到循环递增标签 |
| B.1.7 | Switch 语句 | 仅生成 0 | 生成 cmp + je/jne 跳转表 |
| B.1.8 | Try/Catch/Finally | 空分支 | 实现 Windows SEH 或手动 setjmp/longjmp |
| B.1.9 | Match 表达式 | 返回 0 | 生成类型检查 + 字段解构 + 跳转 |
| B.1.10 | NullCoalesce 运算符 | 空分支 | 生成 cmp + je 三元逻辑 |
| B.1.11 | 枚举声明 | 空分支 | 生成枚举结构体 + 变体构造器 |
| B.1.12 | 接口支持 | 不存在 | 生成 itable 结构 + 接口方法调度 |
| B.1.13 | 虚方法调度 | 收集但未使用 | 生成 vtable 查找 + 间接调用 |
| B.1.14 | 字符串内置方法 | 仅 C 字面量 | 实现 String_length/concat/equals/substring 等 |
| B.1.15 | StringBuilder 支持 | 不存在 | 实现 StringBuilder 运行时函数 |
| B.1.16 | 一元运算符补全 | 仅 Minus/Not/BitNot/Deref | 补充 Plus/AddressOf/PreInc/PostInc/PreDec/PostDec |
| B.1.17 | Throw 表达式 | 返回 0 | 生成异常抛出代码 |
| B.1.18 | Lambda 表达式 | 返回 0 | 生成闭包结构 + 捕获变量 |
| B.1.19 | **VM 桩函数生成** | 不存在 | 为 JIT 函数生成调用 VM 的桩代码 |
| B.1.20 | **VM 初始化调用** | 不存在 | 在 main() 开头插入 VM 初始化代码 |

### B.2 内置运行时库

**目标**：将运行时函数用 x86-64 机器码实现，嵌入生成的 COFF 目标文件。

| # | 运行时函数 | 说明 |
|---|-----------|------|
| B.2.1 | `malloc` / `free` | 调用 msvcrt.dll malloc/free |
| B.2.2 | `printf` | 导入 msvcrt.dll printf |
| B.2.3 | `strlen` / `strcmp` / `strcpy` / `strdup` | 导入 msvcrt.dll 或内联实现 |
| B.2.4 | `LemonArray_new/add/get/set/size/removeAt` | 完整数组运行时 |
| B.2.5 | `LemonMap_new/put/get/size/containsKey/remove/keys` | 完整映射运行时（含 rehash） |
| B.2.6 | `String_concat/length/equals/substring/trim/replace` | 完整字符串运行时 |
| B.2.7 | `String_intToString/longToString/doubleToString` | 数值转字符串 |
| B.2.8 | `StringBuilder_new/append/toString/length` | StringBuilder 运行时 |
| B.2.9 | `gc_init/gc_alloc/gc_mark/gc_sweep` | GC 框架 |
| B.2.10 | `setjmp/longjmp` | 异常处理基础（导入 msvcrt.dll） |
| B.2.11 | `fopen/fclose/fread/fwrite` | 文件 I/O（导入 msvcrt.dll） |
| B.2.12 | **嵌入式 VM 运行时** | le_vm_create/call/destroy/register_native |
| B.2.13 | **JIT 编译运行时** | le_jit_compile + 可执行内存分配 (VirtualProtect) |

### B.3 PE 链接器增强

**文件**：`src/linker/linker.rs`

| # | 任务 | 当前状态 | 目标 |
|---|------|---------|------|
| B.3.1 | 多 DLL 导入支持 | 仅 msvcrt.dll | 支持导入 kernel32.dll (VirtualProtect 等) |
| B.3.2 | 运行时库 COFF 合并 | 不支持 | 将内置运行时库 COFF 与用户代码 COFF 合并 |
| B.3.3 | **自定义段支持** | 不支持 | 支持将 .lmb 字节码数据放入自定义段 |
| B.3.4 | **嵌入式 VM COFF 合并** | 不支持 | 将 VM 运行时 COFF 与用户代码合并 |
| B.3.5 | 资源段支持 | 不存在 | 支持 .rsrc 段（图标、版本信息） |
| B.3.6 | 调试信息段 | 不存在 | 支持 CodeView/PDB 调试信息 |
| B.3.7 | SEH 支持 | 不存在 | 支持 Windows 结构化异常处理（.pdata/.xdata 段） |
| B.3.8 | TLS 支持 | 不存在 | 支持线程局部存储（用于异常处理） |

### B.4 Lemon 版编译器混合代码生成

**长期目标**：让 Lemon 版编译器也能生成混合执行 exe。

| # | 任务 | 说明 |
|---|------|------|
| B.4.1 | 在 CCodeGen.lm 中添加 --target hybrid 支持 | 或创建新的 NativeCodeGen.lm |
| B.4.2 | Lemon 版 x86-64 指令编码 | 用 Lemon 语言实现 x86-64 机器码生成 |
| B.4.3 | Lemon 版 COFF 生成 | 用 Lemon 语言实现 COFF64 目标文件生成 |
| B.4.4 | Lemon 版 PE 链接 | 用 Lemon 语言实现 PE32+ 链接器 |
| B.4.5 | Lemon 版字节码编译器 | 用 Lemon 语言实现 BytecodeCompiler |
| B.4.6 | Lemon 版嵌入式 VM | 用 Lemon 语言实现 VM 运行时 |
| B.4.7 | 自举验证 | T0→T1(hybrid)→T2(hybrid) 固定点验证 |

---

## 阶段 C：逐步修复已知问题和待完善事项

### C.1 严重问题修复（影响正确性）

| # | 任务 | 优先级 | 说明 |
|---|------|--------|------|
| C.1.1 | 重构类型推断机制 | 高 | 将 `inferArrayElementTypeFromFieldName` 的 20 条硬编码替换为语义分析阶段收集的类型信息 |
| C.1.2 | 统一 exprIsStringType 方法名列表 | 高 | 提取为共享 Set\<String\> 常量，4 处列表统一 |
| C.1.3 | 重构 genObjMethodCall 容器类型处理 | 高 | 建立方法签名注册表，替代硬编码 |

### C.2 功能完善（影响功能完整性）

| # | 任务 | 优先级 | 说明 |
|---|------|--------|------|
| C.2.1 | Lemon 版实现 --build 模式 | 高 | 在 LemonCompiler.lm 中实现目录扫描和文件合并 |
| C.2.2 | 泛型类实例化 | 中 | 从 Rust 版移植 `collect_generic_instances` 到 Lemon 版 |
| C.2.3 | 方法重载解析 | 中 | 从 Rust 版移植 `resolve_method_overload` 到 Lemon 版 |
| C.2.4 | import 语句实现 | 中 | 支持多文件模块化编译 |
| C.2.5 | Lambda 表达式 | 中 | 闭包捕获 + 函数指针 |
| C.2.6 | 模块系统 | 低 | package + import 完整实现 |

### C.3 代码质量改善

| # | 任务 | 优先级 | 说明 |
|---|------|--------|------|
| C.3.1 | 清理根目录编译产物 | 高 | 删除 17 个 .c 文件，更新 .gitignore |
| C.3.2 | 清理 build 目录调试文件 | 高 | 删除 debug.gdb、临时测试文件 |
| C.3.3 | 修复 GCC 编译警告 | 中 | 逐步消除类型转换和格式字符串警告 |
| C.3.4 | LemonMap rehash 改为迭代 | 中 | 当前递归实现可能栈溢出 |
| C.3.5 | emitRuntimeLibrary 拆分 | 中 | 700+ 行单函数，拆分为多个子函数 |
| C.3.6 | Rust 版与 Lemon 版同步机制 | 低 | 建立变更同步检查清单 |

### C.4 性能优化

| # | 任务 | 优先级 | 说明 |
|---|------|--------|------|
| C.4.1 | 字符串拼接优化 | 中 | 多字符串拼接使用 StringBuilder 替代嵌套 String_concat |
| C.4.2 | LemonMap 初始容量优化 | 低 | 根据使用场景调整初始容量 |
| C.4.3 | GC 实际使用 | 低 | 将标记-清除框架接入对象分配 |
| C.4.4 | 编译速度基准测试 | 低 | 对比 Rust 版与 Lemon 版编译速度 |
| C.4.5 | 内存释放机制 | 低 | 长时间运行程序的内存泄漏修复 |

### C.5 测试完善

| # | 任务 | 优先级 | 说明 |
|---|------|--------|------|
| C.5.1 | 自动化测试脚本 | 高 | 编写 PowerShell 脚本自动运行所有测试 |
| C.5.2 | 自举验证脚本 | 高 | 编写一键自举验证脚本（T0→T1→T2→T3→T4） |
| C.5.3 | 回归测试 | 中 | 修改 CCodeGen 后自动验证自举链 |
| C.5.4 | 混合执行测试 | 中 | 测试 AOT+JIT 混合模式的正确性 |
| C.5.5 | 性能基准测试 | 低 | 建立编译速度和运行时性能基准 |
| C.5.6 | 内存泄漏检测 | 低 | 使用 Valgrind/ASan 检测内存问题 |

---

## 实施路线图

### 第一阶段：基础架构（先让混合模式跑起来）

```
1. C.1.1 类型推断重构（前置条件）
2. A.1 嵌入式 VM 运行时（VM 库化 + 嵌入 exe）
3. A.6.5 嵌入式 .lmb 段（字节码嵌入 PE）
4. A.6.6 VM 启动初始化（exe 启动时初始化 VM）
5. B.1.19-20 VM 桩函数 + 初始化调用
6. A.6.8 --target hybrid 命令行
```

**里程碑**：`lemonc --target hybrid hello.lm` 生成独立 exe，所有代码走 AOT，VM 空转但已嵌入。

### 第二阶段：JIT 通路打通

```
1. A.2 字节码编译器完善（14 项 TODO）
2. A.3 字节码指令扩展（22 条新指令）
3. A.4 虚拟机完善（含 CallNative 桥接）
4. A.6.1-4 执行策略决策器 + 双代码生成 + AOT 导出 + JIT 桩
5. A.6.7 异常处理桥接
```

**里程碑**：`lemonc --target hybrid hello.lm` 生成的 exe 中，部分函数走 JIT/VM 执行，其余走 AOT。

### 第三阶段：JIT 编译器 + 热点优化

```
1. A.5 JIT 编译器完善（17 项）
2. A.7 执行策略决策规则
3. A.4.14 热点检测与 JIT 触发
4. A.5.15-17 JIT 代码安装 + 调用约定 + 寄存器分配
```

**里程碑**：VM 函数热点检测触发 JIT 编译，后续调用走原生代码。

### 第四阶段：原生独立程序

```
1. B.1 NativeCodeGen 补全（20 项）
2. B.2 内置运行时库（13 项）
3. B.3 PE 链接器增强（8 项）
```

**里程碑**：`lemonc --target hybrid hello.lm` 一步生成独立 exe，零外部依赖。

### 第五阶段：持续改进

```
1. C.2 功能完善（泛型/重载/import/Lambda）
2. C.3 代码质量
3. C.4 性能优化
4. B.4 Lemon 版混合代码生成（长期目标）
```

### 依赖关系图

```
C.1.1 类型推断重构
  ├─→ B.1 NativeCodeGen 补全（需要正确的类型信息）
  └─→ A.6 混合编译管线（需要类型信息传递）

A.1 嵌入式 VM 运行时
  ├─→ A.6.5 嵌入式 .lmb 段
  ├─→ A.6.6 VM 启动初始化
  └─→ B.1.19 VM 桩函数生成

A.2 字节码编译器完善
  ├─→ A.3 字节码指令扩展
  └─→ A.4 虚拟机完善

A.4 虚拟机完善
  ├─→ A.5 JIT 编译器完善
  └─→ A.6.7 异常处理桥接

A.5 JIT 编译器完善
  └─→ A.7 执行策略决策

B.1 NativeCodeGen 补全
  ├─→ B.2 内置运行时库
  └─→ B.3 PE 链接器增强

B.1-B.3 原生独立程序
  └─→ B.4 Lemon 版混合代码生成（长期目标）
```

### 注意事项

1. **每次修改 CCodeGen.lm 后必须走完整自举链验证**
2. **修改 Rust 版 c_gen.rs 需同步到 Lemon 版**
3. **NativeCodeGen 使用 Windows x64 调用约定**（rcx, rdx, r8, r9）
4. **JIT 编译的代码也必须遵循 Windows x64 调用约定**，确保原生代码可直接调用 JIT 函数
5. **VM → 原生桥接**：CallNative 指令需要正确处理参数传递和返回值
6. **原生 → VM 桥接**：桩函数需要将原生参数打包为 VM 栈格式
7. **异常处理跨边界**：原生代码抛出的异常必须能被 VM 的 catch 捕获，反之亦然
8. **GC 跨边界**：原生代码和 VM 代码共享同一 GC，对象引用需要统一管理
9. **新增字节码指令时必须同步更新序列化/反序列化**
10. **嵌入式 .lmb 数据需要与 exe 的地址空间对齐**，VM 读取时无需额外拷贝
