import { loginEmployee } from './store.js';

export const printOptionsList = (options) => {
  console.log('\nOpciones disponibles:');
  options.forEach((option) => {
    console.log(`- ${option}`);
  });
  console.log();
};

export const ensureCliRole = async (
  session,
  { allowedRoles = [], actionLabel }
) => {
  if (!session?.accessToken || !session?.role) {
    console.log(`\n✖ Debe autenticarse para ${actionLabel}.\n`);
    return false;
  }

  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return true;
  }

  const roleSet = new Set(allowedRoles.map((role) => role.toUpperCase()));
  if (roleSet.has(session.role)) {
    return true;
  }

  console.log(
    `\n✖ No autorizado para ${actionLabel}. Roles permitidos: ${[
      ...roleSet,
    ].join(', ')}.\n`
  );
  return false;
};

export async function authenticateCliUser(
  cliInstance,
  { hostName, allowedRoles = [], maxAttempts = Infinity, retryDelayMs = 1000 }
) {
  const roleSet = new Set(allowedRoles.map((role) => role.toUpperCase()));
  const finiteAttempts = Number.isFinite(maxAttempts) && maxAttempts > 0;
  let attempt = 1;

  console.log(`\n=== Autenticación requerida para ${hostName} ===`);

  while (true) {
    const username = await cliInstance.ask('Usuario: ');
    const password = cliInstance.askHidden
      ? await cliInstance.askHidden('Contraseña: ')
      : await cliInstance.ask('Contraseña: ');

    try {
      const authResult = await loginEmployee({ username, password });
      const userRole = String(authResult?.user?.role || '').toUpperCase();

      if (roleSet.size > 0 && !roleSet.has(userRole)) {
        console.log(
          `\n✖ Usuario sin permisos para este host (rol requerido: ${[
            ...roleSet,
          ].join(', ')}).\n`
        );
        continue;
      }

      console.log(`\n✔ Sesión iniciada: ${username} (${userRole})\n`);
      return {
        username,
        role: userRole,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
      };
    } catch (error) {
      const attemptLabel = finiteAttempts
        ? `${attempt}/${maxAttempts}`
        : `${attempt}`;
      console.log(
        `\n✖ Error de autenticación (${attemptLabel}): ${error.message}\n`
      );
    }

    if (finiteAttempts && attempt >= maxAttempts) {
      throw new Error('Se agotaron los intentos de autenticación');
    }

    attempt += 1;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
}
