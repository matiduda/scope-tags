import { Menu } from "../Console/Menu";
import { YesNoMenu } from "../Console/YesNoMenu";
import { scopeFolderExists, ensureScopeFolderExists } from "../FileSystem/fileSystemUtils";
import { ConfigFile } from "../Scope/ConfigFile";
import { FileTagsDatabase } from "../Scope/FileTagsDatabase";
import { TagsDefinitionFile } from "../Scope/TagsDefinitionFile";

export function runStartCommandLineInterfaceCommand(args: Array<string>, root: string) {
    if (args[0]) {
        console.log(`Unsupported option: '${args[0]}', to see available options use 'scope --help'`);
        return;
    }

    if (!scopeFolderExists(root)) {
        new YesNoMenu().ask("Do you want to create empty configuration?").then(answer => {
            if (answer) {
                const scopeFolderPath = ensureScopeFolderExists(root);
                [
                    new ConfigFile(root),
                    new TagsDefinitionFile(root),
                    new FileTagsDatabase(root),
                ].forEach(config => config.initDefault());

                console.log("\nInitialized empty configuration at:\n" + scopeFolderPath);
            } else {
                console.log("Exiting.");
                process.exit(0);
            }
            startCLI(root);
        });
    } else {
        startCLI(root);
    }
}

function startCLI(root: string) {
    const tagsDefinitionFile = new TagsDefinitionFile(root).load();
    const fileTagsDatabase = new FileTagsDatabase(root).load();
    new Menu(tagsDefinitionFile, fileTagsDatabase).start().then(() => console.log("Exit."));
}