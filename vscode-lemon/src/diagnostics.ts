import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export class LemonDiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor(diagnosticCollection: vscode.DiagnosticCollection) {
        this.diagnosticCollection = diagnosticCollection;
    }

    public updateDiagnostics(document: vscode.TextDocument): void {
        if (document.languageId !== 'lemon') {
            return;
        }

        const config = vscode.workspace.getConfiguration('lemon.diagnostics');
        if (!config.get('enable', true)) {
            this.diagnosticCollection.delete(document.uri);
            return;
        }

        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // Built-in syntax checking (fast, no external dependency)
        diagnostics.push(...this.checkSyntax(document, lines));

        // Try to use lemonc compiler for deeper analysis
        this.runCompilerDiagnostics(document, diagnostics);
    }

    private checkSyntax(document: vscode.TextDocument, lines: string[]): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const braceStack: { line: number; char: number }[] = [];
        const parenStack: { line: number; char: number }[] = [];
        const bracketStack: { line: number; char: number }[] = [];
        let inBlockComment = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let inString = false;
            let stringChar = '';

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const prevChar = j > 0 ? line[j - 1] : '';

                // Handle block comments (must check before strings)
                if (!inString && !inBlockComment && char === '*' && prevChar === '/') {
                    inBlockComment = true;
                    continue;
                }
                if (inBlockComment && char === '/' && prevChar === '*') {
                    inBlockComment = false;
                    continue;
                }
                if (inBlockComment) continue;

                // Handle strings
                if (!inString && (char === '"' || char === "'")) {
                    inString = true;
                    stringChar = char;
                    continue;
                }
                if (inString && char === stringChar) {
                    // Count consecutive backslashes before this quote to determine if it's escaped
                    let backslashCount = 0;
                    let k = j - 1;
                    while (k >= 0 && line[k] === '\\') {
                        backslashCount++;
                        k--;
                    }
                    // If even number of backslashes (including 0), the quote is not escaped
                    if (backslashCount % 2 === 0) {
                        inString = false;
                        continue;
                    }
                }
                if (inString) continue;

                // Handle line comments
                if (char === '/' && prevChar === '/') break;

                // Check braces
                if (char === '{') {
                    braceStack.push({ line: i, char: j });
                } else if (char === '}') {
                    if (braceStack.length === 0) {
                        diagnostics.push(this.createDiagnostic(
                            document, i, j, i, j + 1,
                            'Unexpected closing brace',
                            vscode.DiagnosticSeverity.Error
                        ));
                    } else {
                        braceStack.pop();
                    }
                }

                // Check parentheses
                if (char === '(') {
                    parenStack.push({ line: i, char: j });
                } else if (char === ')') {
                    if (parenStack.length === 0) {
                        diagnostics.push(this.createDiagnostic(
                            document, i, j, i, j + 1,
                            'Unexpected closing parenthesis',
                            vscode.DiagnosticSeverity.Error
                        ));
                    } else {
                        parenStack.pop();
                    }
                }

                // Check brackets
                if (char === '[') {
                    bracketStack.push({ line: i, char: j });
                } else if (char === ']') {
                    if (bracketStack.length === 0) {
                        diagnostics.push(this.createDiagnostic(
                            document, i, j, i, j + 1,
                            'Unexpected closing bracket',
                            vscode.DiagnosticSeverity.Error
                        ));
                    } else {
                        bracketStack.pop();
                    }
                }
            }

            // Check for unterminated strings (only at end of line, not in block comments)
            if (inString && !inBlockComment) {
                diagnostics.push(this.createDiagnostic(
                    document, i, 0, i, line.length,
                    'Unterminated string literal',
                    vscode.DiagnosticSeverity.Error
                ));
            }
        }

        // Report unclosed braces
        for (const pos of braceStack) {
            diagnostics.push(this.createDiagnostic(
                document, pos.line, pos.char, pos.line, pos.char + 1,
                'Unclosed opening brace',
                vscode.DiagnosticSeverity.Error
            ));
        }

        // Report unclosed parentheses
        for (const pos of parenStack) {
            diagnostics.push(this.createDiagnostic(
                document, pos.line, pos.char, pos.line, pos.char + 1,
                'Unclosed opening parenthesis',
                vscode.DiagnosticSeverity.Error
            ));
        }

        // Report unclosed brackets
        for (const pos of bracketStack) {
            diagnostics.push(this.createDiagnostic(
                document, pos.line, pos.char, pos.line, pos.char + 1,
                'Unclosed opening bracket',
                vscode.DiagnosticSeverity.Error
            ));
        }

        return diagnostics;
    }

    private runCompilerDiagnostics(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
        const config = vscode.workspace.getConfiguration('lemon');
        const lemoncPath = config.get<string>('languageServer.path', '');
        const lemonc = lemoncPath || 'lemonc';

        // Try to run lemonc for deeper analysis
        try {
            const result = cp.spawnSync(lemonc, [document.fileName, '--parse-only'], {
                encoding: 'utf-8',
                timeout: 5000,
                windowsHide: true
            });

            if (result.stderr) {
                const errLines = result.stderr.split('\n');
                for (const line of errLines) {
                    const match = line.match(/Error.*line\s+(\d+),\s*col\s+(\d+):\s*(.+)/);
                    if (match) {
                        const lineNum = parseInt(match[1]) - 1;
                        const colNum = parseInt(match[2]) - 1;
                        const message = match[3];
                        diagnostics.push(this.createDiagnostic(
                            document, lineNum, colNum, lineNum, colNum + 1,
                            message,
                            vscode.DiagnosticSeverity.Error
                        ));
                    }
                }
            }
        } catch (error) {
            // lemonc not available, use built-in diagnostics only
        }

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private createDiagnostic(
        document: vscode.TextDocument,
        startLine: number,
        startChar: number,
        endLine: number,
        endChar: number,
        message: string,
        severity: vscode.DiagnosticSeverity
    ): vscode.Diagnostic {
        const range = new vscode.Range(
            new vscode.Position(startLine, startChar),
            new vscode.Position(endLine, endChar)
        );
        const diagnostic = new vscode.Diagnostic(range, message, severity);
        diagnostic.source = 'lemon';
        return diagnostic;
    }
}
