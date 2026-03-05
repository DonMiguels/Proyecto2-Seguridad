import { appendJsonArray, dataFile, readJson } from '../lib/store.js';
import { createCli, nowIso, randomCode } from '../lib/cli.js';
import { pathToFileURL } from 'node:url';

const salesFile = () => dataFile('sales.json');
const eventsFile = () => dataFile('events.json');

const catalog = {
  sobre: 55,
  caja_pequena: 120,
  caja_mediana: 180,
  caja_grande: 260,
};

function createDefaultCli() {
  return createCli('Host Mostrador');
}

export async function registrarVenta(cliInstance) {
  const producto = await cliInstance.ask('Producto: ');
  const precioInput = await cliInstance.ask('Precio: ');
  const precio = Number(precioInput);

  if (Number.isNaN(precio) || precio <= 0) {
    console.log('\n✖ Precio inválido.\n');
    return;
  }

  const venta = {
    id: randomCode('SALE'),
    producto,
    precio,
    at: nowIso(),
  };

  await appendJsonArray(salesFile(), venta);
  await appendJsonArray(eventsFile(), {
    type: 'sale.created',
    source: 'mostrador',
    saleId: venta.id,
    at: nowIso(),
  });

  console.log(`\n✔ Venta registrada: ${venta.id}\n`);
}

export async function consultarPrecio(cliInstance) {
  const item = await cliInstance.ask(
    'Artículo (sobre/caja_pequena/caja_mediana/caja_grande): '
  );
  const precio = catalog[item];

  if (!precio) {
    console.log('\n✖ Artículo no encontrado.\n');
    return;
  }

  console.log(`\nPrecio actual de ${item}: $${precio}\n`);
}

export async function listarVentas() {
  const sales = await readJson(salesFile(), []);

  console.log('\n--- Ventas recientes ---');
  if (sales.length === 0) {
    console.log('Sin ventas registradas.\n');
    return;
  }

  sales.slice(-10).forEach((sale) => {
    console.log(`${sale.id} | ${sale.producto} | $${sale.precio} | ${sale.at}`);
  });
  console.log();
}

export async function handleOption(option, cliInstance) {
  if (option === '1') await registrarVenta(cliInstance);
  else if (option === '2') await consultarPrecio(cliInstance);
  else if (option === '3') await listarVentas();
  else if (option === '0') {
    console.log('\nHost en espera. Use Ctrl+p, Ctrl+q para desacoplarse.\n');
  } else {
    console.log('\nOpción inválida.\n');
  }
}

export async function runLoop(
  cliInstance = createDefaultCli(),
  { iterations = Infinity } = {}
) {
  let executed = 0;

  while (executed < iterations) {
    cliInstance.printHeader();
    console.log('1) Registrar venta rápida');
    console.log('2) Consultar precios');
    console.log('3) Listar ventas');
    console.log('0) Mantener host activo (no salir)\n');

    const option = await cliInstance.ask('Opción: ');
    await handleOption(option, cliInstance);

    await cliInstance.ask('Presione Enter para continuar...');
    executed += 1;
  }
}

async function main() {
  process.on('SIGINT', () => {
    console.log('\nUse Ctrl+p, Ctrl+q para desacoplarse sin detener el host.');
  });

  await runLoop();
}

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) {
  main().catch((error) => {
    console.error('Error en host mostrador:', error);
    process.exit(1);
  });
}
