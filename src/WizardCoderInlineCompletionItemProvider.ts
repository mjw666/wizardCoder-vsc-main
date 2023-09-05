import * as vscode from 'vscode';
import fetch from 'node-fetch';
import * as http from "http"
type ApiResponse = {
    results: Array<{ text: string }>;
};
let prediction: any
export class WizardCoderInlineCompletionItemProvider implements vscode.InlineCompletionItemProvider {
    private debounceTimeout: NodeJS.Timeout | null = null;
    private debounceTimeInMilliseconds = 500;

    provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.InlineCompletionList> {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        return new Promise((resolve) => {
            this.debounceTimeout = setTimeout(async () => {
                const completionItems = await this.fetchCompletionItems(document, position);
                resolve({ items: completionItems });
            }, this.debounceTimeInMilliseconds);
        });
    }

    private async fetchCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.InlineCompletionItem[]> {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        // process context for the prompt
        const contextWindow = 500;
        let textAboveCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        let wordsAbove = textAboveCursor.split(/\s+/);
        if (wordsAbove.length > contextWindow) {
            wordsAbove = wordsAbove.slice(wordsAbove.length - contextWindow);
        }
        textAboveCursor = wordsAbove.join(' ');

        let textBelowCursor = document.getText(new vscode.Range(position, new vscode.Position(document.lineCount, document.lineAt(document.lineCount - 1).range.end.character)));
        let wordsBelow = textBelowCursor.split(/\s+/);
        if (wordsBelow.length > contextWindow) {
            wordsBelow = wordsBelow.slice(0, contextWindow);
        }

        textBelowCursor = wordsBelow.join(' ');

        const prompt = `<fim_prefix>${textAboveCursor}<fim_suffix>${textBelowCursor}<fim_middle>`;


        const completionItems: vscode.InlineCompletionItem[] = [];

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
                    "prompt": prompt
                })
            };
            request(options,  function (error: string | undefined, response: { body: any; }) {
                if (error) throw new Error(error);
                var data = response.body.split("///")
                prediction = data[data.length - 2]
            })
           completionItems.push({
                insertText: prediction,
            });
        } catch (err) {
            console.error('Error while calling AI API:', err);
        }
        return completionItems;
    }
}
