const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function parseRedirection(input) {
  const redirMatch = input.match(/(.*?)(?:\s+)(>|1>|2>)(?:\s+)(\S+)/);
  
  if (redirMatch) {
    const redirType = redirMatch[2];
    const file = redirMatch[3].trim();
    
    return {
      command: redirMatch[1].trim(),
      outputFile: redirType === '>' || redirType === '1>' ? file : null,
      errorFile: redirType === '2>' ? file : null,
    };
  }

  return { command: input, outputFile: null, errorFile: null };
}

function parseArguments(input) {
  const args = [];
  let currentArg = "";
  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    
    if (char === "\\") {
      if (i + 1 < input.length) {
        currentArg += input[++i];
      } else {
        currentArg += "\\";
      }
      continue;
    }
    
    if (char === "'" && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
      continue;
    }
    
    if (char === '"' && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
      continue;
    }
    
    if (char === " " && !inSingleQuotes && !inDoubleQuotes) {
      if (currentArg) {
        args.push(currentArg);
        currentArg = "";
      }
      continue;
    }
    
    currentArg += char;
  }
  
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

    const { command: fullCommand, outputFile, errorFile } = parseRedirection(answer);
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
    
    const result = spawnSync(command, commandArgs, { 
      stdio: ["inherit", outputFile ? "pipe" : "inherit", errorFile ? "pipe" : "inherit"] 
    });
    
    if (outputFile && result.stdout) {
      fs.writeFileSync(outputFile, result.stdout);
    }
    if (errorFile && result.stderr) {
      fs.writeFileSync(errorFile, result.stderr);
    }

    prompt();
  });
}

prompt();
