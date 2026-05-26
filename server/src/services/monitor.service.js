import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const COMMANDS = {
  cpu: `awk '{print $1}' /proc/loadavg`,
  memory: `free -m | awk 'NR==2{printf "%.1f", $3/$2*100}'`,
  disk: `df -h / | tail -1 | awk '{print $5}' | sed 's/%//'`,
};

function sslCommand(domain) {
  return `echo | openssl s_client -connect ${domain}:443 -servername ${domain} 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null`;
}

async function runCommand(cmd) {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 10000 });
    return stdout.trim();
  } catch {
    return '';
  }
}

function checkCpu(output, config) {
  const load = parseFloat(output);
  if (isNaN(load)) return { status: 'error', value: 0, message: 'Could not read CPU load' };
  const status = load >= config.cpu_critical / 100 ? 'fail' : load >= config.cpu_warning / 100 ? 'warning' : 'pass';
  return { status, value: load, message: `CPU load: ${load.toFixed(2)}` };
}

function checkMemory(output, config) {
  const pct = parseFloat(output);
  if (isNaN(pct)) return { status: 'error', value: 0, message: 'Could not read memory usage' };
  const status = pct >= config.memory_critical ? 'fail' : pct >= config.memory_warning ? 'warning' : 'pass';
  return { status, value: pct, message: `Memory: ${pct.toFixed(1)}% used` };
}

function checkDisk(output, config) {
  const pct = parseFloat(output);
  if (isNaN(pct)) return { status: 'error', value: 0, message: 'Could not read disk usage' };
  const status = pct >= config.disk_critical ? 'fail' : pct >= config.disk_warning ? 'warning' : 'pass';
  return { status, value: pct, message: `Disk: ${pct}% used` };
}

function checkSsl(output, config) {
  if (!output) return { status: 'pass', value: 0, message: 'No SSL domain configured' };
  const match = output.match(/notAfter=(.+)/);
  if (!match) return { status: 'error', value: 0, message: 'Could not read SSL certificate' };
  const expiry = new Date(match[1]);
  const daysLeft = Math.floor((expiry - new Date()) / (1000 * 60 * 60 * 24));
  const status = daysLeft <= 0 ? 'fail' : daysLeft <= config.ssl_critical_days ? 'fail' : daysLeft <= config.ssl_warning_days ? 'warning' : 'pass';
  return { status, value: daysLeft, message: `SSL expires in ${daysLeft} days (${match[1]})` };
}

export async function runChecks(domain) {
  const config = {
    cpu_warning: 70, cpu_critical: 90,
    memory_warning: 80, memory_critical: 90,
    disk_warning: 80, disk_critical: 90,
    ssl_warning_days: 14, ssl_critical_days: 7,
  };

  const [cpuOut, memOut, diskOut, sslOut] = await Promise.all([
    runCommand(COMMANDS.cpu),
    runCommand(COMMANDS.memory),
    runCommand(COMMANDS.disk),
    domain ? runCommand(sslCommand(domain)) : Promise.resolve(''),
  ]);

  return [
    { check_type: 'cpu', ...checkCpu(cpuOut, config) },
    { check_type: 'memory', ...checkMemory(memOut, config) },
    { check_type: 'disk', ...checkDisk(diskOut, config) },
    { check_type: 'ssl', ...checkSsl(sslOut, config) },
  ];
}

export async function checkNeedsAlert(supabase, serverId, checkType) {
  const { data } = await supabase
    .from('alerts')
    .select('id')
    .eq('server_id', serverId)
    .eq('check_type', checkType)
    .eq('status', 'open')
    .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .limit(1);

  return !data || data.length === 0;
}

export async function getOpenAlert(supabase, serverId, checkType) {
  const { data } = await supabase
    .from('alerts')
    .select('id')
    .eq('server_id', serverId)
    .eq('check_type', checkType)
    .eq('status', 'open')
    .limit(1);

  return data?.[0] || null;
}
