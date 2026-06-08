import * as vscode from 'vscode';

export class LemonDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.DocumentSymbol[] {
        const symbols: vscode.DocumentSymbol[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (trimmed.startsWith('//')) continue;

            // Package
            const packageMatch = trimmed.match(/^package\s+(\w+);/);
            if (packageMatch) {
                const symbol = new vscode.DocumentSymbol(
                    packageMatch[1],
                    'package',
                    vscode.SymbolKind.Package,
                    new vscode.Range(i, 0, i, line.length),
                    new vscode.Range(i, line.indexOf(packageMatch[1]), i, line.indexOf(packageMatch[1]) + packageMatch[1].length)
                );
                symbols.push(symbol);
            }

            // Class
            const classMatch = trimmed.match(/^(?:public\s+)?class\s+(\w+)/);
            if (classMatch) {
                const className = classMatch[1];
                const classSymbol = new vscode.DocumentSymbol(
                    className,
                    'class',
                    vscode.SymbolKind.Class,
                    new vscode.Range(i, 0, i, line.length),
                    new vscode.Range(i, line.indexOf(className), i, line.indexOf(className) + className.length)
                );

                // Find class body and extract members
                const braceIndex = this.findClassEnd(lines, i);
                if (braceIndex > i) {
                    for (let j = i + 1; j < braceIndex; j++) {
                        const memberLine = lines[j].trim();
                        if (memberLine.startsWith('//') || memberLine === '') continue;

                        // Field
                        const fieldMatch = memberLine.match(/^(?:public|private|static|final)?\s*([\w\[\]<>]+)\s+(\w+)\s*;/);
                        if (fieldMatch) {
                            const fieldSymbol = new vscode.DocumentSymbol(
                                fieldMatch[2],
                                `field: ${fieldMatch[1]}`,
                                vscode.SymbolKind.Field,
                                new vscode.Range(j, 0, j, lines[j].length),
                                new vscode.Range(j, lines[j].indexOf(fieldMatch[2]), j, lines[j].indexOf(fieldMatch[2]) + fieldMatch[2].length)
                            );
                            classSymbol.children.push(fieldSymbol);
                        }

                        // Method
                        const methodMatch = memberLine.match(/^(?:public|private|static|virtual|override|abstract|final)?\s*([\w\[\]<>]+)\s+(\w+)\s*\(/);
                        if (methodMatch) {
                            const methodSymbol = new vscode.DocumentSymbol(
                                methodMatch[2],
                                `method: ${methodMatch[1]}`,
                                vscode.SymbolKind.Method,
                                new vscode.Range(j, 0, j, lines[j].length),
                                new vscode.Range(j, lines[j].indexOf(methodMatch[2]), j, lines[j].indexOf(methodMatch[2]) + methodMatch[2].length)
                            );
                            classSymbol.children.push(methodSymbol);
                        }

                        // Constructor
                        const ctorMatch = memberLine.match(/^(?:public|private)\s+(\w+)\s*\(/);
                        if (ctorMatch && ctorMatch[1] === className) {
                            const ctorSymbol = new vscode.DocumentSymbol(
                                ctorMatch[1],
                                'constructor',
                                vscode.SymbolKind.Constructor,
                                new vscode.Range(j, 0, j, lines[j].length),
                                new vscode.Range(j, lines[j].indexOf(ctorMatch[1]), j, lines[j].indexOf(ctorMatch[1]) + ctorMatch[1].length)
                            );
                            classSymbol.children.push(ctorSymbol);
                        }
                    }
                }

                symbols.push(classSymbol);
            }

            // Interface
            const interfaceMatch = trimmed.match(/^interface\s+(\w+)/);
            if (interfaceMatch) {
                const interfaceSymbol = new vscode.DocumentSymbol(
                    interfaceMatch[1],
                    'interface',
                    vscode.SymbolKind.Interface,
                    new vscode.Range(i, 0, i, line.length),
                    new vscode.Range(i, line.indexOf(interfaceMatch[1]), i, line.indexOf(interfaceMatch[1]) + interfaceMatch[1].length)
                );
                symbols.push(interfaceSymbol);
            }

            // Function (top-level)
            const funcMatch = trimmed.match(/^(?:public|private|static|extern)?\s*([\w\[\]<>]+)\s+(\w+)\s*\(/);
            if (funcMatch && !this.isInsideClass(lines, i)) {
                const funcSymbol = new vscode.DocumentSymbol(
                    funcMatch[2],
                    `function: ${funcMatch[1]}`,
                    vscode.SymbolKind.Function,
                    new vscode.Range(i, 0, i, line.length),
                    new vscode.Range(i, line.indexOf(funcMatch[2]), i, line.indexOf(funcMatch[2]) + funcMatch[2].length)
                );
                symbols.push(funcSymbol);
            }
        }

        return symbols;
    }

    private findClassEnd(lines: string[], startLine: number): number {
        let braceDepth = 0;
        let foundOpenBrace = false;
        for (let i = startLine; i < lines.length; i++) {
            for (const char of lines[i]) {
                if (char === '{') {
                    braceDepth++;
                    foundOpenBrace = true;
                } else if (char === '}') {
                    braceDepth--;
                    if (foundOpenBrace && braceDepth === 0) return i;
                }
            }
        }
        return lines.length - 1;
    }

    private isInsideClass(lines: string[], lineIndex: number): boolean {
        let braceDepth = 0;
        for (let i = 0; i <= lineIndex; i++) {
            const trimmed = lines[i].trim();
            if (trimmed.match(/^(?:public\s+)?class\s+/)) {
                braceDepth = 0;
            }
            for (const char of lines[i]) {
                if (char === '{') braceDepth++;
                else if (char === '}') braceDepth--;
            }
        }
        return braceDepth > 0;
    }
}
