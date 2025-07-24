const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('./logger');

const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900, // 15 minutes in seconds
});

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: secs
    });
  }
};

module.exports = rateLimiterMiddleware;