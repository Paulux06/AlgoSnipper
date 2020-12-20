/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { kMaxLength } from 'buffer';
import { types } from 'util';
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	MarkupContent,
	MarkupKind
} from 'vscode-languageserver';

import {TextDocument} from 'vscode-languageserver-textdocument';
// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. 
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerAlgo'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(async change => {
	let textDocument = change.document;
	validateTextDocument(textDocument);
});

let lexiqueTypes: {name: String, vars: {name: String, type: String}[]}[] = [];
let lexiqueVars: {name: String, type: String, desc: String}[] = [];

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);

	let diagnostics: Diagnostic[] = [];
	lexiqueTypes = [];
	lexiqueVars = [];

	//try to get the lexique
	let lines = textDocument.getText().split("\n");
	let lexiqueIndex = 0;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].toLowerCase().startsWith("lexique")) {
			lexiqueIndex = i+1;
			break;
		}
	}
	let lexiqueEnd = false;
	while (!lexiqueEnd) {
		let currentLine = lines[lexiqueIndex];
		if (currentLine.toLowerCase().startsWith("fonction") ||
			currentLine.toLowerCase().startsWith("algorithme"))
			lexiqueEnd = true;
		
		if (!lexiqueEnd) {
			//add line to types or vars lists
			let isVariable = true;
			let chars = currentLine.split("");
			//check if variable or class
			for (let i = 0; i < chars.length; i++) {
				if (chars[i] == "=") {
					isVariable = false;
					break;
				}
			}
			if (isVariable) {
				let parts = currentLine.split(":");
				let name = parts[0].trim();
				let desc = "";
				let type = parts[1];
				let chars = parts[1].split("");
				for (let i = 0; i < chars.length; i++) {
					if (chars[i] == "/" && i < chars.length-1) {
						type = parts[1].substring(0, i-1).trim();
						desc = parts[1].substring(i, chars.length).trim();
						break;
					}
				}
				lexiqueVars.push({name: name, type: type, desc: desc});
			} else {
				let parts: {name: String, type: String}[] = [];
				let sep = currentLine.split("=");
				let name = sep[0].trim();
				let attribs = sep[1].replace(">", "").replace("<", "").split(",")
				attribs.forEach(attr => {
					let pt = attr.split(":");
					let attrName = pt[0].trim();
					let attrType = pt[1].trim();
					parts.push({name: attrName, type: attrType});
				});
				lexiqueTypes.push({name: name, vars: parts});
			}
		}

		lexiqueIndex++
		if (lexiqueIndex == lines.length)
			lexiqueEnd = true;
	}

	// get all ortho errors
	let orthoDiagnose: Diagnostic[] = correctOrtho(textDocument, lexiqueTypes, lexiqueVars);

	/*
	let diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Warning,
		range: {
			start: textDocument.positionAt(0),
			end: textDocument.positionAt(1)
		},
		message: `hello world`,
		source: 'AlgoSnipper'
	};
	diagnostics.push(diagnostic);

	orthoDiagnose.forEach(diag => {
		diagnostics.push(diag);
	});
	*/
	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		let compList: CompletionItem[] = [];
		let index = 0;
		lexiqueTypes.forEach(el => {
			compList.push({
				label: el.name.toString(),
				kind: CompletionItemKind.Class,
				data: index++
			});
		});
		lexiqueVars.forEach(el => {
			compList.push({
				label: el.name.toString(),
				kind: CompletionItemKind.Variable,
				data: index++
			});
		});
		return compList;
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data < lexiqueTypes.length) {
			item.detail = "Type "+lexiqueTypes[item.data].name
			let val = "__**Attributs:**__\n```algo";
			lexiqueTypes[item.data].vars.forEach(el => {
				val += "\n"+el.name+" ( "+el.type+" )";
			});
			item.documentation = {kind: MarkupKind.Markdown, value: val+"\n```"};
		} else {
			item.detail = "Variable "+lexiqueVars[item.data-lexiqueTypes.length].name
			let val = "```algo";
			val += "\nnom: "+lexiqueVars[item.data-lexiqueTypes.length].name;
			val += "\ntype: "+lexiqueVars[item.data-lexiqueTypes.length].type;
			val += "\n"+lexiqueVars[item.data-lexiqueTypes.length].desc;
			val += "\n```"
			item.documentation = {kind: MarkupKind.Markdown, value: val};
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();


function correctOrtho(textDocument: TextDocument, types: any, vars: any) : Diagnostic[] {
	let text = textDocument.getText();
	let diagnoses: Diagnostic[] = [];

	let diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Information,
		range: {
			start: textDocument.positionAt(6),
			end: textDocument.positionAt(8)
		},
		message: "salut",
		source: "AlgoSnipper"
	}

	return diagnoses;
}