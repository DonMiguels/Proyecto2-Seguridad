import {
  dataFile,
  buildIdempotencyKey,
  getAdminActivity,
  getAdminMetrics,
  getShipmentByTracking,
  readJson,
  updateShipmentStatus,
} from '../lib/store.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createCli } from '../lib/cli.js';
import {
  authenticateCliUser,
  ensureCliRole,
  printOptionsList,
} from '../lib/auth.js';
import { pathToFileURL } from 'node:url';
import {
  SHIPMENT_STATUS,
  SHIPMENT_STATUS_LIST_TEXT,
} from '../../src/shared/config/shipment-status.config.js';

const ADMIN_OPTIONS = [
  '1) Ver métricas globales (DB)',
  '2) Ver actividad reciente (audit)',
  '3) Buscar envío por tracking',
  '4) Forzar estado de envío',
  '6) Filtrar eventos de seguridad por usuario (legacy tests)',
  '7) Exportar eventos de seguridad a CSV (legacy tests)',
  '0) Mantener host activo (no salir)',
];

function createDefaultCli() {
  return createCli('Host Admin Dashboard');
}

export async function obtenerMetricas(session) {
  return getAdminMetrics({ token: session.accessToken });
}

export async function verMetricas(session) {
  const { metricas } = await obtenerMetricas(session);

  console.log('\n=== Métricas Globales ===');
  console.log(`Envíos totales: ${metricas.total}`);
  console.log(`${SHIPMENT_STATUS.REGISTERED}: ${metricas.registrado}`);
  console.log(`${SHIPMENT_STATUS.IN_TRANSIT}: ${metricas.enTransito}`);
  console.log(`${SHIPMENT_STATUS.OUT_FOR_DELIVERY}: ${metricas.enReparto}`);
  console.log(`${SHIPMENT_STATUS.DELIVERED}: ${metricas.entregado}`);
  console.log(`${SHIPMENT_STATUS.CANCELED}: ${metricas.cancelado}\n`);
}

export async function verActividadReciente(session) {
  const { actividad } = await getAdminActivity({
    token: session.accessToken,
    limit: 20,
  });

  console.log('\n=== Actividad Reciente ===');
  if (actividad.length === 0) {
    console.log('Sin actividad registrada aún.\n');
    return;
  }

  actividad.forEach((event) => {
    console.log(
      `${event.fecha_creacion} | ${event.usuario_id} | ${event.accion} | ${event.entidad_id}`
    );
  });
  console.log();
}

export async function buscarTracking(cliInstance, session) {
  const trackingCode = await cliInstance.ask('Código tracking: ');
  const { envio } = await getShipmentByTracking({
    trackingCode,
    token: session.accessToken,
  });

  console.log('\n=== Envío ===');
  console.log(`Tracking: ${envio.codigo_tracking}`);
  console.log(`Estado: ${envio.estado}`);
  console.log(`Remitente: ${envio.remitente}`);
  console.log(`Destinatario: ${envio.destinatario}`);
  console.log();
}

export async function forzarEstado(cliInstance, session) {
  const trackingCode = await cliInstance.ask('Tracking: ');
  const status = await cliInstance.ask(
    `Nuevo estado (${SHIPMENT_STATUS_LIST_TEXT}): `
  );
  const { envio } = await updateShipmentStatus({
    token: session.accessToken,
    trackingCode,
    status,
    idempotencyKey: buildIdempotencyKey(),
  });

  console.log(
    `\n✔ Estado actualizado: ${envio.codigo_tracking} -> ${envio.estado}\n`
  );
}

const getSecurityEvents = async () => {
  return readJson(dataFile('security-events.json'), []);
};

export async function verEventosSeguridad() {
  const events = await getSecurityEvents();
  console.log('\n=== Eventos de Seguridad ===');

  if (events.length === 0) {
    console.log('Sin eventos de seguridad.\n');
    return;
  }

  events.slice(-50).forEach((event) => {
    console.log(
      `${event.at} | ${event.type} | ${event.username || '-'} | ${event.role || '-'} | ${event.reason || '-'} | ${event.action || '-'}`
    );
  });
  console.log();
}

export async function verAutenticacionesFallidas() {
  const events = await getSecurityEvents();
  const filtered = events.filter((event) => event.type === 'authn.failed');

  console.log('\n=== Autenticaciones Fallidas ===');
  filtered.forEach((event) => {
    console.log(`${event.at} | ${event.type} | ${event.username || '-'}`);
  });
  console.log();
}

