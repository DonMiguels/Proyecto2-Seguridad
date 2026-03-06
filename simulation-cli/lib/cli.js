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

  async function askSelect(options = [], question = 'Seleccione opción: ') {
    if (!options.length) {
      throw new Error('askSelect requiere opciones');
    }

    console.log('\nOpciones disponibles:');

    options.forEach((opt, i) => {
      console.log(`${i + 1}) ${opt}`);
    });

    while (true) {
      const ans = await ask(question);

      const index = Number(ans);

      if (!Number.isNaN(index) && index >= 1 && index <= options.length) {
        return options[index - 1];
      }

      console.log('Opción inválida. Intente nuevamente.');
    }
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
    askSelect,
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