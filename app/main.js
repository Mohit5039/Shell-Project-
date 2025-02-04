const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


// repl function - read eval print loop
function prompt() {
  rl.question("$ ", (answer) => {
    if(answer === "exit 0"){
      exit(0);
    }
    else{
    console.log(`${answer}: command not found`);
    }
    prompt(); // Recursively call the function to keep the loop going
  });
}
prompt(); // Start the prompt loop
