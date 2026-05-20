# Changelog

All notable changes to the Language Lemon project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.3.0] - 2026-05-19

### Bootstrap Milestone: Lemon Lexer & Parser Self-Hosted

Language Lemon can now rewrite its own compiler frontend in Lemon. This is a critical milestone for the self-bootstrapping plan.

#### Lemon Lexer (src_lem/lexer/)
- Complete rewrite of the lexer in Lemon language (5 files)
- Token output matches Rust version for all .lm files (differs only by EOF token)
- Self-lex test passes for all 5 lexer source files

#### Lemon Parser (src_lem/parser/)
- Complete rewrite of the parser in Lemon language (3 files, ~2900 lines)
- Recursive descent parser with Pratt expression parsing
- 46 AST node declarations, 61 declarations parsed correctly across 8 .lm files
- Self-parse test passes for all 8 .lm files

#### Compiler Fixes
- Fix `File_readAll` name conflict (static vs instance method)
- Fix `Array`/`Map` static method code generation
- Add field type inference in `infer_class_from_expr`
- Add `String.join` and `Array.push` builtin methods
- Fix optimizer loop variable constant propagation
- Add `\0` escape sequence support in lexer

#### VS Code Extension Fixes
- Remove false-positive semantic checks (bare method calls, undefined variables, redeclarations)
- Fix string escape handling (consecutive backslash counting)
- Add builtin class completions (System, Array, Map, String, File, Character)
- Add `System.`, `Array.`, `Map.` member completions
- Expand String method completions

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
