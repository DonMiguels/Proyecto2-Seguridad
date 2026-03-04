const DEFAULT_TTL_SECONDS = 300;
const IDEMPOTENCY_HEADER = 'Idempotency-Key';

const buildIdempotencyScope = (req, idempotencyKey) => {
  return `${req.method}:${req.originalUrl}:${idempotencyKey}`;
};

export const createIdempotencyMiddleware = (idempotencyStore, options = {}) => {
  const ttlSeconds = options.ttlSeconds || DEFAULT_TTL_SECONDS;

  return async (req, res, next) => {
    const idempotencyKey = req.get(IDEMPOTENCY_HEADER);

    if (!idempotencyKey) {
      return res.status(400).json({
        error: `${IDEMPOTENCY_HEADER} header is required`,
      });
    }

    const scopedRequestKey = buildIdempotencyScope(req, idempotencyKey);
    const requestAlreadyProcessed = await idempotencyStore.has(scopedRequestKey);

    if (requestAlreadyProcessed) {
      if (req.method === 'POST') {
        return res.status(409).json({
          error: 'Duplicate request detected for provided Idempotency-Key',
        });
      }

      return res.status(200).json({
        mensaje: 'Solicitud duplicada ignorada',
      });
    }

    await idempotencyStore.save(scopedRequestKey, ttlSeconds);
    return next();
  };
};
