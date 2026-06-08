# vscode-lemon

Language Lemon 的官方 VS Code 扩展，提供语法高亮、代码片段和语言支持。

## 特性

- **语法高亮**: 完整的 TextMate 语法定义，支持关键字、类型、操作符、注释、字符串等
- **代码片段**: 23 个常用代码模板（类、方法、循环、match 等）
- **语言配置**: 括号匹配、自动闭合、注释切换、缩进规则

## 安装

### 从 VSIX 安装

```bash
cd vscode-lemon
npm install
npm run compile
npm run package
```

然后在 VS Code 中：`Extensions` → `...` → `Install from VSIX...` → 选择生成的 `.vsix` 文件。

### 从源码安装

1. 克隆仓库
2. `npm install`
3. `npm run compile`
4. 按 F5 启动扩展开发主机

## 开发

```bash
npm install          # 安装依赖
npm run compile      # 编译 TypeScript
npm run watch        # 监视模式
npm run package      # 打包为 VSIX
```

## 文件结构

```
vscode-lemon/
├── package.json                    # 扩展清单
├── language-configuration.json     # 语言配置
├── syntaxes/
│   └── lemon.tmLanguage.json      # TextMate 语法
├── snippets/
│   └── lemon.json                 # 代码片段
├── src/
│   └── extension.ts               # 扩展入口
├── tsconfig.json
├── .vscodeignore
└── README.md
```
