import { appendJsonArray, dataFile, readJson, writeJson } from '../lib/store.js';
import { createCli, nowIso, randomCode } from '../lib/cli.js';
import { pathToFileURL } from 'node:url';

function createDefaultCli() {
  return createCli('Host Despacho');
}

const shipmentsFile = () => dataFile('shipments.json');
const eventsFile = () => dataFile('events.json');

export async function registrarEnvio(cliInstance) {
  const remitente = await cliInstance.ask('Remitente: ');
  const destinatario = await cliInstance.ask('Destinatario: ');
  const tracking = randomCode('TRK');

  const shipment = {
    tracking,
    remitente,
    destinatario,
    estado: 'REGISTRADO',
    updatedAt: nowIso(),
  };

  await appendJsonArray(shipmentsFile(), shipment);
  await appendJsonArray(eventsFile(), {
    type: 'shipment.created',
    tracking,
    source: 'despacho',
    at: nowIso(),
  });

  console.log(`\n✔ Envío registrado: ${tracking}\n`);
}

export async function liberarMercancia(cliInstance) {
  const tracking = await cliInstance.ask('Tracking a liberar: ');
  const shipments = await readJson(shipmentsFile(), []);
  const index = shipments.findIndex((s) => s.tracking === tracking);

  if (index < 0) {
    console.log('\n✖ No existe ese tracking.\n');
    return;
  }

  shipments[index].estado = 'LIBERADO';
  shipments[index].updatedAt = nowIso();

  await writeJson(shipmentsFile(), shipments);
  await appendJsonArray(eventsFile(), {
    type: 'shipment.released',
    tracking,
    source: 'despacho',
    at: nowIso(),
  });

  console.log(`\n✔ Mercancía liberada para ${tracking}.\n`);
}

export async function listarEnvios() {
  const shipments = await readJson(shipmentsFile(), []);

  console.log('\n--- Envíos recientes ---');
  if (shipments.length === 0) {
    console.log('Sin envíos registrados.\n');
    return;
  }

  shipments.slice(-10).forEach((s) => {
    console.log(`${s.tracking} | ${s.estado} | ${s.remitente} -> ${s.destinatario}`);
  });
  console.log();
}

export async function handleOption(option, cliInstance) {
  if (option === '1') await registrarEnvio(cliInstance);
  else if (option === '2') await liberarMercancia(cliInstance);
  else if (option === '3') await listarEnvios();
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
    console.log('1) Registrar envío');
    console.log('2) Liberar mercancía');
    console.log('3) Listar envíos');
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
    console.error('Error en host despacho:', error);
    process.exit(1);
  });
}
