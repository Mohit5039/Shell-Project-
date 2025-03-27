# Shell Project

# How to use this in your system 
Install npm package : 
using :  npm install shell-project

## How I Made This
This project was developed by following the CodeCrafters shell-building challenge. I have used AI models like GPT and Claude fairly whenever I faced challenges. The implementation involved breaking down the shell functionalities into modular components and gradually adding features such as command execution, argument parsing, redirection, and autocompletion.

## What I Learned
- Gained experience in Node.js and practiced my JavaScript skills.
- Deepened my understanding of shell behavior and command execution.
- Learned how to implement tab completion and argument parsing.
- Improved debugging and error-handling skills in a CLI environment.

## Overview
This project is a simple custom shell implemented in JavaScript using Node.js. It provides basic shell functionalities such as command execution, path resolution, tab completion, input/output redirection, and autocompletion.

## Features
- **Command Execution**: Runs external commands found in the system's `PATH`.
- **Built-in Commands**:
  - `cd`: Change directory.
  - `pwd`: Print the current working directory.
  - `echo`: Print text to the console.
  - `exit`: Exit the shell.
  - `type`: Identify if a command is built-in or external.
- **Tab Completion & Autocompletion**:
  - Supports built-in commands and executables in `PATH`.
  - Implements intelligent completion with longest common prefix.
  - Provides multiple completion suggestions on double tab press.
- **Redirection Support**:
  - Output redirection (`>`, `>>`, `1>`, `1>>`).
  - Error redirection (`2>`, `2>>`).
  - Input redirection (`<`).
- **Argument Parsing**:
  - Handles spaces, quotes, and escape sequences correctly.
- **Error Handling**:
  - Handles invalid commands and permissions gracefully.

## Installation
### Prerequisites
- Node.js (v14+ recommended)

### Steps
1. Clone this repository:
   ```sh
   git clone <repository-url>
   cd <repository-folder>
   ```
2. Install dependencies (if any):
   ```sh
   npm install
   ```
3. Run the shell:
   ```sh
   node shell.js
   ```

## Usage
- Run commands as you would in a typical terminal.
- Use `TAB` for autocompletion.
- Redirect output using `>` or `>>`.
- Redirect input using `<`.
- Exit using `exit`.

## Future Enhancements
- Add support for pipes (`|`).
- Implement background processes (`&`).
- Improve shell prompt customization.
- Add support for environment variables.


