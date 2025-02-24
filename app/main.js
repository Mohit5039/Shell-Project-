const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function parseArguments(input) {
  const args = [];
  let currentArg = "";
  let inSingleQuotes = false;
  let inDoubleQuotes = false;

  let backslashCount = 0;  // Track consecutive backslashes

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    // Handle escaped characters inside quotes
    if (char === "\\" && (inSingleQuotes || inDoubleQuotes)) {
      i++; // Skip the backslash
      if (i >= input.length) break;

      // Handle escaped single quote inside single quotes
      if (inSingleQuotes && input[i] === "'") {
        currentArg += "'";  // Literal single quote
        continue;
      }

      // Handle escaped double quote inside double quotes
      if (inDoubleQuotes && input[i] === '"') {
        currentArg += '"';  // Literal double quote
        continue;
      }

      // Handle any other escaped character inside quotes
      currentArg += "\\" + input[i];
      continue;
    }

    // Count the number of backslashes outside quotes
    if (char === "\\" && !inSingleQuotes && !inDoubleQuotes) {
      backslashCount++;
      continue;
    }

    // After encountering a space, if there were backslashes, add the appropriate number of spaces
    if (backslashCount > 0 && char === " ") {
      currentArg += " ".repeat(backslashCount);  // Add spaces equal to the number of backslashes
      backslashCount = 0;  // Reset after handling spaces
      continue;
    }

    // Toggle single quote state when inside single quotes
    if (char === "'" && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
      continue;
    }

    // Toggle double quote state when inside double quotes
    if (char === '"' && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
      continue;
    }

    // Split arguments based on spaces, but outside of quotes
    if (char === " " && !inSingleQuotes && !inDoubleQuotes) {
      if (currentArg) {
        args.push(currentArg);
        currentArg = "";
      }
      continue;
    }

    // Add the character to the current argument
    currentArg += char;
  }

  // Add any remaining argument if there's one
  if (currentArg) {
    args.push(currentArg);
  }

  return args;
}






function prompt() {
  rl.question("$ ", (answer) => {
    const args = parseArguments(answer.trim());
    const command = args[0];
    const commandargs = args.slice(1);  // Fix variable name consistency

    if (!command) {
      prompt();
      return;
    }

    if (answer === "exit 0") {
      process.exit(0);
      return;
    } 
    else if (command === "echo") {
      console.log(commandargs.join(" "));
    }
    else if (command === "pwd") {
      console.log(process.cwd()); 
    } 
    else if (command === "cd"){
      const targetDir = commandargs[0];
      if (!targetDir) {
        console.log("cd: missing argument");
      } else {
        let newPath;
        if (targetDir === "~") {
          newPath = process.env.HOME;
        } else {
          newPath = path.resolve(targetDir);
        }
        try {
          process.chdir(newPath);
        } catch (error) {
          console.log(`cd: ${targetDir}: No such file or directory`);
        }
      }
    }
    else if (answer.startsWith("type ")) {
      let cmd = commandargs[0];

      if (!cmd) {
        console.log("Usage: type [command]");
      } else if (["exit", "echo", "type", "pwd"].includes(cmd)) {
        console.log(`${cmd} is a shell builtin`);
      } else {
        // Check in PATH directories
        const paths = process.env.PATH.split(path.delimiter);
        let found = false;

        for (let dir of paths) {
          const fullPath = path.join(dir, cmd);

          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            console.log(`${cmd} is ${fullPath}`);
            found = true;
            break;
          }
        }

        if (!found) {
          console.log(`${cmd}: not found`);
        }
      }
    } 
    else {
      // Searching for external command
      const paths = process.env.PATH.split(path.delimiter);
      let found = false;

      for (const dir of paths) {
        const fullPath = path.join(dir, command);

        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          found = true;

          try {
            execFileSync(command, commandargs, { stdio: "inherit" }); // Use correct variable
          } catch (error) {
            console.error(`Error executing ${command}:`, error.message);
          }
          break;
        }
      }

      if (!found) {
        console.log(`${command}: command not found`);
      }
    }

    prompt(); // Keep the shell running
  });
}

prompt();
