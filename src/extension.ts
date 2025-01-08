import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('structure-map.createFolderStructure', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            vscode.window.showErrorMessage("No workspace folder is open.");
            return;
        }

        const rootFolderPath = workspaceFolders[0].uri.fsPath;
        const rootFolderName = path.basename(rootFolderPath);

        // Generate folder structure
        const { folderStructure, stats, ignoredFiles } = generateFolderStructure(rootFolderPath, rootFolderName);

        // Save the structure and summary to a file
        const fileName = path.join(rootFolderPath, 'folder-structure.md');
        const summary = generateSummary(stats, rootFolderName, ignoredFiles);
        const content = `${folderStructure}\n\n${summary}`;

        fs.writeFileSync(fileName, content, 'utf8');
        vscode.window.showInformationMessage(`Folder structure saved to ${fileName}`);
    });

    context.subscriptions.push(disposable);
}

function generateFolderStructure(dir: string, rootName: string): { folderStructure: string; stats: any; ignoredFiles: string[] } {
    let folderStructure = `### Project Structure\n\n\`\`\`plaintext\n${rootName}\n`;
    const stats = {
        totalFolders: 0,
        totalFiles: 0,
        fileTypes: new Map<string, number>(),
        largestFile: { name: '', size: 0 },
        smallestFile: { name: '', size: Number.MAX_SAFE_INTEGER },
        totalSize: 0,
    };

    const ignoredFiles: string[] = [];

    // Parse .gitignore if available
    const gitignorePath = path.join(dir, '.gitignore');
    const ignoredPatterns = fs.existsSync(gitignorePath)
        ? fs.readFileSync(gitignorePath, 'utf8').split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'))
        : [];

    const isIgnored = (filePath: string) => {
        return ignoredPatterns.some(pattern => {
            const relativePattern = path.join(dir, pattern).replace(/\\/g, '/');
            const relativeFilePath = filePath.replace(/\\/g, '/');
            return relativeFilePath.startsWith(relativePattern);
        });
    };

    function walk(directory: string, depth: number, isLastChild: boolean[]): string[] {
        const items = fs.readdirSync(directory).filter(item => !item.startsWith('.'));
        let lines: string[] = [];
        let folders: string[] = [];
        let files: string[] = [];

        items.forEach(item => {
            const itemPath = path.join(directory, item);
            const statsObj = fs.statSync(itemPath);

            if (isIgnored(itemPath)) {
                const relativePath = path.relative(dir, itemPath).replace(/\\/g, '/');
                ignoredFiles.push(relativePath);
                return;
            }

            if (statsObj.isDirectory()) {
                stats.totalFolders++;
                folders.push(item);
            } else if (statsObj.isFile()) {
                stats.totalFiles++;
                const ext = path.extname(item).toLowerCase();
                stats.fileTypes.set(ext, (stats.fileTypes.get(ext) || 0) + 1);

                if (statsObj.size > stats.largestFile.size) {
                    stats.largestFile = { name: item, size: statsObj.size };
                }
                if (statsObj.size < stats.smallestFile.size) {
                    stats.smallestFile = { name: item, size: statsObj.size };
                }

                stats.totalSize += statsObj.size;

                const fileSize = formatFileSize(statsObj.size);
                files.push(`${item} [${fileSize}]`);
            }
        });

        folders.sort();
        files.sort();

        const allItems = [...folders, ...files];
        allItems.forEach((item, index) => {
            const isLast = index === allItems.length - 1;
            const itemPath = path.join(directory, item);

            if (folders.includes(item)) {
                const branch = getBranch(isLast, isLastChild);
                lines.push(`${branch}${item}/`);
                lines.push(...walk(itemPath, depth + 1, [...isLastChild, isLast]));
            } else {
                const branch = getBranch(isLast, isLastChild);
                lines.push(`${branch}${item}`);
            }
        });

        return lines;
    }

    function getBranch(isLast: boolean, isLastChild: boolean[]): string {
        return isLastChild
            .map(isLastLevel => (isLastLevel ? '    ' : '│   '))
            .join('') + (isLast ? '└── ' : '├── ');
    }

    folderStructure += walk(dir, 0, []).join('\n');
    folderStructure += '\n```';

    return { folderStructure, stats, ignoredFiles };
}
function generateSummary(stats: any, rootFolderName: string, ignoredFiles: string[]): string {
    const { totalFolders, totalFiles, fileTypes, largestFile, smallestFile, totalSize } = stats;

    // Make sure fileTypes is treated as Map<string, number>
    const fileTypesSummary = Array.from(fileTypes.entries() as IterableIterator<[string, number]>)
        .map(([type, count]) => `  - ${type || 'No Extension'} Files: ${count}`)
        .join('\n');

    return `
### Summary

\`\`\`plaintext
Root Folder: ${rootFolderName}
Total Folders: ${totalFolders}
Total Files: ${totalFiles}
File Types:
${fileTypesSummary}
Largest File: ${largestFile.name} [${formatFileSize(largestFile.size)}]
Smallest File: ${smallestFile.name} [${formatFileSize(smallestFile.size)}]
Total Project Size: ${formatFileSize(totalSize)}
Ignored Files and Folders:
  - ${ignoredFiles.length > 0 ? ignoredFiles.join('\n  - ') : 'None'}
\`\`\`
`;
}

// Function to format file size in a suitable unit (bytes, KB, MB)
function formatFileSize(size: number): string {
    if (size < 1024) {
        return `${size} bytes`;
    } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
    } else {
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }
}

export function deactivate() {}
