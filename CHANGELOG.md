# Changelog

All notable changes to the Language Lemon project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-05-12

### First Official Release

Language Lemon v1.0.0 is the first stable release of the Lemon programming language toolchain, featuring a complete compiler, JIT runtime, VSCode extension, and build system.

### Added

#### Compiler (lemonc)
- **Complete compiler pipeline**: Lexer → Parser → Semantic Analyzer → IR Generator → Optimizer → Code Generator
- **Multiple compilation targets**:
  - C source code generation (default)
  - NASM x86-64 assembly
  - Direct executable compilation
  - Native x86-64 code generation (COFF64)
  - Bytecode compilation (.lmb files)
- **Source annotation system**: Auto-detect compilation target from source comments
  - `// @compile target=bytecode`
  - `// @compile optimize=2`
  - `// @compile output=myapp.exe`
  - `// @compile dep=math,io`
- **Project build system**: `lemonc --build` for multi-module projects
  - Automatic source discovery
  - Dependency resolution with topological sorting
  - Circular dependency detection

#### JIT Runtime (lemonvm)
- **Bytecode interpreter**: Execute .lmb files with full VM
- **JIT compiler**: Hotspot detection and x86-64 native code generation
- **Configurable JIT threshold**: `--jit-threshold <n>`
- **Debug mode**: `--debug` for bytecode inspection

#### VSCode Extension
- **Syntax highlighting**: Full TextMate grammar for .lm files
- **IntelliSense**: Code completion for keywords, types, and document symbols
- **Diagnostics**: Real-time syntax and semantic checking
- **Hover information**: Type info and documentation on hover
- **Go to Definition**: Navigate to symbol definitions
- **Document symbols**: Outline view support
- **Code snippets**: 15+ templates (class, main, if, for, etc.)
- **Commands**: Run, Compile, Build Project, Annotation-based compilation

#### Language Features
- **Object-oriented programming**: Classes, inheritance, interfaces
- **Access modifiers**: public, private, static, virtual, override, abstract, final
- **Default public access**: Unspecified members default to public
- **Annotations**: @override, @virtual, @reflectable
- **Generics**: Type parameters with bounds
- **Pointers**: Type* and Type-> syntax
- **String operations**: Built-in String type with methods
- **External functions**: extern keyword for C interop
- **Garbage collection**: Mark-sweep GC framework

### Supported Platforms
- Windows (x86_64, MinGW)
- Linux (x86_64, GCC/Clang)
- macOS (x86_64, Clang)

### Documentation
- GUIDE.md: Complete user manual
- ERRORS_AND_WARNINGS.md: Error reference
- PROJECT_HANDOVER.md: Project overview and architecture

## [0.2.0] - 2025-08-16

### Added
- JIT compiler and VM
- Bytecode serialization (.lmb format)
- VSCode extension prototype

## [0.1.0] - 2025-06-01

### Added
- Initial compiler implementation
- C code generation
- Basic semantic analysis
