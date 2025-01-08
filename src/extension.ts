import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Function to read the contents of ignore files
const getIgnoredFiles = (dirPath: string): string[] => {
    const ignoreFiles: string[] = [];
    const ignorePatterns: string[] = [];

    // List of possible ignore files
    const ignoreFileNames = ['.gitignore', '.npmignore', '.dockerignore'];

    // Check for the existence of each ignore file and read its content
    ignoreFileNames.forEach((fileName) => {
        const ignoreFilePath = path.join(dirPath, fileName);
        if (fs.existsSync(ignoreFilePath)) {
            const fileContent = fs.readFileSync(ignoreFilePath, 'utf-8');
            // Parse each line and add to ignore patterns
            ignorePatterns.push(...fileContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#')));
        }
    });

    // Normalize ignore patterns (e.g., strip leading/trailing spaces, ignore empty lines)
    return ignorePatterns;
};

// Function to check if a file should be ignored
const shouldIgnore = (filePath: string, ignorePatterns: string[]): boolean => {
    return ignorePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.'));
        return regex.test(filePath);
    });
};

// Main function to get the folder structure and filter ignored files
export function activate(context: vscode.ExtensionContext) {

    console.log('Your extension "structure-map" is now active!');

    let disposable = vscode.commands.registerCommand('structure-map.createFolderStructure', () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

        if (!workspaceFolder) {
            vscode.window.showErrorMessage("No workspace folder found.");
            return;
        }

        // Get ignored files patterns from .gitignore, .npmignore, etc.
        const ignorePatterns = getIgnoredFiles(workspaceFolder);

        // Function to recursively get folder structure and file sizes
        const getFolderStructure = (dirPath: string, indent: string = ''): string => {
            let structure = '';
            const filesAndFolders = fs.readdirSync(dirPath);

            // Separate folders and files, excluding hidden folders (those starting with '.')
            const directories = filesAndFolders.filter(file => {
                const fullPath = path.join(dirPath, file);
                return fs.statSync(fullPath).isDirectory() && !file.startsWith('.');
            });

            const files = filesAndFolders.filter(file => {
                const fullPath = path.join(dirPath, file);
                return fs.statSync(fullPath).isFile() && !file.startsWith('.');
            });

            // First process folders
            directories.forEach((folder) => {
                const folderPath = path.join(dirPath, folder);
                if (!shouldIgnore(folderPath, ignorePatterns)) {
                    structure += `${indent}├── ${folder}/\n`; // Folder
                    structure += getFolderStructure(folderPath, indent + "│   "); // Recursion with indent
                }
            });

            // Then process files
            files.forEach((file, index) => {
                const filePath = path.join(dirPath, file);
                if (!shouldIgnore(filePath, ignorePatterns)) {
                    const stats = fs.statSync(filePath);
                    // Get file size in KB
                    const fileSizeInKB = (stats.size / 1024).toFixed(2);
                    structure += `${indent}${files.indexOf(file) === files.length - 1 ? "└──" : "├──"} ${file} [${fileSizeInKB} KB]\n`; // File with size
                }
            });

            return structure;
        };

        // Get the root folder name
        const rootFolder = path.basename(workspaceFolder);

        // Start the folder structure with the root folder
        const folderStructure = `${rootFolder}/\n` + getFolderStructure(workspaceFolder, '');

        const outputFilePath = path.join(workspaceFolder, 'folder_structure.md');

        // Generate the markdown content
        const markdownContent = `#### Folder Structure\n\n\`\`\`plaintext\n${folderStructure}\`\`\`\n---`;

        // Write the markdown content to a file
        fs.writeFileSync(outputFilePath, markdownContent);

        vscode.window.showInformationMessage(`Folder structure saved to ${outputFilePath}`);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
