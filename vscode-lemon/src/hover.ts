import * as vscode from 'vscode';

export class LemonHoverProvider implements vscode.HoverProvider {
    public provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.Hover | undefined {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) return undefined;

        const word = document.getText(wordRange);
        const text = document.getText();
        const lines = text.split('\n');

        // Check if it's a keyword
        const keywordDoc = this.getKeywordDocumentation(word);
        if (keywordDoc) {
            return new vscode.Hover(new vscode.MarkdownString(keywordDoc));
        }

        // Check if it's a type
        const typeDoc = this.getTypeDocumentation(word);
        if (typeDoc) {
            return new vscode.Hover(new vscode.MarkdownString(typeDoc));
        }

        // Search for definition in document
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (trimmed.startsWith('//')) continue;

            // Class definition
            const classMatch = line.match(new RegExp(`\\bclass\\s+${word}\\b`));
            if (classMatch) {
                const extendsMatch = trimmed.match(/extends\s+(\w+)/);
                const implementsMatch = trimmed.match(/implements\s+([\w,\s]+)/);
                let doc = `**class** \`${word}\`\n\n`;
                if (extendsMatch) doc += `Extends: \`${extendsMatch[1]}\`\n\n`;
                if (implementsMatch) doc += `Implements: \`${implementsMatch[1]}\`\n\n`;
                return new vscode.Hover(new vscode.MarkdownString(doc));
            }

            // Interface definition
            const interfaceMatch = line.match(new RegExp(`\\binterface\\s+${word}\\b`));
            if (interfaceMatch) {
                return new vscode.Hover(new vscode.MarkdownString(`**interface** \`${word}\``));
            }

            // Function/method definition
            const funcMatch = line.match(new RegExp(`\\b(?:public|private|static|virtual|override|abstract|final|extern)?\\s*([\\w\\[\\]<>]+)\\s+${word}\\s*\\(([^)]*)\\)`));
            if (funcMatch) {
                const returnType = funcMatch[1];
                const params = funcMatch[2];
                const modifiers = this.extractModifiers(trimmed);
                let doc = '';
                if (modifiers.length > 0) doc += `**${modifiers.join(' ')}** `;
                doc += `**function** \`${word}(${params}) -> ${returnType}\``;
                return new vscode.Hover(new vscode.MarkdownString(doc));
            }

            // Variable/field definition
            const varMatch = line.match(new RegExp(`\\b(?:public|private|static|final)?\\s*([\\w\\[\\]<>]+)\\s+${word}\\s*(?:=|;)`));
            if (varMatch) {
                const type = varMatch[1];
                const modifiers = this.extractModifiers(trimmed);
                let doc = '';
                if (modifiers.length > 0) doc += `**${modifiers.join(' ')}** `;
                doc += `**${type}** \`${word}\``;
                return new vscode.Hover(new vscode.MarkdownString(doc));
            }
        }

        return undefined;
    }

    private getKeywordDocumentation(word: string): string | undefined {
        const docs: Record<string, string> = {
            'class': 'Defines a new class.\n\n```lemon\npublic class MyClass {\n    // members\n}\n```',
            'interface': 'Defines a new interface.\n\n```lemon\ninterface MyInterface {\n    void method();\n}\n```',
            'extends': 'Specifies the parent class.\n\n```lemon\nclass Child extends Parent {\n}\n```',
            'implements': 'Specifies implemented interfaces.\n\n```lemon\nclass MyClass implements Interface1, Interface2 {\n}\n```',
            'public': 'Access modifier - visible to all.',
            'private': 'Access modifier - visible only within the class.',
            'static': 'Modifier - belongs to the class rather than instances.',
            'virtual': 'Modifier - allows method to be overridden.',
            'override': 'Modifier - overrides a virtual method.',
            'abstract': 'Modifier - class or method has no implementation.',
            'final': 'Modifier - cannot be extended or overridden.',
            'new': 'Creates a new instance.\n\n```lemon\nMyClass obj = new MyClass();\n```',
            'delete': 'Deallocates memory.',
            'this': 'Reference to the current instance.\n\nUse `this.methodName()` to call instance methods and `this.field` to access fields within the class.\n\n```lemon\nthis.name = "Alice";\nthis.greet();\n```',
            'super': 'Reference to the parent class.',
            'instanceof': 'Checks if an object is an instance of a class.',
            'sizeof': 'Returns the size of a type in bytes.',
            'typeid': 'Returns type information.',
            'if': 'Conditional statement.\n\n```lemon\nif (condition) {\n    // code\n}\n```',
            'else': 'Alternative branch for if statement.',
            'for': 'Loop statement.\n\n```lemon\nfor (int i = 0; i < n; i++) {\n    // code\n}\n```',
            'while': 'While loop.\n\n```lemon\nwhile (condition) {\n    // code\n}\n```',
            'return': 'Returns from a function.',
            'break': 'Exits a loop.',
            'continue': 'Skips to next iteration.',
            'try': 'Exception handling block.',
            'catch': 'Exception handler.',
            'throw': 'Throws an exception.',
            'finally': 'Always executes after try/catch.',
            'import': 'Imports a module.',
            'package': 'Declares the package.',
            'extern': 'Declares an external function.',
            'var': 'Type inference keyword - automatically infers the type from the initializer.',
        };
        return docs[word];
    }

    private getTypeDocumentation(word: string): string | undefined {
        const docs: Record<string, string> = {
            'void': 'No return value.',
            'bool': 'Boolean type - `true` or `false`.',
            'byte': '8-bit unsigned integer (0 to 255).',
            'char': '16-bit Unicode character.',
            'short': '16-bit signed integer.',
            'int': '32-bit signed integer.',
            'long': '64-bit signed integer.',
            'float': '32-bit floating point.',
            'double': '64-bit floating point.',
            'String': 'String type - sequence of characters.',
        };
        return docs[word];
    }

    private extractModifiers(line: string): string[] {
        const modifiers: string[] = [];
        const modifierList = ['public', 'private', 'static', 'virtual', 'override', 'abstract', 'final', 'reflectable', 'extern'];
        for (const mod of modifierList) {
            if (line.includes(mod)) modifiers.push(mod);
        }
        return modifiers;
    }
}
