/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import * as vscode from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient';

let client: LanguageClient;
let nbrMsgs = 0;

export function activate(context: vscode.ExtensionContext) {
	let insertArrow: vscode.Disposable = vscode.commands.registerCommand('algosnipper.insertArrow', function () {
		vscode.window.activeTextEditor.edit( (editBuilder) => {
			let position = vscode.window.activeTextEditor.selection.start;
			editBuilder.insert(position, "◄-");
		});
	});
	let toogleFurryMode: vscode.Disposable = vscode.commands.registerCommand('algosnipper.furryMode', function () {
		vscode.window.showErrorMessage('Alert : Furry mode activated.');
		setTimeout(showFurryMsg, Math.random()*4000+4000);
	});
	function showFurryMsg() {
		if (nbrMsgs < 16 ) {
			let msgIndex = Math.round(Math.random()*30) % 10;
			switch (msgIndex) {
				case 0:
					vscode.window.showInformationMessage('Vous avez eu un câlin surprise par un furry !');
					break;
				case 1:
					vscode.window.activeTextEditor.edit( (editBuilder) => {
						let position = vscode.window.activeTextEditor.selection.start;
						editBuilder.insert(position, " furry ");
					});
					break;
				case 2:
					vscode.window.showInformationMessage('Awoo !');
					break;
				case 3:
					vscode.window.activeTextEditor.edit( (editBuilder) => {
						editBuilder.insert(new vscode.Position(0, 0), "furries > gamers\n");
					});
					break;
				case 4:
					vscode.window.activeTextEditor.edit( (editBuilder) => {
						let position = vscode.window.activeTextEditor.selection.start;
						editBuilder.insert(position, " UwU ");
					});
					break;
				case 5:
					vscode.window.activeTextEditor.edit( (editBuilder) => {
						let lCount = vscode.window.activeTextEditor.document.lineCount;
						let lLength = vscode.window.activeTextEditor.document.lineAt(lCount-1).text.length;
						let text = "\nFurries";
						let long = Math.random()*12;
						let lxc = ["UwO", "OwO", "Furries", "Furry", "Awoo", "Furries > Gamers"]
						for (let i = 0; i < long; i++) {
							text += "\n"+lxc[Math.round(Math.random()*(lxc.length-1))];
						}
						editBuilder.insert(new vscode.Position(lCount-1, lLength), text);
					});
					break;
				case 6:
					vscode.window.activeTextEditor.edit( (editBuilder) => {
						let position = vscode.window.activeTextEditor.selection.start;
						editBuilder.insert(position, " furries > gamers ");
					});
					break;
				case 7:
					vscode.window.activeTextEditor.edit( (editBuilder) => {
						let position = vscode.window.activeTextEditor.selection.start;
						editBuilder.insert(position, " OwO ");
					});
					break;
				case 8:
					vscode.window.activeTextEditor.edit( (editBuilder) => {
						editBuilder.insert(new vscode.Position(0, 0), "furry\n");
					});
					break;
				case 9:
					vscode.window.activeTextEditor.edit( (editBuilder) => {
						let position = vscode.window.activeTextEditor.selection.start;
						editBuilder.insert(position, " Awoo ");
					});
					break;
				default:
					break;
			}
			nbrMsgs++;
			setTimeout(showFurryMsg, Math.random()*4000+4000);
		} else {
			nbrMsgs = 0;
			vscode.window.showInformationMessage('Fixed : Furry mode disabled');
		}
	}
	let genLexique: vscode.Disposable = vscode.commands.registerCommand('algosnipper.genLexique', function () {
		vscode.window.activeTextEditor.edit( (editBuilder) => {
			var lexique = "\n\nlexique:\n";
			var variables: {name: string, type: string}[] = [];
			let count: number = vscode.window.activeTextEditor.document.lineCount;
			for (let i = 0; i < count; i++) {
				const line = vscode.window.activeTextEditor.document.lineAt(i);
				let words = line.text.split(" ");
				for (let j = 0; j < words.length; j++) {
					const w = words[j];
					if (w == ":") {
						variables.push({name: words[j-1], type: words[j+1]})
					}
					if (w == "◄-" || w == "←" || w == "<-" || w == "<=") {
						let alreadyExists = false
						for (let k = 0; k < variables.length; k++) {
							if (variables[k].name.trim() == words[j-1].trim()) 
								alreadyExists = true;
						}
						if (alreadyExists == false)
							variables.push({name: words[j-1], type: getVarType(words[j+1], variables)});
					}
				}
			}
			for (let i = 0; i < variables.length; i++) {
				const v = variables[i];
				lexique += "	"+v.name+" : "+v.type+" // commentaire\n"
			}
			editBuilder.insert(new vscode.Position(vscode.window.activeTextEditor.document.lineCount, 0), lexique);
		});
		vscode.window.showInformationMessage('Le lexique à bien été généré !');
	});
	let launch: vscode.Disposable = vscode.commands.registerCommand('algosnipper.launch', function () {
		vscode.window.showInformationMessage("Lancement de l'algorithme ...");
		let program: string[] = vscode.window.activeTextEditor.document.getText().split("\n");
		let output: vscode.OutputChannel = vscode.window.createOutputChannel("Algorithme");
		output.show(true);

		output.appendLine("--- Désolé, cette fonctionnalité n'est pas encore disponible ---");
	});

	// The server is implemented in node
	let serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'algo' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'languageServerAlgo',
		'Language Server Algo',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();

	context.subscriptions.push(genLexique);
	context.subscriptions.push(insertArrow);
	context.subscriptions.push(launch);
	context.subscriptions.push(toogleFurryMode);
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

function getVarType(value: string, variables: {name: string, type: string}[]): string {
	if (value.startsWith('"')) { // chaîne
		return "Chaîne";
	}
	else if (value.startsWith("'")) { // chaîne
		return "caractère";
	}
	else if (!isNaN(parseFloat(value))) { // nombre
		if (parseInt(value) == parseFloat(value))
			return "entier";
		else
			return "réel";
	}
	else if (value == "vrai" || value == "faux") {
		return "booléen";
	}
	else {
		for (let k = 0; k < variables.length; k++) {
			const v = variables[k].name;
			if (v.trim() == value.trim()) {
				return variables[k].type;
			}
		}
		return "inconnu";
	}
}

function getVarValue(line: string, variables: {name: string, type: string, value: string}[]): string {
	let splitted: string[] = line.split(" ");
	let value: string = "";
	for (let i = 0; i < splitted.length; i++) {
		if (splitted[i] == "←") {
			for (let k = 0; k < variables.length; k++) {
				const v = variables[k].name;
				if (v.trim() == splitted[i+1].trim()) {
					value = variables[k].value;
					break;
				}
			}
			break;
		}
	}
	if (value == "") {
		for (let i = 0; i < splitted.length; i++) {
			if (splitted[i] == "←") {
				for (let j = i+1; j < splitted.length; j++) {
					value += splitted[j]+" ";
				}
			}
		}
		if (value.startsWith('"')) {
			value = value.substr(1, value.length-4)
		}
	}
	return value;
}