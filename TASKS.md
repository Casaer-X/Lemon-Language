# Language Lemon 开发任务计划

> Lemon 版编译器（自举版）为当前主力开发目标，Rust 版仅作 T0 引导使用。

---

## 当前状态

| 模块 | 状态 | 文件 | 说明 |
|------|------|------|------|
| Lexer | ✅ 完成 | `lexer/` (5 文件) | 词法分析，60+ Token 类型 |
| Parser | ✅ 完成 | `parser/` (5 文件) | 递归下降 + Pratt 表达式解析 |
| Semantic | ✅ 完成 | `semantic/` (4 文件) | 类型检查、继承验证、访问控制、Match 完备性 |
| CCodeGen | ✅ 完成 | `codegen/CCodeGen.lm` (3791 行) | 默认参数、泛型实例化已完整 |
| Optimizer | ✅ 完成 | `ast/Optimizer.lm` | 常量折叠/传播/死代码消除 (含浮点比较折叠) |
| IR/IRGen | ✅ 完成 | `ir/` (4 文件) | SSA IR 生成 |
| Runtime | ✅ 完成 | `runtime/Runtime.lm` | 40+ 运行时函数注册 |
| X8664 | ✅ 完成 | `codegen/X8664.lm` (441 行) | SSE2 浮点指令完整 |
| NativeCodeGen | ✅ 完成 | `codegen/NativeCodeGen.lm` (686 行) | 浮点运算、数组/Map 操作 |
| NasmCodeGen | ✅ 完成 | `codegen/NasmCodeGen.lm` (854 行) | args 填充修复 |
| COFF64 | ✅ 完成 | `codegen/COFF64.lm` (444 行) | COFF 目标文件生成 |
| PELinker | ✅ 完成 | `codegen/PELinker.lm` (569 行) | PE32+ 链接器 (IAT RVA 修复) |
| BytecodeCompiler | ✅ 完成 | `jit/BytecodeCompiler.lm` (509 行) | 浮点运算检测、CALL_VIRT 编码 |
| LeVM | ✅ 完成 | `jit/LeVM.lm` (703 行) | CALL_VIRT 修复、Map 操作完整 |
| JitCompiler | ✅ 完成 | `jit/JitCompiler.lm` (634 行) | 浮点 push、RET epilogue |
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
| P1-1 | X8664 SSE2 浮点指令编码 | `codegen/X8664.lm` | ✅ 已完成 — 添加 25+ SSE2 指令 |
| P1-2 | NativeCodeGen 浮点运算支持 | `codegen/NativeCodeGen.lm` | ✅ 已完成 — 接入 SSE2 指令 |
| P1-3 | NativeCodeGen 数组/Map 操作 | `codegen/NativeCodeGen.lm` | ✅ 已完成 — ArrayAccess 赋值 |
| P1-4 | COFF64 验证和完善 | `codegen/COFF64.lm` | ✅ 已完成 — 结构正确 |
| P1-5 | PELinker 验证和完善 | `codegen/PELinker.lm` | ✅ 已完成 — IAT RVA 修复 |
| P1-6 | NasmCodeGen args 填充修复 | `codegen/NasmCodeGen.lm` | ✅ 已完成 — args fill loop |

### P2 — 字节码与 JIT 链路

| # | 任务 | 模块 | 说明 |
|---|------|------|------|
| P2-1a | BytecodeCompiler 浮点类型检测 | `jit/BytecodeCompiler.lm` | ✅ 已完成 — isFloatExpr + DADD/DSUB/DMUL/DDIV |
| P2-1b | BytecodeCompiler 函数索引编码 | `jit/BytecodeCompiler.lm` | ✅ 已完成 — classIdx*10000+methodIdx |
| P2-2a | LeVM CALL_VIRT 修复 | `jit/LeVM.lm` | ✅ 已完成 — 弹出全部参数、逆序 |
| P2-2b | LeVM Map 操作 | `jit/LeVM.lm` | ✅ 已完成 — MAP_GET/SET/CONTAINS |
| P2-3a | JitCompiler 浮点 push 修复 | `jit/JitCompiler.lm` | ✅ 已完成 — imm64 位模式编码 |
| P2-3b | JitCompiler RET epilogue | `jit/JitCompiler.lm` | ✅ 已完成 — emitEpilogue() |
| P2-4 | 混合执行集成测试 | `codegen/test_hybrid.lm` | ✅ 已完成 — 7 大功能覆盖 (整数/浮点/数组/Map/枚举+Match/继承+虚调用/常量折叠) |

### P3 — 优化与增强

| # | 任务 | 模块 | 说明 |
|---|------|------|------|
| P3-1 | Match 完备性检查 | `semantic/SemanticAnalyzer.lm` | ✅ 已完成 — inferEnumTypeFromExpr + collectCoveredVariants + nonExhaustiveMatch |
| P3-2 | 访问权限检查 | `semantic/SemanticAnalyzer.lm` | ✅ 已完成 — ClassInfo.fieldModifiers 存储 + getFieldModifiers 返回修饰符 + isAccessAllowed |
| P3-3 | AST 优化器验证 | `ast/Optimizer.lm` | ✅ 已完成 — 修复浮点比较运算符折叠 (Eq/Ne/Lt/Gt/Le/Ge → BoolLiteral) |
| P3-4 | 性能测试与基准 | `codegen/bench_hybrid.lm` | ✅ 已完成 — 6 大性能场景 (整数/浮点/数组/Map/虚调用/递归) |

---

## 执行顺序

```
P0-1 → P0-2 → P0-3 (自举验证) ✅
  ↓
P1-1 → P1-2 → P1-3 → P1-4 → P1-5 → P1-6 ✅
  ↓
P2-1a → P2-1b → P2-2a → P2-2b → P2-3a → P2-3b → P2-4 ✅
  ↓
P3-1 → P3-2 → P3-3 → P3-4 ✅
```

## 下次自举验证注意

修改了以下文件后需要重新走 P0-3 自举验证:
- `semantic/SemanticAnalyzer.lm` — ClassInfo 构造函数签名变更 (新增 fieldModifiers 参数)
- `ast/Optimizer.lm` — 浮点比较运算符折叠逻辑变更

每次修改 CCodeGen.lm 后必须走自举验证。
