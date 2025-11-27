// Script helper để lấy IP address trên Windows
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

const ip = getLocalIP();
console.log('\n========================================');
console.log('🌐 Địa chỉ IP của máy chủ:');
console.log(`   ${ip}`);
console.log('\n📱 Để chơi từ thiết bị khác, truy cập:');
console.log(`   http://${ip}:3000`);
console.log('\n💡 Cập nhật file client/.env với:');
console.log(`   REACT_APP_SOCKET_URL=http://${ip}:1999`);
console.log(`   REACT_APP_API_URL=http://${ip}:1999/api`);
console.log('========================================\n');

