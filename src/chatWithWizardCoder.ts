import * as vscode from "vscode";
import { hideStatusMessage, showTemporaryStatusMessage } from "./utils";
import { ViewProvider } from "./webviews/viewProvider";
import fetch from 'node-fetch';
import * as http from "http"
var request = require('request');
type ApiResponse = {
    results: Array<{ text: string }>;
};

export const chatToWizardCoder = (
    webViewProvider: ViewProvider | undefined
) => {
    return async () => {
        if (!webViewProvider) {
            vscode.window.showErrorMessage("Webview is not available.");
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const selectedText = editor.document.getText(editor.selection);
        const textForQuery = selectedText
            ? `
  \`\`\`
  ${selectedText}
  \`\`\`
  `
            : "";
        const customQuery = await vscode.window.showInputBox({
            prompt: "Enter your custom query",
        });

        if (!customQuery) {
            return;
        }

        const query = `${customQuery} : ${textForQuery}`;
        showTemporaryStatusMessage("Calling WizardCoder API...", undefined, true);
        await webViewProvider.sendMessageToWebView({
            type: "askQuestion",
            question: query,
        });
        try {

            const apiEndpoint = vscode.workspace.getConfiguration('wizardCoder').get<string>('apiEndpoint') ?? '';


            var request = require('request');
            var options = {
                'method': 'POST',
                'url': apiEndpoint,
                'headers': {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "prompt": query
                })
            };
            request(options, async function (error: string | undefined, response: { body: any; }) {
                if (error) throw new Error(error);
                var data = response.body.split("///")
               const prediction = data[data.length - 2]
               if (prediction) {
                await webViewProvider.sendMessageToWebView({
                    type: "addResponse",
                    value: prediction,
                });
            } else {
                showTemporaryStatusMessage("Failed to call chatgpt!", 5000);
                webViewProvider.sendMessageToWebView({
                    type: "addResponse",
                    value: "Failed to call chatgpt!",
                });
            }
            })
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        } catch (error) {
            console.error(error);
        } finally {
            hideStatusMessage();
        }


    };
};