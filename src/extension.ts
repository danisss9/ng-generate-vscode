import * as vscode from 'vscode';

interface GenerateOptions {
  [key: string]: boolean | string;
}

type SchematicType =
  | 'component'
  | 'service'
  | 'module'
  | 'directive'
  | 'pipe'
  | 'guard'
  | 'interceptor'
  | 'class'
  | 'interface'
  | 'enum'
  | 'resolver';

export function activate(context: vscode.ExtensionContext) {
  // Register commands for each schematic type
  const schematics: SchematicType[] = [
    'component',
    'service',
    'module',
    'directive',
    'pipe',
    'guard',
    'interceptor',
    'class',
    'interface',
    'enum',
    'resolver',
  ];

  schematics.forEach((schematic) => {
    const disposable = vscode.commands.registerCommand(
      `ng-generate.${schematic}`,
      (uri: vscode.Uri) => generatengSchematic(schematic, uri)
    );
    context.subscriptions.push(disposable);
  });
}

async function generatengSchematic(schematic: SchematicType, uri: vscode.Uri) {
  // Get the folder path
  const folderPath = uri.fsPath;

  // Prompt for name
  const name = await vscode.window.showInputBox({
    prompt: `Enter the name for the ${schematic}`,
    placeHolder: `my-${schematic}`,
    validateInput: (value) => {
      if (!value || value.trim() === '') {
        return 'Name cannot be empty';
      }
      if (!/^[a-z][a-z0-9-]*$/.test(value)) {
        return 'Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens';
      }
      return null;
    },
  });

  if (!name) {
    return; // User cancelled
  }

  // Prompt for project name (optional)
  const projectName = await vscode.window.showInputBox({
    prompt: `Enter the project name (optional)`,
    placeHolder: `Leave empty to use default project`,
  });

  if (projectName === undefined) {
    return; // User cancelled
  }

  // Get configuration options
  const config = vscode.workspace.getConfiguration('ngGenerate');
  const options = getOptionsForSchematic(schematic, config);

  // Add project option if provided
  if (projectName && projectName.trim() !== '') {
    options.project = projectName.trim();
  }

  // Build the ng generate command
  const command = buildNgGenerateCommand(schematic, name, options);

  // Get workspace root
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Could not determine workspace folder');
    return;
  }

  // Build final command with just the name (Angular CLI will use cwd)
  const finalCommand = `${command} ${name}`;

  // Create and show terminal with cwd set to the selected folder
  const terminal = vscode.window.createTerminal({
    name: `ng Generate ${schematic}`,
    cwd: folderPath,
  });

  terminal.show();
  terminal.sendText(finalCommand);

  vscode.window.showInformationMessage(`Generating ${schematic}: ${name}`);
}

function getOptionsForSchematic(
  schematic: SchematicType,
  config: vscode.WorkspaceConfiguration
): GenerateOptions {
  const options: GenerateOptions = {};
  const schematicConfig = config.get<any>(schematic);

  if (schematicConfig) {
    Object.keys(schematicConfig).forEach((key) => {
      const value = schematicConfig[key];
      if (value !== undefined && value !== null) {
        options[key] = value;
      }
    });
  }

  return options;
}

function buildNgGenerateCommand(
  schematic: SchematicType,
  name: string,
  options: GenerateOptions
): string {
  let command = `ng generate ${schematic}`;

  // Add options as flags
  Object.keys(options).forEach((key) => {
    const value = options[key];
    const kebabKey = toKebabCase(key);

    if (typeof value === 'boolean') {
      if (value === true) {
        command += ` --${kebabKey}`;
      } else {
        command += ` --${kebabKey}=false`;
      }
    } else if (typeof value === 'string') {
      command += ` --${kebabKey}=${value}`;
    }
  });

  return command;
}

function toKebabCase(str: string): string {
  return str.replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function deactivate() {
  // Extension cleanup
}
