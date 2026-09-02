const jwt = require('jsonwebtoken');

/**
 * Express middleware that verifies a Bearer JWT in the Authorization header.
 * Returns 401 if the token is missing or invalid.
 * Sets req.admin = { email, role, id, ... }
 */
function verifyJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Also accept ?token= for direct browser download links (can't set headers)
  const queryToken = req.query.token;

  let token;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (queryToken) {
    token = queryToken;
  } else {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // { id, email, name, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Must be used after verifyJWT.
 * Returns 403 if the logged-in admin is not a superadmin.
 */
function requireSuperAdmin(req, res, next) {
  if (req.admin?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
}

module.exports = { verifyJWT, requireSuperAdmin };
