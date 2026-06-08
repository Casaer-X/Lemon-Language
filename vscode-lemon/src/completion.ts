import * as vscode from 'vscode';

export class LemonCompletionProvider implements vscode.CompletionItemProvider {
    private keywords: vscode.CompletionItem[];
    private types: vscode.CompletionItem[];
    private modifiers: vscode.CompletionItem[];
    private builtins: vscode.CompletionItem[];

    constructor() {
        this.keywords = this.createKeywordCompletions();
        this.types = this.createTypeCompletions();
        this.modifiers = this.createModifierCompletions();
        this.builtins = this.createBuiltinCompletions();
    }

    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.CompletionItem[] {
        const lineText = document.lineAt(position).text;
        const textBeforeCursor = lineText.substring(0, position.character);
        const items: vscode.CompletionItem[] = [];

        // Get context from the document
        const documentSymbols = this.extractDocumentSymbols(document);

        // Check if we're after a dot (member access)
        const memberAccessMatch = textBeforeCursor.match(/(\w+)\.$/);
        if (memberAccessMatch) {
            const objectName = memberAccessMatch[1];
            return this.getMemberCompletions(objectName, documentSymbols, document);
        }

        // Check if we're after -> (pointer member access)
        const arrowAccessMatch = textBeforeCursor.match(/(\w+)->$/);
        if (arrowAccessMatch) {
            const objectName = arrowAccessMatch[1];
            return this.getMemberCompletions(objectName, documentSymbols, document);
        }

        // Check if we're in a type position
        if (this.isTypePosition(textBeforeCursor)) {
            items.push(...this.types);
            items.push(...documentSymbols.classes.map(c => new vscode.CompletionItem(c, vscode.CompletionItemKind.Class)));
            items.push(...documentSymbols.interfaces.map(i => new vscode.CompletionItem(i, vscode.CompletionItemKind.Interface)));
            return items;
        }

        // Check if we're in a modifier position
        if (this.isModifierPosition(textBeforeCursor)) {
            items.push(...this.modifiers);
            return items;
        }

        // Default: provide all completions
        items.push(...this.keywords);
        items.push(...this.types);
        items.push(...this.modifiers);
        items.push(...this.builtins);

        // Add document-specific completions
        items.push(...documentSymbols.classes.map(c => {
            const item = new vscode.CompletionItem(c, vscode.CompletionItemKind.Class);
            item.detail = 'Class';
            return item;
        }));

        items.push(...documentSymbols.functions.map(f => {
            const item = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Function);
            item.detail = `Function: ${f.returnType}`;
            item.documentation = new vscode.MarkdownString(`Parameters: ${f.params.join(', ')}`);
            return item;
        }));

