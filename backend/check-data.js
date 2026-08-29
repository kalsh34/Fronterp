const http = require('http');

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: '127.0.0.1', port: 5000, path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(buf); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const login = await api('POST', '/api/auth/login', { email: 'admin@vitalpayroll.com', password: 'password123' });
  const token = login.data.token;

  const endpoints = [
    '/api/dashboard/stats',
    '/api/employees?limit=5',
    '/api/sites?limit=5',
    '/api/guards',
    '/api/payroll/periods',
    '/api/staff-attendance/grid?year=2026&month=8',
  ];

  for (const ep of endpoints) {
    const res = await api('GET', ep, null, token);
    const data = res.data;
    if (data && typeof data === 'object') {
      if (data.pagination) {
        console.log(ep + ' => ' + data.pagination.total + ' total records');
      } else if (Array.isArray(data)) {
        console.log(ep + ' => ' + data.length + ' items');
      } else if (data.totalEmployees !== undefined) {
        console.log(ep + ' => employees:' + data.totalEmployees + ' sites:' + data.totalSites + ' guards:' + data.activeGuardsOnSite + ' approvals:' + data.pendingApprovals);
      } else {
        console.log(ep + ' => keys: ' + Object.keys(data).join(', '));
      }
    } else {
      console.log(ep + ' => ' + JSON.stringify(res).substring(0, 100));
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
