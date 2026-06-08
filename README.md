# Language Lemon Project

English | [简体中文](README.zh-CN.md)

> A systems programming language combining C-level control with Java-style object orientation.

This is the umbrella repository for the Language Lemon project, which consists of the following components:

## Components

### 1. lemonc_lm — Self-Bootstrapping Compiler

The official compiler for Lemon, written in Lemon itself.

- **Path**: `lemonc_lm/` (git submodule)
- **Repository**: [github.com/Casaer-X/lemonc_lm](https://github.com/Casaer-X/lemonc_lm)
- **Features**: Multi-target compilation (C/native/bytecode/IR/hybrid), JIT runtime, x86-64 codegen, PE linker
- **Language**: Lemon (self-bootstrapping)
- **Bootstrap Verified**: T2.c SHA256 ≡ T3.c SHA256 ✓

```bash
git clone --recurse-submodules https://github.com/Casaer-X/Language-Lemon.git
cd Language-Lemon
```

### 2. lemonc — Rust T0 Bootstrap Compiler

The initial Rust-based compiler used to bootstrap the self-compiling chain.

- **Path**: `lemonc/`
- **Repository**: [github.com/Casaer-X/lemonc](https://github.com/Casaer-X/lemonc)
- **Features**: Lexer, parser, semantic analysis, C code generation
- **Language**: Rust

```bash
cd lemonc
cargo build --release
```

### 3. vscode-lemon — VS Code Extension

Official VS Code extension for Lemon language support.

- **Path**: `vscode-lemon/`
- **Repository**: [github.com/Casaer-X/vscode-lemon](https://github.com/Casaer-X/vscode-lemon)
- **Features**: Syntax highlighting, IntelliSense, diagnostics, snippets
- **Language**: TypeScript

```bash
cd vscode-lemon
npm install
npm run compile
```

## Quick Start

### 1. Bootstrap the Compiler

```bash
# Build the Rust T0 compiler
cd lemonc
cargo build --release

# Use T0 to compile lemonc_lm → T1.c
cd ..
./lemonc/target/release/lemonc lemonc_lm/**/*.lm --target c -o build_t1/lemonc_lm.c

# Compile T1.c with GCC → T1.exe
gcc -O2 -o build_t1/lemonc_lm.exe build_t1/lemonc_lm.c

# T1 is now ready — it compiles itself!
./build_t1/lemonc_lm --target c lemonc_lm/**/*.lm -o my_program.c
```

### 2. Install VS Code Extension

Copy or symlink `vscode-lemon/` to your VS Code extensions folder, or install from VSIX.

### 3. Write Your First Program

Create `hello.lm`:

```lemon
package main;

public class HelloLemon {
    public static void main(String[] args) {
        System.printf("Hello, World!\n");
    }
}
```

### 4. Compile and Run

```bash
./build_t1/lemonc_lm hello.lm -o hello.exe
./hello.exe
```

## Documentation

- [User Guide](GUIDE.md)
- [Changelog](CHANGELOG.md)
- [Task Tracker](TASKS.md)
- [vscode-lemon README](vscode-lemon/README.md)

## Project Structure

```
Language-Lemon/
├── lemonc_lm/          # Self-bootstrapping compiler (submodule)
├── lemonc/             # Rust T0 bootstrap compiler
├── vscode-lemon/       # VS Code extension
├── stdlib/             # Standard library
├── examples/           # Example programs
├── changelogs/         # Version changelogs
├── GUIDELINE.md        # User guide
├── CHANGELOG.md        # Main changelog
└── TASKS.md            # Task tracker
```

## License

MIT License — see [LICENSE](LICENSE) file for details.
