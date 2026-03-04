export const createRoleMiddleware = (allowedRoles) => {
  const roles = new Set(allowedRoles);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!roles.has(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden for current role',
      });
    }

    return next();
  };
};
