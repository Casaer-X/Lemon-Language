# vscode-lemon - Lemon 语言 VS Code 支持

[![版本](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Casaer-X/vscode-lemon)
[![许可证](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/vscode-%5E1.74.0-blue.svg)](https://code.visualstudio.com)

[English](README.md) | 简体中文

> Lemon 编程语言的官方 VS Code 扩展。

为 Lemon 语言开发提供语法高亮、智能提示、实时诊断、悬停信息、跳转到定义、文档符号、代码片段和构建命令支持。

## 功能特性

### 语法高亮
- 完整的 TextMate 语法支持 `.lm` 文件
- 高亮关键字、类型、字符串、注释、运算符、注解
- 区分类名、函数名、变量、字段

### 智能提示（IntelliSense）
- 关键字、类型和修饰符补全
- 文档级补全：类、函数、变量
- 成员补全（`.` 和 `->`）
- 内置函数建议

### 实时诊断
- 语法检查：括号匹配、未闭合字符串
- 语义分析：重复声明、未定义标识符
- 可选编译器集成进行深度分析

### 代码导航
- **悬停**：类型信息和文档
- **跳转到定义**：`F12` 或 `Ctrl+Click`
- **文档符号**：`Ctrl+Shift+O`

### 代码片段
- `class` - 类声明
- `main` - 主方法入口（类名可任意命名）
- `scall` - 静态方法调用
- `icall` - 实例方法调用 (this.method())
- `sclass` - 带静态方法的类
- `if` / `ifelse` - 条件语句
- `for` / `while` - 循环
- `trycatch` - 异常处理
- 更多...

### 方法访问规则

Lemon 遵循 Java 风格的方法访问规范：

- **静态方法**：`类名.方法名(参数)` — 例如 `Math.abs(-42)`
- **实例方法**：`对象.方法名(参数)` — 例如 `obj.greet()`
- **类内部调用**：实例方法用 `this.方法名(参数)`，静态方法用 `类名.方法名(参数)`
- **禁止裸方法调用**：在类内部调用方法时，必须使用 `this.` 或 `类名.` 前缀

### 命令
| 命令 | 快捷键 | 说明 |
|---------|----------|-------------|
| 运行 Lemon 程序 | `Ctrl+Shift+R` | 编译并运行当前文件 |
| 编译 Lemon 程序 | - | 编译为可执行文件 |
| 编译为字节码 | - | 编译为 `.lmb` |
| 构建 Lemon 项目 | - | 构建整个项目 |
| 使用注解编译 | - | 从源码注解自动检测 |

## 安装

### 从 VSIX 安装

1. 从 [Releases](https://github.com/Casaer-X/vscode-lemon/releases) 下载 `vscode-lemon-1.0.0.vsix`
2. VS Code → 扩展 → `...` → 从 VSIX 安装
3. 选择下载的文件

### 从源码安装

```bash
git clone https://github.com/Casaer-X/vscode-lemon.git
cd vscode-lemon
npm install
npm run compile
```

然后将文件夹复制到 VS Code 扩展目录。

## 系统要求

- VS Code 1.74.0 或更高版本
- （可选）PATH 中有 `lemonc` 编译器以获得编译器集成诊断

## 配置

打开 VS Code 设置（`Ctrl+,`）并搜索 "Lemon"：

| 设置 | 默认值 | 说明 |
|---------|---------|-------------|
| `lemon.languageServer.path` | `""` | `lemonc` 可执行文件路径 |
| `lemon.diagnostics.enable` | `true` | 启用诊断 |
| `lemon.diagnostics.onChange` | `true` | 文件更改时检查 |
| `lemon.completion.enable` | `true` | 启用自动补全 |

## 编译器集成

此扩展与 [lemonc](https://github.com/Casaer-X/lemonc) 编译器配合使用效果最佳。编译器提供：

- 深度语义分析
- 项目级构建
- 基于注解的编译

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。
