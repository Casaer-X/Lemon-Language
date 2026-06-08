import * as vscode from 'vscode';
import { LemonDiagnosticsProvider } from './diagnostics';
import { LemonCompletionProvider } from './completion';
import { LemonDefinitionProvider } from './definition';
import { LemonHoverProvider } from './hover';
import { LemonDocumentSymbolProvider } from './symbols';
import {
    runLemonProgram,
    compileLemonProgram,
    compileToBytecode,
    buildLemonProject,
    compileWithAnnotation
} from './commands';

/**
 * Language Lemon VS Code Extension — v4.1.0
 *
 * Provides:
 * - Diagnostics (error reporting via lemonc)
 * - Completion (IntelliSense)
 * - Definition (Go to Definition)
 * - Hover (type info)
 * - Document Symbols (outline)
 * - Commands (Run, Compile, Build)
 * - Syntax highlighting (TextMate grammar)
 * - Snippets
 */
export function activate(context: vscode.ExtensionContext) {
    // ── Diagnostics ──────────────────────────────────────
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('lemon');
    const diagnosticsProvider = new LemonDiagnosticsProvider(diagnosticCollection);

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            if (event.document.languageId === 'lemon') {
                const config = vscode.workspace.getConfiguration('lemon.diagnostics');
                if (config.get('onChange', true)) {
                    diagnosticsProvider.updateDiagnostics(event.document);
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.languageId === 'lemon') {
                diagnosticsProvider.updateDiagnostics(document);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            diagnosticCollection.delete(document.uri);
        })
    );

    // ── Completion ───────────────────────────────────────
    const completionProvider = new LemonCompletionProvider();
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider('lemon', completionProvider, '.', '->', ' ')
    );

    // ── Definition ───────────────────────────────────────
    const definitionProvider = new LemonDefinitionProvider();
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider('lemon', definitionProvider)
    );

    // ── Hover ────────────────────────────────────────────
    const hoverProvider = new LemonHoverProvider();
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('lemon', hoverProvider)
    );

    // ── Document Symbols ─────────────────────────────────
    const symbolProvider = new LemonDocumentSymbolProvider();
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider('lemon', symbolProvider)
    );

    // ── Commands ─────────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand('lemon.run', runLemonProgram));
    context.subscriptions.push(vscode.commands.registerCommand('lemon.compile', compileLemonProgram));
    context.subscriptions.push(vscode.commands.registerCommand('lemon.compileBytecode', compileToBytecode));
    context.subscriptions.push(vscode.commands.registerCommand('lemon.buildProject', buildLemonProject));
    context.subscriptions.push(vscode.commands.registerCommand('lemon.compileWithAnnotation', compileWithAnnotation));

    // ── Initial diagnostics ──────────────────────────────
    vscode.workspace.textDocuments.forEach(doc => {
        if (doc.languageId === 'lemon') {
            diagnosticsProvider.updateDiagnostics(doc);
        }
    });

    console.log('Language Lemon extension activated (v4.1.0)');
}

export function deactivate() {
    console.log('Language Lemon extension deactivated');
}
