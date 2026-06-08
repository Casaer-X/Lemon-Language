# Language Lemon 开发任务计划

> Lemon 版编译器（自举版）为当前主力开发目标，Rust 版仅作 T0 引导使用。

---

## 当前状态

| 模块 | 状态 | 文件 | 说明 |
|------|------|------|------|
| Lexer | ✅ 完成 | `lexer/` (5 文件) | 词法分析，60+ Token 类型 |
| Parser | ✅ 完成 | `parser/` (5 文件) | 递归下降 + Pratt 表达式解析 |
| Semantic | ✅ 完成 | `semantic/` (4 文件) | 类型检查、继承验证 |
| CCodeGen | ✅ 完成 | `codegen/CCodeGen.lm` (3791 行) | 默认参数、泛型实例化已完整 |
| Optimizer | ✅ 完成 | `ast/Optimizer.lm` | 常量折叠/传播/死代码消除 |
| IR/IRGen | ✅ 完成 | `ir/` (4 文件) | SSA IR 生成 |
| Runtime | ✅ 完成 | `runtime/Runtime.lm` | 40+ 运行时函数注册 |
| X8664 | ⚠️ 部分 | `codegen/X8664.lm` (441 行) | 缺 SSE2 浮点指令编码 |
| NativeCodeGen | ⚠️ 部分 | `codegen/NativeCodeGen.lm` (686 行) | 基础结构存在，需验证和完善 |
| NasmCodeGen | ⚠️ 部分 | `codegen/NasmCodeGen.lm` (854 行) | 1 处 TODO |
| COFF64 | ⚠️ 部分 | `codegen/COFF64.lm` (444 行) | COFF 目标文件生成 |
| PELinker | ⚠️ 部分 | `codegen/PELinker.lm` (569 行) | PE32+ 链接器 |
| BytecodeCompiler | ⚠️ 部分 | `jit/BytecodeCompiler.lm` (509 行) | 字节码生成 |
| LeVM | ⚠️ 部分 | `jit/LeVM.lm` (703 行) | 虚拟机 |
| JitCompiler | ⚠️ 部分 | `jit/JitCompiler.lm` (634 行) | JIT 编译器 |
| ExecutionStrategy | ✅ 完成 | `ast/ExecutionStrategy.lm` | AOT/JIT 策略决策 |
| LemonCompiler | ✅ 完成 | `LemonCompiler.lm` (478 行) | --build 模式、多目标分发 |

---

## 任务清单

### P0 — 自举完整性（必须保证固定点验证通过）

| # | 任务 | 模块 | 说明 |
|---|------|------|------|
| P0-1 | CCodeGen 默认参数值填充 | `codegen/CCodeGen.lm` | ✅ 已完成 — `resolve_method_with_defaults` 已接入 genObjMethodCall 4 个调用点 |
| P0-2 | CCodeGen 泛型类实例化 | `codegen/CCodeGen.lm` | ✅ 已完成 — `collectGenericInstances` + `emit_generic_implementations` + 类型替换完整 |
| P0-3 | 自举验证 | 全量 | ✅ 已完成 — T0→T1→T2→T3 固定点验证通过 (T2.c ≡ T3.c) |

### P1 — 原生代码生成链路

| # | 任务 | 模块 | 说明 |
|---|------|------|------|
| P1-1 | X8664 SSE2 浮点指令编码 | `codegen/X8664.lm` | ✅ 已完成 — 添加 25+ SSE2 指令: MOVQ/MOVSD/MOVSS, ADDSD/SUBSD/MULSD/DIVSD, ADDSS/SUBSS/MULSS/DIVSS, COMISD/UCOMISD, CVTSI2SD/CVTTSD2SI, CVTSS2SD/CVTSD2SS, XMM 栈保存/恢复 |
| P1-2 | NativeCodeGen 浮点运算支持 | `codegen/NativeCodeGen.lm` | 接入 SSE2 指令，处理 float/double 类型 |
| P1-3 | NativeCodeGen 数组/Map 操作 | `codegen/NativeCodeGen.lm` | ArrayAccess、Map 操作的机器码生成 |
| P1-4 | COFF64 验证和完善 | `codegen/COFF64.lm` | 验证段生成、符号表、重定位 |
| P1-5 | PELinker 验证和完善 | `codegen/PELinker.lm` | 验证 PE 头、导入表、段合并 |
| P1-6 | NasmCodeGen args 填充修复 | `codegen/NasmCodeGen.lm` | 修复第 902 行 TODO |

### P2 — 字节码与 JIT 链路

| # | 任务 | 模块 | 说明 |
|---|------|------|------|
| P2-1 | BytecodeCompiler 验证和完善 | `jit/BytecodeCompiler.lm` | 验证所有 AST 节点→字节码翻译 |
| P2-2 | LeVM 验证和完善 | `jit/LeVM.lm` | 验证指令执行循环、栈帧管理 |
| P2-3 | JitCompiler 验证和完善 | `jit/JitCompiler.lm` | 验证热点检测、x86-64 代码生成 |
| P2-4 | 混合执行集成测试 | `LemonCompiler.lm` | 验证 `--target hybrid` 全链路 |

### P3 — 优化与增强

| # | 任务 | 模块 | 说明 |
|---|------|------|------|
| P3-1 | Match 完备性检查 | `semantic/SemanticAnalyzer.lm` | 检查匹配是否覆盖所有枚举变体 |
| P3-2 | 访问权限检查 | `semantic/SemanticAnalyzer.lm` | private/protected 访问权限语义检查 |
| P3-3 | AST 优化器验证 | `ast/Optimizer.lm` | 验证常量折叠/传播/死代码消除 |
| P3-4 | 性能测试与基准 | 全量 | 对比编译速度和运行时性能 |

---

## 执行顺序

```
P0-1 → P0-2 → P0-3 (自举验证)
  ↓
P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → P1-6
  ↓
P2-1 → P2-2 → P2-3 → P2-4
  ↓
P3-1 → P3-2 → P3-3 → P3-4
```

每次修改 CCodeGen.lm 后必须走自举验证。
