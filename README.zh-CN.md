# Language Lemon 项目

[English](README.md) | 简体中文

> 一门结合 C 语言底层控制能力与 Java 风格面向对象的系统级编程语言。

这是 Language Lemon 项目的总览仓库，包含以下组件：

## 组件

### 1. lemonc_lm — 自举编译器

用 Lemon 语言编写的官方编译器。

- **路径**: `lemonc_lm/`（git 子模块）
- **仓库**: [github.com/Casaer-X/lemonc_lm](https://github.com/Casaer-X/lemonc_lm)
- **特性**: 多目标编译 (C/原生/字节码/IR/混合)、JIT 运行时、x86-64 代码生成、PE 链接器
- **语言**: Lemon（自举）
- **自举验证**: T2.c SHA256 ≡ T3.c SHA256 ✓

```bash
git clone --recurse-submodules https://github.com/Casaer-X/Language-Lemon.git
cd Language-Lemon
```

### 2. lemonc — Rust T0 引导编译器

用于引导自举链的初始 Rust 编译器。

- **路径**: `lemonc/`
- **仓库**: [github.com/Casaer-X/lemonc](https://github.com/Casaer-X/lemonc)
- **特性**: 词法分析、语法分析、语义分析、C 代码生成
- **语言**: Rust

```bash
cd lemonc
cargo build --release
```

### 3. vscode-lemon — VS Code 扩展

Lemon 语言的官方 VS Code 扩展。

- **路径**: `vscode-lemon/`
- **仓库**: [github.com/Casaer-X/vscode-lemon](https://github.com/Casaer-X/vscode-lemon)
- **特性**: 语法高亮、代码片段、语言配置
- **语言**: TypeScript

```bash
cd vscode-lemon
npm install
npm run compile
```

## 快速开始

### 1. 引导编译器

```bash
# 编译 Rust T0 编译器
cd lemonc
cargo build --release

# 用 T0 编译 lemonc_lm → T1.c
cd ..
./lemonc/target/release/lemonc lemonc_lm/**/*.lm --target c -o build_t1/lemonc_lm.c

# 用 GCC 编译 T1.c → T1.exe
gcc -O2 -o build_t1/lemonc_lm.exe build_t1/lemonc_lm.c

# T1 就绪 — 它可以编译自己！
./build_t1/lemonc_lm --target c lemonc_lm/**/*.lm -o my_program.c
```

### 2. 安装 VS Code 扩展

将 `vscode-lemon/` 复制或软链接到 VS Code 扩展目录，或通过 VSIX 安装。

### 3. 编写第一个程序

创建 `hello.lm`：

```lemon
package main;

public class HelloLemon {
    public static void main(String[] args) {
        System.printf("Hello, World!\n");
    }
}
```

### 4. 编译并运行

```bash
./build_t1/lemonc_lm hello.lm -o hello.exe
./hello.exe
```

## 文档

- [用户指南](GUIDE.md)
- [更新日志](CHANGELOG.md)
- [任务清单](TASKS.md)
- [vscode-lemon 说明](vscode-lemon/README.md)

## 项目结构

```
Language-Lemon/
├── lemonc_lm/          # 自举编译器（子模块）
├── lemonc/             # Rust T0 引导编译器
├── vscode-lemon/       # VS Code 扩展
├── stdlib/             # 标准库
├── examples/           # 示例程序
├── changelogs/         # 版本变更日志
├── GUIDELINE.md        # 用户指南
├── CHANGELOG.md        # 主变更日志
└── TASKS.md            # 任务清单
```

## 许可证

MIT 许可证 — 详见 [LICENSE](LICENSE) 文件。
