const vscode = require('vscode');
const aglio = require('aglio');
const p = require('path');
const fs = require('fs');

function showError(msg) {
    vscode.window.showErrorMessage(msg);
};

function showInfo(msg) {
    vscode.window.showInformationMessage(msg);
};

function getDocumentFileLocation(document) {
    const path = p.dirname(document.fileName);
    if (!path) {
        showError('Could not determine the file path.');
        return null;
    }
    return path;
};

function getDocumentFileName(document) {
    const path = document.fileName.split('/');
    if (path.length === 0) {
        showError('Could not determine the file path.');
        return null;
    }
    const fileName = path[path.length - 1];
    const file = fileName.split('.')
    if (file.length < 2) {
        showError('Unsupported file name.');
        return null;
    }
    const extension = file[file.length - 1];
    if (extension !== 'apib') {
        showError('Unsupported file - make sure you use a file with extension .apib');
        return null;
    }
    return fileName;
};

function replaceFileExtension(filePath, extension) {
    const file = filePath.split('.')
    if (file.length < 2) {
        return `${filePath}.${extension}`;
    }
    file.splice(-1, 1);
    return `${file.join('.')}.${extension}`;
};

function getPanel(file, fileName) {
    if (!global.apiblueprint) {
        global.apiblueprint = {}
    }
    if (!global.apiblueprint.panel) {
        const panel = vscode.window.createWebviewPanel('APIBlueprintPreview', `${fileName} Preview`, {
            viewColumn: vscode.ViewColumn.Two,
            preserveFocus: false
        }, {
            enableScripts: true
        });
        panel.onDidDispose(function () {
            global.apiblueprint.file = null;
            global.apiblueprint.panel = null;
        });
        global.apiblueprint.panel = panel;
    }
    global.apiblueprint.file = file;
    return global.apiblueprint.panel;
};

function previewFile(document) {
    renderFile(document, function (html, fileName) {
        const panel = getPanel(document.fileName, fileName);
        panel.webview.html = html;
    });
};

function renderFile(document, onRender) {
    const fileName = getDocumentFileName(document);
    const fileLocation = getDocumentFileLocation(document);
    if (!fileName && !fileLocation) {
        return;
    }

    const extensionConfig = vscode.workspace.getConfiguration('apiBlueprintViewer')
    const themeTemplate = extensionConfig.get('theme.template')
    const themeVariables = extensionConfig.get('theme.variables')
    const content = document.getText();
    const options = {
        includePath: fileLocation,
        themeTemplate: themeTemplate,
        themeVariables: themeVariables
    };
    aglio.render(content, options, function (err, html, warnings) {
        if (err) {
            showError(err);
        } else {
            onRender(html, fileName);
        }
    });
};

function saveAsHtml(document) {
    renderFile(document, function (html, fileName) {
        const path = p.dirname(document.fileName);
        const uri = vscode.Uri.file(`${path}/${replaceFileExtension(fileName, 'html')}`);
        vscode.window.showSaveDialog({ defaultUri: uri }).then(fileInfos => {
            if (fileInfos) {
                fs.writeFileSync(fileInfos.path, html);
                showInfo(`Preview saved as ${fileInfos.path}`);
            }
        });
    });
};

function activate(context) {

    const previewFileCommand = vscode.commands.registerTextEditorCommand('develite.previewFile', function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            previewFile(editor.document);
        }
    });

    const previewFileLiveCommand = vscode.commands.registerTextEditorCommand('develite.previewFileLive', function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            previewFile(editor.document);
            vscode.workspace.onDidSaveTextDocument(function (document) {
                if (global.apiblueprint.file === document.fileName) {
                    previewFile(document)
                }
            });
        }
    });

    const saveAsHtmlCommand = vscode.commands.registerTextEditorCommand('develite.saveAsHtml', function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            saveAsHtml(editor.document);
        }

    });

    context.subscriptions.push(previewFileCommand);
    context.subscriptions.push(previewFileLiveCommand);
    context.subscriptions.push(saveAsHtmlCommand);
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {

}
exports.deactivate = deactivate;
