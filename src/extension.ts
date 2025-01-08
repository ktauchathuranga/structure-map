import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

    console.log('Your extension "structure-map" is now active!');

    let disposable = vscode.commands.registerCommand('structure-map.createFolderStructure', () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

        if (!workspaceFolder) {
            vscode.window.showErrorMessage("No workspace folder found.");
            return;
        }

        // Function to recursively get folder structure
        const getFolderStructure = (dirPath: string, indent: string = ''): string => {
            let structure = '';
            const filesAndFolders = fs.readdirSync(dirPath);

            filesAndFolders.forEach((file, index) => {
                const fullPath = path.join(dirPath, file);
                const stats = fs.statSync(fullPath);

                // Skip hidden files/folders (those starting with a dot)
                if (file.startsWith('.')) {
                    return;
                }

                const isLastItem = index === filesAndFolders.length - 1;

                if (stats.isDirectory()) {
                    structure += `${indent}├── ${file}/\n`; // Folder without bold
                    structure += getFolderStructure(fullPath, indent + (isLastItem ? "    " : "│   ")); // Recursion with indent
                } else {
                    structure += `${indent}${isLastItem ? "└──" : "├──"} ${file}\n`; // File
                }
            });

            return structure;
        };

        // Get the root folder name
        const rootFolder = path.basename(workspaceFolder);

        // Start the folder structure with the root folder
        const folderStructure = `${rootFolder}/\n` + getFolderStructure(workspaceFolder);

        const outputFilePath = path.join(workspaceFolder, 'folder_structure.md');

        // Generate the markdown content
        const markdownContent = `#### **Folder Structure**\n\n\`\`\`plaintext\n${folderStructure}\`\`\`\n---`;

        // Write the markdown content to a file
        fs.writeFileSync(outputFilePath, markdownContent);

        vscode.window.showInformationMessage(`Folder structure saved to ${outputFilePath}`);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