        items.push(...documentSymbols.variables.map(v => {
            const item = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.Variable);
            item.detail = `Variable: ${v.type}`;
            return item;
        }));

        items.push(...documentSymbols.fields.map(f => {
            const item = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Field);
            item.detail = `Field: ${f.type}`;
            return item;
        }));

        return items;
    }

    private getMemberCompletions(
        objectName: string,
        symbols: DocumentSymbols,
        document: vscode.TextDocument
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        if (objectName === 'this') {
            const currentClassName = this.findCurrentClassName(document, undefined);
            if (currentClassName) {
                const classFields = this.findClassFields(currentClassName, document);
                const classMethods = this.findClassMethods(currentClassName, document);
                for (const field of classFields) {
                    const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
                    item.detail = `Field: ${field.type}`;
                    items.push(item);
                }
                for (const method of classMethods) {
                    const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
                    item.detail = `Method: ${method.returnType}`;
                    item.documentation = new vscode.MarkdownString(`Parameters: ${method.params.join(', ')}`);
                    items.push(item);
                }
            }
            return items;
        }

        // System class members
        if (objectName === 'System') {
            const systemMethods = [
                { name: 'printf', detail: 'Method: void', doc: 'Print formatted output' },
                { name: 'println', detail: 'Method: void', doc: 'Print line' },
                { name: 'exit', detail: 'Method: void', doc: 'Exit program with code' },
                { name: 'currentTimeMillis', detail: 'Method: long', doc: 'Current time in milliseconds' },
            ];
            for (const m of systemMethods) {
                const item = new vscode.CompletionItem(m.name, vscode.CompletionItemKind.Method);
                item.detail = m.detail;
                item.documentation = new vscode.MarkdownString(m.doc);
                items.push(item);
            }
            return items;
        }

        // Array class members
        if (objectName === 'Array') {
            const arrayMethods = [
                { name: 'size', detail: 'Method: int', doc: 'Returns the number of elements' },
                { name: 'add', detail: 'Method: void', doc: 'Adds an element to the end' },
                { name: 'push', detail: 'Method: void', doc: 'Adds an element to the end (alias for add)' },
                { name: 'get', detail: 'Method: T', doc: 'Gets element at index' },
                { name: 'set', detail: 'Method: void', doc: 'Sets element at index' },
                { name: 'remove', detail: 'Method: void', doc: 'Removes element at index' },
                { name: 'clear', detail: 'Method: void', doc: 'Removes all elements' },
                { name: 'contains', detail: 'Method: bool', doc: 'Checks if element exists' },
            ];
            for (const m of arrayMethods) {
                const item = new vscode.CompletionItem(m.name, vscode.CompletionItemKind.Method);
                item.detail = m.detail;
                item.documentation = new vscode.MarkdownString(m.doc);
                items.push(item);
            }
            return items;
        }

        // Map class members
        if (objectName === 'Map') {
            const mapMethods = [
                { name: 'size', detail: 'Method: int', doc: 'Returns the number of entries' },
                { name: 'put', detail: 'Method: void', doc: 'Adds a key-value pair' },
                { name: 'get', detail: 'Method: V', doc: 'Gets value by key' },
                { name: 'remove', detail: 'Method: void', doc: 'Removes entry by key' },
                { name: 'containsKey', detail: 'Method: bool', doc: 'Checks if key exists' },
                { name: 'clear', detail: 'Method: void', doc: 'Removes all entries' },
            ];
            for (const m of mapMethods) {
                const item = new vscode.CompletionItem(m.name, vscode.CompletionItemKind.Method);
                item.detail = m.detail;
                item.documentation = new vscode.MarkdownString(m.doc);
                items.push(item);
            }
            return items;
        }

        const documentSymbols = this.extractDocumentSymbols(document);
        if (documentSymbols.classes.includes(objectName)) {
            const classMethods = this.findClassMethods(objectName, document);
            const classFields = this.findClassFields(objectName, document);
            for (const field of classFields) {
                const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
                item.detail = `Static Field: ${field.type}`;
                items.push(item);
            }
            for (const method of classMethods) {
                const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
                item.detail = `Method: ${method.returnType}`;
                item.documentation = new vscode.MarkdownString(`Parameters: ${method.params.join(', ')}`);
                items.push(item);
            }
            if (objectName === 'String') {
                const stringStaticMethods = [
                    { name: 'intToString', detail: 'Static Method: String', doc: 'Convert int to String' },
                ];
                for (const m of stringStaticMethods) {
                    const item = new vscode.CompletionItem(m.name, vscode.CompletionItemKind.Method);
                    item.detail = m.detail;
                    item.documentation = new vscode.MarkdownString(m.doc);
                    items.push(item);
                }
            }
            return items;
        }

        // Find the type of the object
        const varType = this.findVariableType(objectName, document);
        if (!varType) return items;

        // Find fields and methods of the class
        const classFields = this.findClassFields(varType, document);
        const classMethods = this.findClassMethods(varType, document);

        for (const field of classFields) {
            const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
            item.detail = `Field: ${field.type}`;
            items.push(item);
        }

        for (const method of classMethods) {
            const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
            item.detail = `Method: ${method.returnType}`;
            item.documentation = new vscode.MarkdownString(`Parameters: ${method.params.join(', ')}`);
            items.push(item);
        }

        // Add common String methods if the type is String
        if (varType === 'String') {
            const stringMethods = [
                { name: 'length', detail: 'Method: int', doc: 'Returns the length of the string' },
                { name: 'toUpperCase', detail: 'Method: String', doc: 'Converts to uppercase' },
                { name: 'toLowerCase', detail: 'Method: String', doc: 'Converts to lowercase' },
                { name: 'equals', detail: 'Method: bool', doc: 'Compares two strings' },
                { name: 'trim', detail: 'Method: String', doc: 'Removes whitespace' },
                { name: 'substring', detail: 'Method: String', doc: 'Extracts substring' },
                { name: 'indexOf', detail: 'Method: int', doc: 'Finds index of substring' },
                { name: 'replace', detail: 'Method: String', doc: 'Replaces substring' },
                { name: 'startsWith', detail: 'Method: bool', doc: 'Checks if starts with prefix' },
                { name: 'endsWith', detail: 'Method: bool', doc: 'Checks if ends with suffix' },
                { name: 'contains', detail: 'Method: bool', doc: 'Checks if contains substring' },
                { name: 'split', detail: 'Method: Array<String>', doc: 'Splits by delimiter' },
                { name: 'charAt', detail: 'Method: char', doc: 'Gets character at index' },
                { name: 'isEmpty', detail: 'Method: bool', doc: 'Checks if string is empty' },
                { name: 'join', detail: 'Static Method: String', doc: 'Joins array elements with separator' },
                { name: 'intToString', detail: 'Static Method: String', doc: 'Converts int to String' },
                { name: 'longToString', detail: 'Static Method: String', doc: 'Converts long to String' },
                { name: 'doubleToString', detail: 'Static Method: String', doc: 'Converts double to String' },
            ];
            for (const m of stringMethods) {
                const item = new vscode.CompletionItem(m.name, vscode.CompletionItemKind.Method);
                item.detail = m.detail;
                item.documentation = new vscode.MarkdownString(m.doc);
                items.push(item);
            }
        }

        return items;
    }

    private isTypePosition(text: string): boolean {
        const typePatterns = [
            /^\s*(?:public|private|static|virtual|override|abstract|final|extern)?\s*$/,
            /^\s*(?:public|private|static)?\s+$/,
            /:\s*$/,
            /new\s+$/,
            /extends\s+$/,
            /implements\s+$/,
            /instanceof\s+$/,
            /as\s+$/,
        ];
        return typePatterns.some(p => p.test(text));
    }

    private isModifierPosition(text: string): boolean {
        const modifierPatterns = [
            /^\s*$/,
            /^\s*(?:public|private|static|virtual|override|abstract|final|reflectable)\s+$/,
        ];
        return modifierPatterns.some(p => p.test(text));
    }

    private findVariableType(name: string, document: vscode.TextDocument): string | null {
        const text = document.getText();
        const regex = new RegExp(`(?:^|;)\\s*(?:[\\w\\[\\]<>]+)\\s+${name}\\s*(?:=|;|\\)`, 'm');
        const match = text.match(regex);
        if (match) {
            const line = match[0];
            const typeMatch = line.match(/(\w[\w\[\]<>]*)\s+\w+\s*[=;]/);
            if (typeMatch) return typeMatch[1];
        }
        return null;
    }

    private findCurrentClassName(document: vscode.TextDocument, position?: vscode.Position): string | null {
        const text = document.getText();
        const lines = text.split('\n');
        let lastClassName: string | null = null;
        let braceDepth = 0;
        let classStartDepth = -1;
        const maxLine = position ? position.line + 1 : lines.length;
        for (let i = 0; i < Math.min(lines.length, maxLine); i++) {
            const line = lines[i];
            const classMatch = line.match(/^\s*(?:public\s+)?class\s+(\w+)/);
            if (classMatch) {
                lastClassName = classMatch[1];
                classStartDepth = -1;
            }
            for (const char of line) {
                if (char === '{') {
                    braceDepth++;
                    if (classStartDepth === -1 && lastClassName) {
                        classStartDepth = braceDepth;
                    }
                }
                else if (char === '}') {
                    if (braceDepth === classStartDepth) {
                        lastClassName = null;
                        classStartDepth = -1;
                    }
                    braceDepth--;
                }
            }
        }
        return lastClassName;
    }

    private findClassFields(className: string, document: vscode.TextDocument): { name: string; type: string }[] {
        const fields: { name: string; type: string }[] = [];
        const text = document.getText();
        const classRegex = new RegExp(`class\\s+${className}\\s*\\{`, 'g');
        let match;
        while ((match = classRegex.exec(text)) !== null) {
            const startIdx = match.index;
            const endIdx = this.findMatchingBrace(text, startIdx + match[0].length - 1);
            if (endIdx > 0) {
                const classBody = text.substring(startIdx + match[0].length, endIdx);
                const fieldRegex = /(?:public|private|static|final)?\s*([\w\[\]<>]+)\s+(\w+)\s*;/g;
                let fieldMatch;
                while ((fieldMatch = fieldRegex.exec(classBody)) !== null) {
                    fields.push({ name: fieldMatch[2], type: fieldMatch[1] });
                }
            }
        }
        return fields;
    }

    private findClassMethods(className: string, document: vscode.TextDocument): { name: string; returnType: string; params: string[] }[] {
        const methods: { name: string; returnType: string; params: string[] }[] = [];
        const text = document.getText();
        const classRegex = new RegExp(`class\\s+${className}\\s*\\{`, 'g');
        let match;
        while ((match = classRegex.exec(text)) !== null) {
            const startIdx = match.index;
            const endIdx = this.findMatchingBrace(text, startIdx + match[0].length - 1);
            if (endIdx > 0) {
                const classBody = text.substring(startIdx + match[0].length, endIdx);
                const methodRegex = /(?:public|private|static|virtual|override|abstract|final)?\s*([\w\[\]<>]+)\s+(\w+)\s*\(([^)]*)\)/g;
                let methodMatch;
                while ((methodMatch = methodRegex.exec(classBody)) !== null) {
                    methods.push({
                        name: methodMatch[2],
                        returnType: methodMatch[1],
                        params: methodMatch[3].split(',').map(p => p.trim()).filter(p => p)
                    });
                }
            }
        }
        return methods;
    }

    private findMatchingBrace(text: string, openBraceIndex: number): number {
        let depth = 1;
        let inString = false;
        let stringChar = '';
        for (let i = openBraceIndex + 1; i < text.length; i++) {
            const char = text[i];
            const prevChar = i > 0 ? text[i - 1] : '';
            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar && prevChar !== '\\') {
                inString = false;
            } else if (!inString) {
                if (char === '{') depth++;
                else if (char === '}') {
                    depth--;
                    if (depth === 0) return i;
                }
            }
        }
        return -1;
    }

    private extractDocumentSymbols(document: vscode.TextDocument): DocumentSymbols {
        const symbols: DocumentSymbols = {
            classes: [],
            interfaces: [],
            functions: [],
            variables: [],
            fields: []
        };

        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Classes
            const classMatch = trimmed.match(/^\s*(?:public\s+)?class\s+(\w+)/);
            if (classMatch) symbols.classes.push(classMatch[1]);

            // Interfaces
            const interfaceMatch = trimmed.match(/^\s*interface\s+(\w+)/);
            if (interfaceMatch) symbols.interfaces.push(interfaceMatch[1]);

            // Functions
            const funcMatch = trimmed.match(/^\s*(?:public|private|static|virtual|override|abstract|final|extern)?\s*([\w\[\]<>]+)\s+(\w+)\s*\(([^)]*)\)/);
            if (funcMatch && !this.isKeyword(funcMatch[2])) {
                symbols.functions.push({
                    name: funcMatch[2],
                    returnType: funcMatch[1],
                    params: funcMatch[3].split(',').map(p => p.trim()).filter(p => p)
                });
            }

            // Variables
            const varMatch = trimmed.match(/^\s*([\w\[\]<>]+)\s+(\w+)\s*=/);
            if (varMatch && !this.isTypeKeyword(varMatch[1]) && !this.isKeyword(varMatch[2])) {
                symbols.variables.push({ name: varMatch[2], type: varMatch[1] });
            }

            // Fields
            const fieldMatch = trimmed.match(/^\s*(?:public|private|static|final)\s+([\w\[\]<>]+)\s+(\w+)\s*;/);
            if (fieldMatch) {
                symbols.fields.push({ name: fieldMatch[2], type: fieldMatch[1] });
            }
        }

        return symbols;
    }

    private createKeywordCompletions(): vscode.CompletionItem[] {
        const keywords = [
            'class', 'interface', 'enum', 'extends', 'implements', 'abstract', 'virtual',
            'override', 'final', 'static', 'public', 'private', 'reflectable',
            'new', 'delete', 'null', 'true', 'false', 'if', 'else', 'for',
            'while', 'return', 'break', 'continue', 'try', 'catch', 'throw',
            'import', 'package', 'extern', 'sizeof', 'typeid', 'this', 'super',
            'instanceof', 'as', 'finally', 'match', 'switch', 'case', 'default', 'in'
        ];
        return keywords.map(kw => {
            const item = new vscode.CompletionItem(kw, vscode.CompletionItemKind.Keyword);
            item.detail = 'Keyword';
            return item;
        });
    }

    private createTypeCompletions(): vscode.CompletionItem[] {
        const types = [
            'void', 'bool', 'byte', 'char', 'short', 'int', 'long',
            'float', 'double', 'String'
        ];
        return types.map(t => {
            const item = new vscode.CompletionItem(t, vscode.CompletionItemKind.TypeParameter);
            item.detail = 'Primitive Type';
            return item;
        });
    }

    private createModifierCompletions(): vscode.CompletionItem[] {
        const modifiers = [
            'public', 'private', 'static', 'virtual', 'override',
            'abstract', 'final', 'reflectable', 'extern'
        ];
        return modifiers.map(m => {
            const item = new vscode.CompletionItem(m, vscode.CompletionItemKind.Keyword);
            item.detail = 'Modifier';
            return item;
        });
    }

    private createBuiltinCompletions(): vscode.CompletionItem[] {
        const builtins = [
            { name: 'System', detail: 'Class', doc: 'System utilities (printf, println, exit, etc.)' },
            { name: 'String', detail: 'Class', doc: 'String type with methods' },
            { name: 'Array', detail: 'Class', doc: 'Generic array type' },
            { name: 'Map', detail: 'Class', doc: 'Generic map type' },
            { name: 'StringBuilder', detail: 'Class', doc: 'Mutable string builder' },
            { name: 'File', detail: 'Class', doc: 'File I/O operations' },
            { name: 'Character', detail: 'Class', doc: 'Character utilities' },
        ];
        return builtins.map(b => {
            const item = new vscode.CompletionItem(b.name, vscode.CompletionItemKind.Class);
            item.detail = b.detail;
            item.documentation = new vscode.MarkdownString(b.doc);
            return item;
        });
    }

    private isKeyword(name: string): boolean {
        const keywords = new Set([
            'class', 'interface', 'enum', 'extends', 'implements', 'abstract', 'virtual',
            'override', 'final', 'static', 'public', 'private', 'reflectable',
            'new', 'delete', 'null', 'true', 'false', 'if', 'else', 'for',
            'while', 'return', 'break', 'continue', 'try', 'catch', 'throw',
            'import', 'package', 'extern', 'sizeof', 'typeid', 'this', 'super',
            'instanceof', 'as', 'finally', 'match', 'switch', 'case', 'default', 'in',
            'void', 'bool', 'byte', 'char',
            'short', 'int', 'long', 'float', 'double'
        ]);
        return keywords.has(name);
    }

    private isTypeKeyword(name: string): boolean {
        const types = new Set([
            'void', 'bool', 'byte', 'char', 'short', 'int', 'long',
            'float', 'double', 'String'
        ]);
        return types.has(name);
    }
}

interface DocumentSymbols {
    classes: string[];
    interfaces: string[];
    functions: { name: string; returnType: string; params: string[] }[];
    variables: { name: string; type: string }[];
    fields: { name: string; type: string }[];
}
