import readline from 'node:readline';
import { Writable } from 'node:stream';

export function createCli(title) {
  const mutedOutput = new Writable({
    write(chunk, encoding, callback) {
      if (!mutedOutput.muted) {
        process.stdout.write(chunk, encoding);
      }
      callback();
    },
  });
  mutedOutput.muted = false;

  const rl = readline.createInterface({
    input: process.stdin,
    output: mutedOutput,
    terminal: true,
  });

  function ask(question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => resolve(answer.trim()));
    });
  }

  function askHidden(question) {
    return new Promise((resolve) => {
      process.stdout.write(question);
      mutedOutput.muted = true;

      rl.question('', (answer) => {
        mutedOutput.muted = false;
        process.stdout.write('\n');
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
