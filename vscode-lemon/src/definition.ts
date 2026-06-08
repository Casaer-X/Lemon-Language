import * as vscode from 'vscode';

export class LemonDefinitionProvider implements vscode.DefinitionProvider {
    public provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.Location | vscode.Location[] | undefined {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) return undefined;

        const word = document.getText(wordRange);
        const text = document.getText();
        const lines = text.split('\n');

        // Search for definition of the word
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            // Skip comments
            if (trimmed.startsWith('//')) continue;

            // Check class definition
            const classMatch = line.match(new RegExp(`\\bclass\\s+${word}\\b`));
            if (classMatch) {
                const col = line.indexOf(word);
                return new vscode.Location(
                    document.uri,
                    new vscode.Range(i, col, i, col + word.length)
                );
            }

            // Check interface definition
            const interfaceMatch = line.match(new RegExp(`\\binterface\\s+${word}\\b`));
            if (interfaceMatch) {
                const col = line.indexOf(word);
                return new vscode.Location(
                    document.uri,
                    new vscode.Range(i, col, i, col + word.length)
                );
            }

            // Check function/method definition
            const funcMatch = line.match(new RegExp(`\\b(?:public|private|static|virtual|override|abstract|final|extern)?\\s*(?:[\\w\\[\\]<>]+)\\s+${word}\\s*\\(`));
            if (funcMatch) {
                const col = line.indexOf(word);
                return new vscode.Location(
                    document.uri,
                    new vscode.Range(i, col, i, col + word.length)
                );
            }

            // Check variable/field definition
            const varMatch = line.match(new RegExp(`\\b(?:public|private|static|final)?\\s*(?:[\\w\\[\\]<>]+)\\s+${word}\\s*(?:=|;)`));
            if (varMatch) {
                const col = line.indexOf(word);
                return new vscode.Location(
                    document.uri,
                    new vscode.Range(i, col, i, col + word.length)
                );
            }
        }

        return undefined;
    }
}
