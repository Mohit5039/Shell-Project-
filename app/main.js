const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt() {
  rl.question("$ ", (answer) => {
    const args = answer.trim().split(/\s+/);
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
    else if (answer.startsWith("echo")) {
      console.log(answer.slice(5));
    } 
    else if (command === "pwd") {
      console.log(process.cwd()); 
    } 
    else if (command === "cd"){
      const targetDir = commandargs[0] ;
      if(!targetDir){
        console.log("cd: missing argument");
            } //else if(!path.isAbsolute(targetDir)){
              //console.log("cd: only absolute paths are supported in this stage");
            } else {
              const newPath = path.isAbsolute(targetDir) ? targetDir : path.resolve(targetDir);
              try {
                process.chdir(targetDir);
              }
              catch(error){
                console.log(`cd: ${targetDir}: No such file or directory`)
              }
            }
    }
    else if (answer.startsWith("type ")) {
      let cmd = commandargs[0];

      if (!cmd) {
        console.log("Usage: type [command]");
      } else if (["exit", "echo", "type" , "pwd"].includes(cmd)) {
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
