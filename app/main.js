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
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    // Handle backslash escape sequences
    if (char === "\\") {
      // Check if we're at the end of the string
      if (i + 1 >= input.length) {
        // Add the backslash if it's the last character
        currentArg += "\\";
      } else {
        const nextChar = input[i + 1];
        
        // In double quotes, only certain characters get escaped
        if (inDoubleQuotes) {
          if (nextChar === '"' || nextChar === '\\' || nextChar === '$') {
            i++; // Skip the backslash
            currentArg += nextChar;
          } else {
            // Preserve the backslash for other characters in double quotes
            currentArg += "\\";
          }
        }
        // In single quotes, no escaping happens, treat backslash as literal
        else if (inSingleQuotes) {
          currentArg += "\\";
        }
        // Outside quotes, backslash escapes the next character
        else {
          i++; // Skip the backslash
          // Handle space specially if escaped outside quotes
          if (nextChar === ' ') {
            currentArg += ' ';
          } else {
            // For other characters, preserve the literal character
            currentArg += nextChar;
          }
        }
      }
      continue;
    }
    
    // Toggle single quote state when encountering unescaped single quote
    if (char === "'" && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
      continue;
    }
    
    // Toggle double quote state when encountering unescaped double quote
    if (char === '"' && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
      continue;
    }
    
    // Split arguments based on spaces, but only when outside of quotes
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
  
  // Add any remaining argument
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
