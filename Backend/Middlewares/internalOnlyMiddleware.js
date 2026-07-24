export const protectInternal = (req, res, next) => {
  const secretHeader = req.headers['x-internal-secret'];
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  if (!expectedSecret || secretHeader !== expectedSecret) {
    return res.status(403).json({ success: false, message: 'Forbidden: Invalid internal secret' });
  }

  next();
};
