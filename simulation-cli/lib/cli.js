import readline from 'node:readline';

export function createCli(title) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  function ask(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => resolve(answer.trim()));
    });
  }

  function askHidden(question) {
    return new Promise((resolve) => {
      const originalWriteToOutput = rl._writeToOutput;

      rl.output.write(question);
      rl._writeToOutput = () => {};

      rl.question('', (answer) => {
        rl._writeToOutput = originalWriteToOutput;
        rl.output.write('\n');
        resolve(answer.trim());
      });
    });
  }

  function printHeader() {
    console.clear();
    console.log(`=== ${title} ===`);
    console.log('Escriba el número de una opción y presione Enter.');
    console.log('Para desacoplarse sin detener el host: Ctrl+p, Ctrl+q.\n');
  }

  return {
    rl,
    ask,
    askHidden,
    printHeader,
    close: () => rl.close(),
  };
}

export function nowIso() {
  return new Date().toISOString();
}

export function randomCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
