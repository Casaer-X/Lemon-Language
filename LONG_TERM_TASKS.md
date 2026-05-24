# Lemon 编译器长期任务记录

> 记录短期内难以完成的任务，供后续开发参考。

---

## Phase 3：原生代码生成（预估 ~3000 行）

### 3.1 x86-64 指令编码器
- 新建 `src_lem/codegen/X8664.lm`
- 操作码编码表（MOV, ADD, SUB, MUL, DIV, CMP, JMP, CALL, RET 等）
- REX 前缀、ModR/M + SIB 编码、立即数编码、寄存器编码表
- **难点**：需要精确的 x86-64 指令编码知识，调试困难

### 3.2 原生代码生成器
- 新建 `src_lem/codegen/NativeCodeGen.lm`
- 将 AST 直接编译为 x86-64 机器码
- 生成 COFF64 目标文件格式
- Windows x64 调用约定（RCX, RDX, R8, R9 传参）
- **难点**：完整的寄存器分配、栈帧布局、虚方法表生成

### 3.3 COFF64 目标文件生成
- 新建 `src_lem/codegen/COFF64.lm`
- COFF 文件头、段表、符号表、重定位表
- **难点**：二进制格式精确性，需要与 Windows 链接器兼容

### 3.4 PE32+ 链接器
- 新建 `src_lem/codegen/PELinker.lm`
- 合并 COFF 目标文件、解析符号表和重定位
- 生成 PE32+ 可执行文件（DOS 头、PE 签名、段表、导入表、IAT）
- **难点**：PE 格式复杂，导入表处理尤其困难

### 3.5 NASM 汇编生成器
- 新建 `src_lem/codegen/NasmCodeGen.lm`
- 生成 NASM 语法的 x86-64 汇编代码
- **难度**：中等，但需要完整的代码生成逻辑

---

## Phase 4：字节码与虚拟机（预估 ~2500 行）

### 4.1 字节码指令定义
- 新建 `src_lem/jit/Bytecode.lm`
- 60+ 条字节码指令定义
- BytecodeModule、BytecodeFunction、BytecodeClass 结构

### 4.2 字节码编译器
- 新建 `src_lem/jit/BytecodeCompiler.lm`
- 将 AST 编译为 BytecodeModule
- 栈式字节码生成、局部变量索引分配、字符串常量池管理

### 4.3 字节码序列化
- 新建 `src_lem/jit/Serialize.lm`
- .lmb 文件格式（魔数 0x4C4D4230、函数表、类表、字符串池）
- **难点**：二进制序列化/反序列化，Lemon 缺乏原生字节操作支持

### 4.4 虚拟机 (LeVM)
- 新建 `src_lem/jit/LeVM.lm`
- 基于栈的虚拟机、指令解释执行循环
- 函数调用栈帧管理、原生函数注册
- **难点**：VMValue 联合体在 Lemon 中的实现（void* + tag）

### 4.5 JIT 编译器
- 新建 `src_lem/jit/JitCompiler.lm`
- 将热点字节码函数编译为 x86-64 机器码
- **难点**：运行时代码生成，Windows 内存保护（VirtualProtect）

---

## Phase 5：运行时库与混合执行（预估 ~800 行）

### 5.1 原生运行时库
- 新建 `src_lem/runtime/Runtime.lm`
- 17+ 个运行时函数（内存管理、数组操作、字符串操作、I/O 操作）

### 5.2 执行策略决策
- 新建 `src_lem/ast/ExecutionStrategy.lm`
- 分析每个方法/函数的执行策略（AOT/JIT/AotWithProfile）

### 5.3 混合执行集成
- 在 LemonCompiler.lm 中集成混合执行流程
- AOT 方法 → NativeCodeGen → COFF
- JIT 方法 → BytecodeCompiler → .lmb 段
- PELinker 合并 COFF + .lmb → exe

---

## Phase 6.2：IR 中间表示（可选，预估 ~1500 行）

- 新建 `src_lem/ir/` 目录
- IR.lm：SSA 形式 IR 指令定义
- IRGen.lm：AST → IR 生成
- IRType.lm：IR 类型系统
- IRFunction.lm / IRModule.lm：IR 函数/模块结构
- **优势**：统一多后端代码生成的中间层，便于高级优化

---

## 已知技术限制

1. **void* 限制**：LemonArray_get() 返回 void*，无法链式访问成员，需要显式类型转换
2. **二进制操作**：Lemon 缺乏原生字节操作支持（字节码序列化需要）
3. **运行时代码生成**：JIT 需要在运行时生成和执行机器码，涉及内存保护
4. **平台依赖**：PE 格式、COFF 格式、Windows API 调用等都是平台特定的
5. **调试困难**：原生代码生成和 JIT 的调试比 C 代码生成困难得多

---

## 建议的实施顺序

1. **Phase 3.5 NASM 生成器**（最简单的原生代码生成入口）
2. **Phase 4.1-4.3 字节码定义+编译器+序列化**（不依赖原生代码生成）
3. **Phase 3.1 X8664 指令编码器**（基础组件）
4. **Phase 3.2 原生代码生成器**（依赖 X8664）
5. **Phase 3.3 COFF64**（依赖原生代码生成器）
6. **Phase 4.4 虚拟机**（依赖字节码）
7. **Phase 3.4 PE 链接器**（依赖 COFF64）
8. **Phase 4.5 JIT 编译器**（依赖虚拟机和 X8664）
9. **Phase 5 运行时库与混合执行**（依赖以上所有）
