import geoip from 'geoip-lite';

/**
 * Bóc tách thông tin Telemetry từ HTTP Request: IP thực, GeoIP, User-Agent, Giờ Việt Nam
 */
export const extractTelemetry = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  let rawIp = forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || '127.0.0.1');

  // Làm sạch IPv4 mapped to IPv6 (ví dụ: ::ffff:192.168.1.1 -> 192.168.1.1)
  const cleanIp = rawIp.replace(/^::ffff:/, '');

  let location = 'Không xác định / Local';
  try {
    const geo = geoip.lookup(cleanIp);
    if (geo) {
      const parts = [];
      if (geo.city) parts.push(geo.city);
      if (geo.region) parts.push(geo.region);
      if (geo.country) parts.push(geo.country);
      location = parts.join(', ') || 'Việt Nam';
    } else if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) {
      location = 'Môi trường Nội bộ / Local Dev';
    }
  } catch (_) {
    location = 'Không xác định / Local';
  }

  const userAgent = req.headers['user-agent'] || 'Không rõ thiết bị';

  const timeVn = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(new Date());

  return {
    ip: cleanIp,
    location,
    userAgent,
    timeVn,
  };
};
