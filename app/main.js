const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function parseRedirection(input) {
  // Match either > or 1> for redirection
  const redirMatch = input.match(/(.*?)(?:\s+)(>|1>)(?:\s+)(\S+)/);
  
  if (redirMatch) {
    return {
      command: redirMatch[1].trim(),
      outputFile: redirMatch[3].trim(),
    };
  }

  return { command: input, outputFile: null };
}

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
    if (!answer.trim()) {
      prompt();
      return;
    }

    // Check for redirection
    const { command: fullCommand, outputFile } = parseRedirection(answer);
    
    // Parse the command into command and arguments
    const args = parseArguments(fullCommand);
    const command = args[0];
    const commandArgs = args.slice(1);

    if (answer === "exit 0") {
      process.exit(0);
      return;
    } 
    
    if (command === "cd") {
      const targetDir = commandArgs[0];
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
      prompt();
      return;
    }
    
    if (command === "type") {
      let cmd = commandArgs[0];

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
      prompt();
      return;
    }
    
    if (command === "echo") {
      const output = commandArgs.join(" ");
      if (outputFile) {
        try {
          // Ensure directory exists
          const dir = path.dirname(outputFile);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          // Write output to file
          fs.writeFileSync(outputFile, output + "\n");
        } catch (error) {
          console.error(`Error writing to ${outputFile}: ${error.message}`);
        }
      } else {
        console.log(output);
      }
      prompt();
      return;
    }
    
    if (command === "pwd") {
      const output = process.cwd();
      if (outputFile) {
        try {
          // Ensure directory exists
          const dir = path.dirname(outputFile);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          // Write output to file
          fs.writeFileSync(outputFile, output + "\n");
        } catch (error) {
          console.error(`Error writing to ${outputFile}: ${error.message}`);
        }
      } else {
        console.log(output);
      }
      prompt();
      return;
    }
    
    // External command
    const paths = process.env.PATH.split(path.delimiter);
    let found = false;

    for (const dir of paths) {
      const fullPath = path.join(dir, command);

      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        found = true;

        try {
          // Handle redirection for external commands
          if (outputFile) {
            // Ensure directory exists
            const dir = path.dirname(outputFile);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            
            // Execute command and capture output
            const result = spawnSync(command, commandArgs, { 
              stdio: ['inherit', 'pipe', 'inherit']
            });
            
            if (result.error) {
              throw result.error;
            }
            
            // Write stdout to file
            fs.writeFileSync(outputFile, result.stdout);
          } else {
            // No redirection, just execute normally
            spawnSync(command, commandArgs, { stdio: 'inherit' });
          }
        } catch (error) {
          console.error(`Error executing ${command}: ${error.message}`);
        }
        break;
      }
    }

    if (!found) {
      console.log(`${command}: command not found`);
    }

    prompt(); // Keep the shell running
  });
}

prompt();