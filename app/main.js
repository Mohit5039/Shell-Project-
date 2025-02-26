const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function parseRedirection(input) {
  // Check for stderr append redirection (2>>)
  const stderrAppendMatch = input.match(/(.*?)(?:\s+)(2>>)(?:\s+)(\S+)/);
  if (stderrAppendMatch) {
    return {
      command: stderrAppendMatch[1].trim(),
      stderrFile: stderrAppendMatch[3].trim(),
      stdoutFile: null,
      appendStdout: false,
      appendStderr: true
    };
  }
  
  // Check for stderr redirection (2>)
  const stderrMatch = input.match(/(.*?)(?:\s+)(2>)(?:\s+)(\S+)/);
  if (stderrMatch) {
    return {
      command: stderrMatch[1].trim(),
      stderrFile: stderrMatch[3].trim(),
      stdoutFile: null,
      appendStdout: false,
      appendStderr: false
    };
  }
  
  // Check for stdout append redirection (>> or 1>>)
  const stdoutAppendMatch = input.match(/(.*?)(?:\s+)(>>|1>>)(?:\s+)(\S+)/);
  if (stdoutAppendMatch) {
    return {
      command: stdoutAppendMatch[1].trim(),
      stdoutFile: stdoutAppendMatch[3].trim(),
      stderrFile: null,
      appendStdout: true,
      appendStderr: false
    };
  }
  
  // Check for stdout redirection (> or 1>)
  const stdoutMatch = input.match(/(.*?)(?:\s+)(>|1>)(?:\s+)(\S+)/);
  if (stdoutMatch) {
    return {
      command: stdoutMatch[1].trim(),
      stdoutFile: stdoutMatch[3].trim(),
      stderrFile: null,
      appendStdout: false,
      appendStderr: false
    };
  }

  // No redirection
  return { 
    command: input, 
    stdoutFile: null,
    stderrFile: null,
    appendStdout: false,
    appendStderr: false
  };
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

// Helper function to ensure a directory exists
function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper function to write to file (with append support)
function writeToFile(file, content, append) {
  try {
    ensureDirExists(file);
    if (append) {
      fs.appendFileSync(file, content);
    } else {
      fs.writeFileSync(file, content);
    }
    return true;
  } catch (error) {
    console.error(`Error writing to ${file}: ${error.message}`);
    return false;
  }
}

function prompt() {
  rl.question("$ ", (answer) => {
    if (!answer.trim()) {
      prompt();
      return;
    }

    // Check for redirection
    const { command: fullCommand, stdoutFile, stderrFile, appendStdout, appendStderr } = parseRedirection(answer);
    
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
          const errorMsg = `cd: ${targetDir}: No such file or directory`;
          if (stderrFile) {
            writeToFile(stderrFile, errorMsg + "\n", appendStderr);
          } else {
            console.log(errorMsg);
          }
        }
      }
      prompt();
      return;
    }
    
    if (command === "type") {
      let cmd = commandArgs[0];

      if (!cmd) {
        const errorMsg = "Usage: type [command]";
        if (stderrFile) {
          writeToFile(stderrFile, errorMsg + "\n", appendStderr);
        } else {
          console.log(errorMsg);
        }
      } else if (["exit", "echo", "type", "pwd"].includes(cmd)) {
        const output = `${cmd} is a shell builtin`;
        if (stdoutFile) {
          writeToFile(stdoutFile, output + "\n", appendStdout);
        } else {
          console.log(output);
        }
      } else {
        // Check in PATH directories
        const paths = process.env.PATH.split(path.delimiter);
        let found = false;

        for (let dir of paths) {
          const fullPath = path.join(dir, cmd);

          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            const output = `${cmd} is ${fullPath}`;
            if (stdoutFile) {
              writeToFile(stdoutFile, output + "\n", appendStdout);
            } else {
              console.log(output);
            }
            found = true;
            break;
          }
        }

        if (!found) {
          const errorMsg = `${cmd}: not found`;
          if (stderrFile) {
            writeToFile(stderrFile, errorMsg + "\n", appendStderr);
          } else {
            console.log(errorMsg);
          }
        }
      }
      prompt();
      return;
    }
    
    if (command === "echo") {
      const output = commandArgs.join(" ");
      
      // Handle redirection
      if (stdoutFile) {
        writeToFile(stdoutFile, output + "\n", appendStdout);
      } else if (stderrFile) {
        // For echo with stderr redirection, we also output to console per the test cases
        console.log(output);
        // Redirect the same output to stderr file
        writeToFile(stderrFile, output + "\n", appendStderr);
      } else {
        console.log(output);
      }
      
      prompt();
      return;
    }
    
    if (command === "pwd") {
      const output = process.cwd();
      
      // Handle redirection
      if (stdoutFile) {
        writeToFile(stdoutFile, output + "\n", appendStdout);
      } else if (stderrFile) {
        // For pwd, if only stderr is redirected, stdout still goes to console
        console.log(output);
        // Since pwd doesn't typically generate stderr, we create an empty file
        writeToFile(stderrFile, "", appendStderr);
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
          // Configure stdio based on redirection needs
          let stdio;
          if (stdoutFile && stderrFile) {
            stdio = ['inherit', 'pipe', 'pipe']; // Both stdout and stderr are piped
          } else if (stdoutFile) {
            stdio = ['inherit', 'pipe', 'inherit']; // Only stdout is piped
          } else if (stderrFile) {
            stdio = ['inherit', 'inherit', 'pipe']; // Only stderr is piped
          } else {
            stdio = 'inherit'; // No redirection
          }

          // Execute the command
          const result = spawnSync(command, commandArgs, { stdio });
          
          if (result.error) {
            throw result.error;
          }
          
          // Handle stdout redirection if needed
          if (stdoutFile && result.stdout) {
            writeToFile(stdoutFile, result.stdout, appendStdout);
          }
          
          // Handle stderr redirection if needed
          if (stderrFile && result.stderr) {
            // Convert Buffer to string and make sure it ends with a newline
            let stderrStr = result.stderr.toString();
            if (stderrStr.length > 0 && !stderrStr.endsWith('\n')) {
              stderrStr += '\n';
            }
            writeToFile(stderrFile, stderrStr, appendStderr);
          }
        } catch (error) {
          const errorMsg = `Error executing ${command}: ${error.message}`;
          if (stderrFile) {
            writeToFile(stderrFile, errorMsg + "\n", appendStderr);
          } else {
            console.error(errorMsg);
          }
        }
        break;
      }
    }

    if (!found) {
      const errorMsg = `${command}: command not found`;
      if (stderrFile) {
        writeToFile(stderrFile, errorMsg + "\n", appendStderr);
      } else {
        console.log(errorMsg);
      }
    }

    prompt(); // Keep the shell running
  });
}

prompt();