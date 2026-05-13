# Language Lemon Project

English | [简体中文](README.zh-CN.md)

> A systems programming language combining C-level control with Java-style object orientation.

This is the umbrella repository for the Language Lemon project, which consists of two main components:

## Components

### 1. lemonc - Compiler & JIT Runtime

The official compiler and JIT runtime for Lemon.

- **Repository**: [github.com/Casaer-X/lemonc](https://github.com/Casaer-X/lemonc)
- **Features**: Multi-target compilation, JIT runtime, project build system
- **Language**: Rust

```bash
git clone https://github.com/Casaer-X/lemonc.git
cd lemonc
cargo build --release
```

### 2. vscode-lemon - VS Code Extension

Official VS Code extension for Lemon language support.

- **Repository**: [github.com/Casaer-X/vscode-lemon](https://github.com/Casaer-X/vscode-lemon)
- **Features**: Syntax highlighting, IntelliSense, diagnostics, snippets
- **Language**: TypeScript

```bash
git clone https://github.com/Casaer-X/vscode-lemon.git
cd vscode-lemon
npm install
npm run compile
```

## Quick Start

### 1. Install Compiler

```bash
git clone https://github.com/Casaer-X/lemonc.git
cd lemonc
cargo build --release
```

### 2. Install VS Code Extension

Download `vscode-lemon-1.0.0.vsix` from the [vscode-lemon releases](https://github.com/Casaer-X/vscode-lemon/releases) and install in VS Code.

### 3. Write Your First Program

Create `hello.lm`:

```lemon
package main;

public class HelloLemon {
    public static void main(String[] args) {
        printf("Hello, World!\n");
    }
}
```

### 4. Compile and Run

```bash
lemonc hello.lm -o hello.exe
./hello.exe
```

## Documentation

- [lemonc User Guide](lemonc/GUIDE.md)
- [lemonc Error Reference](lemonc/ERRORS_AND_WARNINGS.md)
- [Project Overview](PROJECT_HANDOVER.md)
- [Changelog](CHANGELOG.md)

## License

MIT License - see [LICENSE](LICENSE) file for details.
