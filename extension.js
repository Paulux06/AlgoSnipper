// token: r5tebumpblai3bwyvnrk6g7dxk72ev7soozpzsupdbiad4edh4ma
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "algosnipper" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let genLexique = vscode.commands.registerCommand('algosnipper.genLexique', function () {
		vscode.window.activeTextEditor.edit( (editBuilder) => {
			var lexique = "\n\nlexique:\n";
			var variables = [];
			let count = vscode.window.activeTextEditor.document.lineCount;
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
	
	let insertArrow = vscode.commands.registerCommand('algosnipper.insertArrow', function () {
		vscode.window.activeTextEditor.edit( (editBuilder) => {
			let position = vscode.window.activeTextEditor.selection.start;
			editBuilder.insert(position, "◄-");
		});
	});

	let launch = vscode.commands.registerCommand('algosnipper.launch', function () {
		vscode.window.showInformationMessage("Lancement de l'algorithme ...");
		let program = vscode.window.activeTextEditor.document.getText().split("\n");
		let output = vscode.window.createOutputChannel("Algorithme");
		output.show(true);
		output.appendLine("Compilation ...")

		//clear identation
		for (let i = 0; i < program.length; i++) {
			let chars = program[i].split("");
			//get indentation length
			let index = 0;
			while (chars[index] == " ") {index++;}
			//remove identation
			program[i] = program[i].substr(index, program[i].length-index);
		}

		//get and replace all variables by values
		let variables = []; //variables array (name+type+value)
		for (let i = 0; i < program.length; i++) {
			let words = program[i].split(" ");
			//get if variable assignation
			for (let j = 0; j < words.length; j++) {
				//create or update variable if assignation
				if (words[j] == "←") {
					if(j != 1) {
						output.appendLine("Erreur: Mauvaise assignation à la ligne "+i+".\n    La synthaxe n'est pas correcte");
						return;
					}
					let alreadyExists = false;
					let value = getVarValue(program[i], variables);
					let type = getVarType(value, variables);
					for (let k = 0; k < variables.length; k++) {
						const v = variables[k];
						if(v.name.trim() == words[0].trim()) {
							if (v.type != type) {
								output.appendLine("Erreur: Mauvaise assignation à la ligne "+i+".\n"+
												  "    La variable est du type "+v.type+" et la valeur est du type "+type);
								return;
							}
							v.value = value;
						}
					}
					variables.push({name: words[0], type: type, value: value})
					words = [];
				}
				else {
					//replace variable name by value
					for (let k = 0; k < variables.length; k++) {
						const v = variables[k];
						if (v.name.trim() == words[j].trim() && words[j+1] != "←")
							words[j] = v.value;
					}
				}
			}
			program[i] = words.join(" ");
		}

		//create all functions
		let funcs = []; //functions array (name+[arguments]+[code])
		for (let i = 0; i < program.length; i++) {
			let words = program[i].split(" ");
			let chars = program[i].split("");
			//create all functions
			if (words[0] == "fonction" && program[i+1].startsWith("début")) {
				let fname = "";
				let index = 0;
				//get function name
				for (let j = 9; j < chars.length; j++) {
					index = j;
					if (chars[j] == "(") break;
					fname += chars[j];
				}
				let arguments = [] // like a variable array but with index attribute
				let argIndex = 0;
				let finArgs = false;
				// get arguments
				while (!finArgs && argIndex < 3) {
					// get name
					let name = "";
					for (let j = index+1; j < chars.length; j++) {
						index = j;
						if(chars[j] == ")") {finArgs=true; break;}
						if(chars[j] == ":") break;
						name += chars[j];
					}
					// get type
					let type = "";
					for (let j = index+1; j < chars.length; j++) {
						index = j;
						if(chars[j] == ")") {finArgs=true; break;}
						if(chars[j] == ",") break;
						type += chars[j];
					}
					// create the new argument
					if (name!="" && type!="") {
						arguments.push({index: argIndex, name: name.trim(), type: type.trim(), value: ""})
						argIndex ++;
					}
				}
				let code = [] // string array of function's code
				i+=2; // goes to the first function's line
				while (!program[i].startsWith("fin")) {
					code.push(program[i]);
					i++;
				}
				funcs.push({name: fname, arguments: arguments, code: code});
				console.log("created new function with name ["+fname+"], "+arguments.length+" parameters and "+code.length+" lines of code.")
			}
		}

		// replace all function call by function code
		for (let i = 0; i < program.length; i++) {
			let words = program[i];
			for (let j = 0; j < words.length; j++) {
				for (let k = 0; k < funcs.length; k++) {
					if (words[j].startsWith(funcs[k].name)) // TODO: ce qu'il ya a faire tu c'est un appel de fonction
						console.log("yest");
				}
			}
		}
		
		output.appendLine("--- Début de l'algorithme ---");
		output.appendLine(program.join(""));
		output.appendLine("--- Fin de l'algorithme ---");
	});

	context.subscriptions.push(genLexique);
	context.subscriptions.push(insertArrow);
	context.subscriptions.push(launch);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}

function getVarType(value="", variables=[]) {
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

function getVarValue(line="", variables=[]) {
	let splitted = line.split(" ");
	let value = "";
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