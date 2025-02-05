const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


// repl function - read eval print loop
function prompt() {
  rl.question("$ ", (answer) => {
    if(answer === "exit 0"){
      process.exit(0);
      return ;
    }
    else if (answer.startsWith('echo')){
      console.log(answer.slice(5)) ;  
    }
    else if (answer.startsWith("type ")) {
      let command = answer.slice(5).trim();  // Remove "type " and trim spaces
      
      if (command === "") {
        console.log("Usage: type [command]"); // Handling empty case
      } else if (command === "exit" || command === "echo") {
        console.log(`${command} is a shell builtin`);
      } else {
        console.log(`${command}: not found`);
      }
    }
    
    else{
    console.log(`${answer}: command not found`);
    }
    prompt(); // Recursively call the function to keep the loop going
  });
}
prompt(); // Start the prompt loop