export async function verDenegacionesPorRol() {
  const events = await getSecurityEvents();
  const filtered = events.filter((event) => event.type === 'authz.denied');

  console.log('\n=== Denegaciones por Rol ===');
  filtered.forEach((event) => {
    console.log(
      `${event.at} | ${event.type} | ${event.username || '-'} | ${event.role || '-'}`
    );
  });
  console.log();
}

export async function verEventosSeguridadPorUsuario(username) {
  const events = await getSecurityEvents();
  const normalizedUsername = String(username || '').trim();
  const filtered = events.filter(
    (event) => event.username === normalizedUsername
  );

  console.log(
    `\n=== Eventos de Seguridad (usuario: ${normalizedUsername}) ===`
  );
  filtered.forEach((event) => {
    console.log(`${event.at} | ${event.type} | ${event.username || '-'}`);
  });
  console.log();
}

export async function exportarEventosSeguridadCsv(filter = 'todos') {
  const events = await getSecurityEvents();
  let filtered = events;

  if (filter === 'fallidos') {
    filtered = events.filter((event) => event.type === 'authn.failed');
  } else if (filter === 'denegaciones') {
    filtered = events.filter((event) => event.type === 'authz.denied');
  }

  const headers = [
    'at',
    'source',
    'type',
    'username',
    'role',
    'reason',
    'action',
  ];
  const lines = [headers.join(',')];

  filtered.forEach((event) => {
    const row = headers.map((header) => {
      const value = event[header] ?? '';
      const sanitized = String(value).replace(/"/g, '""');
      return `"${sanitized}"`;
    });
    lines.push(row.join(','));
  });

  const fileName = `security-events-export-${filter}-${Date.now()}.csv`;
  const filePath = path.join(dataFile('.'), fileName);
  await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf-8');

  return {
    count: filtered.length,
    path: filePath,
  };
}

export async function handleOption(option, session = null, cliInstance = null) {
  const canOperate = await ensureCliRole(session, {
    allowedRoles: ['ADMIN'],
    actionLabel: 'operar en Host Admin',
    hostName: 'admin',
  });

  if (!canOperate && option !== '0') {
    return;
  }

  if (option === '1') {
    await verMetricas(session);
  } else if (option === '2') {
    await verActividadReciente(session);
  } else if (option === '3') {
    await buscarTracking(cliInstance, session);
  } else if (option === '4') {
    await forzarEstado(cliInstance, session);
  } else if (option === '6') {
    const username = await cliInstance.ask('Usuario a filtrar: ');
    await verEventosSeguridadPorUsuario(username);
  } else if (option === '7') {
    const filter = await cliInstance.ask(
      'Filtro (todos/fallidos/denegaciones): '
    );
    const result = await exportarEventosSeguridadCsv(filter || 'todos');
    console.log(`\n=== Exportación CSV ===`);
    console.log(`Registros exportados: ${result.count}`);
    console.log(`Archivo: ${result.path}\n`);
  } else if (option === '0') {
    console.log('\nHost en espera. Use Ctrl+p, Ctrl+q para desacoplarse.\n');
  } else {
    console.log('\nOpción inválida.\n');
  }
}

export async function runLoop(
  cliInstance = createDefaultCli(),
  { iterations = Infinity, session = null } = {}
) {
  let executed = 0;

  while (executed < iterations) {
    cliInstance.printHeader();
    if (session) {
      console.log(`Usuario autenticado: ${session.username} (${session.role})`);
    }
    printOptionsList(ADMIN_OPTIONS);

    const option = await cliInstance.ask('Opción: ');
    try {
      await handleOption(option, session, cliInstance);
    } catch (error) {
      console.log(`\n✖ Error de operación: ${error.message}\n`);
    }

    await cliInstance.ask('Presione Enter para continuar...');
    executed += 1;
  }
}

async function main() {
  process.on('SIGINT', () => {
    console.log('\nUse Ctrl+p, Ctrl+q para desacoplarse sin detener el host.');
  });

  const cliInstance = createDefaultCli();
  const session = await authenticateCliUser(cliInstance, {
    hostName: 'Host Admin Dashboard',
    allowedRoles: ['ADMIN'],
  });

  await runLoop(cliInstance, { session });
}

const isMainModule = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isMainModule) {
  main().catch((error) => {
    console.error('Error en host admin:', error);
    process.exit(1);
  });
}
