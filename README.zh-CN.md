# Language Lemon 项目

> 一门结合 C 语言底层控制能力与 Java 风格面向对象的系统级编程语言。

这是 Language Lemon 项目的总览仓库，包含两个主要组件：

## 组件

### 1. lemonc - 编译器与 JIT 运行时

Lemon 的官方编译器和 JIT 运行时。

- **仓库**: [github.com/Casaer-X/lemonc](https://github.com/Casaer-X/lemonc)
- **特性**: 多目标编译、JIT 运行时、项目构建系统
- **语言**: Rust

```bash
git clone https://github.com/Casaer-X/lemonc.git
cd lemonc
cargo build --release
```

### 2. vscode-lemon - VS Code 扩展

Lemon 语言的官方 VS Code 扩展。

- **仓库**: [github.com/Casaer-X/vscode-lemon](https://github.com/Casaer-X/vscode-lemon)
- **特性**: 语法高亮、智能提示、诊断、代码片段
- **语言**: TypeScript

```bash
git clone https://github.com/Casaer-X/vscode-lemon.git
cd vscode-lemon
npm install
npm run compile
```

## 快速开始

### 1. 安装编译器

```bash
git clone https://github.com/Casaer-X/lemonc.git
cd lemonc
cargo build --release
```

### 2. 安装 VS Code 扩展

从 [vscode-lemon releases](https://github.com/Casaer-X/vscode-lemon/releases) 下载 `vscode-lemon-1.0.0.vsix` 并在 VS Code 中安装。

### 3. 编写第一个程序

创建 `hello.lm`：

```lemon
package main;

public class HelloLemon {
    public static void main(String[] args) {
        printf("Hello, World!\n");
    }
}
```

### 4. 编译并运行

```bash
lemonc hello.lm -o hello.exe
./hello.exe
```

## 文档

- [lemonc 用户指南](lemonc/GUIDE.md)
- [lemonc 错误参考](lemonc/ERRORS_AND_WARNINGS.md)
- [项目概览](PROJECT_HANDOVER.md)
- [更新日志](CHANGELOG.md)

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。
