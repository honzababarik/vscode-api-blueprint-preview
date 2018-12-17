const vscode = require('vscode');
const aglio = require('aglio');

function showError(msg) {
    vscode.window.showErrorMessage(msg);
};

function showInfo(msg) {
    vscode.window.showInformationMessage(msg);
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
    const extension = file[1];
    if (extension !== 'apib') {
        showError('Unsupported file - make sure you use a file with extension .apib');
        return null;
    }
    return fileName;
}

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
    const fileName = getDocumentFileName(document);
    if (!fileName) {
        return;
    }

    const content = document.getText();
    const options = {
        themeVariables: 'default'
    };
    aglio.render(content, options, function (err, html, warnings) {
        if (err) {
            showError(err);
            return;
        }

        const panel = getPanel(document.fileName, fileName);
        panel.webview.html = html;
    });
}

function activate(context) {

    let previewFileCommand = vscode.commands.registerTextEditorCommand('extension.previewFile', function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        previewFile(editor.document);
    });

    let previewFileLiveCommand = vscode.commands.registerTextEditorCommand('extension.previewFileLive', function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        previewFile(editor.document);
        vscode.workspace.onDidSaveTextDocument(function (document) {
            if (global.apiblueprint.file === document.fileName) {
                previewFile(document)
            }
        });
    });

    context.subscriptions.push(previewFileCommand);
    context.subscriptions.push(previewFileLiveCommand);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {

}
exports.deactivate = deactivate;