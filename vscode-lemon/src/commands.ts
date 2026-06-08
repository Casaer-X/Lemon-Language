import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

export async function runLemonProgram(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'lemon') {
        vscode.window.showErrorMessage('No Lemon file is currently open');
        return;
    }

    const filePath = editor.document.fileName;
    const config = vscode.workspace.getConfiguration('lemon');
    const lemoncPath = config.get<string>('languageServer.path', '');
    const lemonc = lemoncPath || 'lemonc';

    // Save the file first
    await editor.document.save();

    const terminal = vscode.window.createTerminal('Lemon Run');
    terminal.show();

    // Compile and run (auto-detect target from annotations)
    const outputPath = filePath.replace(/\.lm$/, '.exe');
    terminal.sendText(`${quoteForShell(lemonc)} ${quoteForShell(filePath)} --target exe -o ${quoteForShell(outputPath)}`);
    terminal.sendText(quoteForShell(outputPath));
}

export async function compileLemonProgram(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'lemon') {
        vscode.window.showErrorMessage('No Lemon file is currently open');
        return;
    }

    const filePath = editor.document.fileName;
    const config = vscode.workspace.getConfiguration('lemon');
    const lemoncPath = config.get<string>('languageServer.path', '');
    const lemonc = lemoncPath || 'lemonc';

    // Save the file first
    await editor.document.save();

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Compiling Lemon program...',
        cancellable: false
    }, async (progress) => {
        return new Promise<void>((resolve, reject) => {
            const outputPath = filePath.replace(/\.lm$/, '.exe');
            const process = cp.spawn(lemonc, [filePath, '--target', 'exe', '-o', outputPath], {
                windowsHide: true
            });

            let stderr = '';
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    vscode.window.showInformationMessage(`Compilation successful: ${path.basename(outputPath)}`);
                    resolve();
                } else {
                    vscode.window.showErrorMessage(`Compilation failed:\n${stderr}`);
                    reject(new Error(stderr));
                }
            });
        });
    });
}

export async function compileToBytecode(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'lemon') {
        vscode.window.showErrorMessage('No Lemon file is currently open');
        return;
    }

    const filePath = editor.document.fileName;
    const config = vscode.workspace.getConfiguration('lemon');
    const lemoncPath = config.get<string>('languageServer.path', '');
    const lemonc = lemoncPath || 'lemonc';

    // Save the file first
    await editor.document.save();

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Compiling to bytecode...',
        cancellable: false
    }, async (progress) => {
        return new Promise<void>((resolve, reject) => {
            const outputPath = filePath.replace(/\.lm$/, '.lmb');
            const process = cp.spawn(lemonc, [filePath, '--target', 'bytecode', '-o', outputPath], {
                windowsHide: true
            });

            let stderr = '';
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    vscode.window.showInformationMessage(`Bytecode compilation successful: ${path.basename(outputPath)}`);
                    resolve();
                } else {
                    vscode.window.showErrorMessage(`Bytecode compilation failed:\n${stderr}`);
                    reject(new Error(stderr));
                }
            });
        });
    });
}

export async function buildLemonProject(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder is open');
        return;
    }

    const projectDir = workspaceFolders[0].uri.fsPath;
    const config = vscode.workspace.getConfiguration('lemon');
    const lemoncPath = config.get<string>('languageServer.path', '');
    const lemonc = lemoncPath || 'lemonc';

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Building Lemon project...',
        cancellable: false
    }, async (progress) => {
        return new Promise<void>((resolve, reject) => {
            const process = cp.spawn(lemonc, ['--build', projectDir], {
                windowsHide: true
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    vscode.window.showInformationMessage('Project build successful!');
                    // Show build output in output channel
                    const outputChannel = vscode.window.createOutputChannel('Lemon Build');
                    outputChannel.appendLine(stdout);
                    outputChannel.show();
                    resolve();
                } else {
                    vscode.window.showErrorMessage(`Project build failed:\n${stderr}`);
                    const outputChannel = vscode.window.createOutputChannel('Lemon Build');
                    outputChannel.appendLine(stderr);
                    outputChannel.show();
                    reject(new Error(stderr));
                }
            });
        });
    });
}

export async function compileWithAnnotation(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'lemon') {
        vscode.window.showErrorMessage('No Lemon file is currently open');
        return;
    }

    const filePath = editor.document.fileName;
    const config = vscode.workspace.getConfiguration('lemon');
    const lemoncPath = config.get<string>('languageServer.path', '');
    const lemonc = lemoncPath || 'lemonc';

    // Save the file first
    await editor.document.save();

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Compiling with annotation auto-detect...',
        cancellable: false
    }, async (progress) => {
        return new Promise<void>((resolve, reject) => {
            // 不指定 --target，让编译器自动从注解检测
            const process = cp.spawn(lemonc, [filePath], {
                windowsHide: true
            });

            let stderr = '';
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    vscode.window.showInformationMessage('Annotation-based compilation successful!');
                    resolve();
                } else {
                    vscode.window.showErrorMessage(`Compilation failed:\n${stderr}`);
                    reject(new Error(stderr));
                }
            });
        });
    });
}

function quoteForShell(value: string): string {
    return `"${value.replace(/"/g, '\\"')}"`;
}
