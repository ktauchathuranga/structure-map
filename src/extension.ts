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

        // Function to recursively get folder structure, prioritizing folders first
        const getFolderStructure = (dirPath: string, indent: string = ''): string => {
            let structure = '';

            // First get directories
            const filesAndFolders = fs.readdirSync(dirPath);
            const directories = filesAndFolders.filter(file => fs.statSync(path.join(dirPath, file)).isDirectory() && !file.startsWith('.'));
            const files = filesAndFolders.filter(file => fs.statSync(path.join(dirPath, file)).isFile() && !file.startsWith('.'));

            // Add directories first
            directories.forEach((folder, index) => {
                structure += `${indent}├── ${folder}/\n`;
                structure += getFolderStructure(path.join(dirPath, folder), indent + "│   "); // Recursion with indent for subfolders
            });

            // Then add files
            files.forEach((file, index) => {
                structure += `${indent}${index === files.length - 1 ? "└──" : "├──"} ${file}\n`; // File with proper symbol
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
