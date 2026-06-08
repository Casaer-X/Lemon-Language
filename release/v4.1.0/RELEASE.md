# lemonc v4.1.0 Release

## 基本信息

- **版本**: v4.1.0
- **发布日期**: 2026-06-08
- **编译器**: Lemon 自举编译器 (T1)
- **自举验证**: T2.c SHA256 ≡ T3.c SHA256 = `750B82DA669F3490379EBAE3180959C3F11B5E22829F357B67BF76C5BB9B2050`

## 下载

| 文件 | 说明 | SHA256 |
|------|------|--------|
| `lemonc-v4.1.0-windows-x86_64.exe` | Windows x64 T1 编译器 | `828FDDAC2B45F30DC707802A436CCE21B5D2CB1ED4EFB64323C670927EE50675` |
| `lemonc_lm-src-v4.1.0.tar.gz` | 编译器源码 (lemonc_lm) | — |

## 系统要求

- Windows 10+ / Windows Server 2019+
- x86-64 CPU
- (可选) GCC (MinGW-w64) — 用于编译生成的 C 代码

## 用法

```bash
# 编译 Lemon 源码为 C 代码
lemonc-v4.1.0-windows-x86_64.exe hello.lm

# 指定输出文件
lemonc-v4.1.0-windows-x86_64.exe hello.lm -o hello.c

# 不同编译目标
lemonc-v4.1.0-windows-x86_64.exe hello.lm --target c          # C 代码 (默认)
lemonc-v4.1.0-windows-x86_64.exe hello.lm --target native     # x86-64 机器码
lemonc-v4.1.0-windows-x86_64.exe hello.lm --target bytecode   # 字节码
lemonc-v4.1.0-windows-x86_64.exe hello.lm --target ir         # SSA IR
lemonc-v4.1.0-windows-x86_64.exe hello.lm --target hybrid     # 混合执行分析

# 自行编译 (需要 GCC)
lemonc-v4.1.0-windows-x86_64.exe hello.lm -o hello.c && gcc -O2 -o hello.exe hello.c
```

## 从源码构建

```bash
# 一键构建
./scripts/bootstrap.ps1

# 手动构建
cd lemonc && cargo build --release
cd ..
./lemonc/target/x86_64-pc-windows-gnu/release/lemonc lemonc_lm/**/*.lm --target c -o build/lemonc_lm.c
gcc -O2 -static -o build/lemonc_lm.exe build/lemonc_lm.c
```

## 编译器特性

| 特性 | 状态 |
|------|------|
| 词法分析 | 60+ Token 类型 |
| 语法分析 | 递归下降 + Pratt 表达式 |
| 语义分析 | 类型检查、继承验证、访问控制、Match 完备性 |
| C 代码生成 | 完整 C99 输出 |
| SSA IR | 40+ 操作码 |
| x86-64 原生代码 | X8664 指令编码 + SSE2 浮点 |
| 字节码编译器 | AST → 138 操作码 |
| JIT 编译器 | 字节码 → x86-64 |
| 栈式 VM | LeVM 解释器 |
| 混合执行 | AOT+JIT 策略分析 |
| AST 优化器 | 常量折叠/传播/死代码消除 |
| PE 链接器 | PE32+ 格式 |

## 变更日志

详见 [CHANGELOG.md](../../CHANGELOG.md) 和 [changelogs/](../../changelogs/) 目录。

### v4.1.0 新增

- SSA IR 中间表示 (40+ 操作码)
- AST → IR 生成器
- `--target ir` 输出选项

## 开发路线

后续开发完全在 Lemon 源码上进行。Rust T0 编译器已冻结，仅保留为引导入口。
