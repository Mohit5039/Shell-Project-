const readline = require("readline");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt() {
  rl.question("$ ", (answer) => {
    if (answer === "exit 0") {
      process.exit(0);
      return;
    } 
    else if (answer.startsWith("echo")) {
      console.log(answer.slice(5));
    } 
    else if (answer.startsWith("type ")) {
      let command = answer.slice(5).trim();

      if (command === "") {
        console.log("Usage: type [command]");
      } 
      else if (command === "exit" || command === "echo" || command === "type") {
        console.log(`${command} is a shell builtin`);
      } 
      else {
        // Check in PATH directories
        const paths = process.env.PATH.split(path.delimiter);
        let found = false;

        for (let dir of paths) {
          const fullPath = path.join(dir, command);

          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            console.log(`${command} is ${fullPath}`);
            found = true;
            break;
          }
        }

        if (!found) {
          console.log(`${command}: not found`);
        }
      }
    } 
    else{
      const parts = answer.split(" ");
      const command = parts[0];
      const args = parts.slice(1);

      // Searching for the command in PATH
      const paths = process.env.PATH.split(path.delimiter);
      let executablePath = null;

      for (let p of paths) {
        const fullPath = path.join(p, command);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          executablePath = fullPath;
          break;
        }
      }

      if(executablePath){
        // Running the external program
        const child = spawn(executablePath, args, { stdio: "inherit" });

        child.on("error", (err) => {
          console.log(`Error running command: ${err.message}`);
        });
      } else {
        console.log(`${command}: command not found`);
      }

    }
    

    prompt(); // Keep the shell running
  });
}

prompt();
