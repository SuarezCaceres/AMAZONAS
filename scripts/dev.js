const { spawn } = require('child_process');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '🚀 Iniciando entorno de desarrollo AMAZONAS...');

// 1. Ejecutar npm install automático en el frontend
console.log('\x1b[33m%s\x1b[0m', '📦 Validando dependencias del Frontend (npm install)...');
const install = spawn('npm', ['install'], { cwd: path.join(__dirname, '../src/frontend'), shell: true, stdio: 'inherit' });

install.on('close', (code) => {
  if (code !== 0) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error al instalar dependencias de frontend.');
    process.exit(code);
  }

  console.log('\x1b[32m%s\x1b[0m', '✅ Dependencias del Frontend listas.');

  // 2. Levantar Angular
  console.log('\x1b[35m%s\x1b[0m', '🌐 Iniciando servidor de Frontend (Angular)...');
  const frontend = spawn('npm', ['start'], { cwd: path.join(__dirname, '../src/frontend'), shell: true });
  pipeLogs(frontend, 'Angular', '\x1b[36m'); // Cyan para Angular

  // 3. Levantar Spring Boot
  console.log('\x1b[35m%s\x1b[0m', '☕ Iniciando servidor de Backend (Spring Boot)...');
  const backend = spawn('mvnw.cmd', ['spring-boot:run'], { cwd: path.join(__dirname, '../src/backend'), shell: true });
  pipeLogs(backend, 'Spring ', '\x1b[32m'); // Verde para Spring

  // Asegurar limpieza de puertos al salir con Ctrl+C
  const killAll = () => {
    console.log('\n\x1b[31m%s\x1b[0m', '🛑 Apagando servidores de desarrollo...');
    frontend.kill();
    // En Windows, mvnw corre como árbol de procesos (con java.exe como hijo).
    // Usamos taskkill /F /T para forzar el apagado de todo el árbol y liberar el puerto 8080.
    if (process.platform === 'win32' && backend.pid) {
      spawn('taskkill', ['/pid', backend.pid, '/f', '/t'], { shell: true });
    } else {
      backend.kill();
    }
    process.exit();
  };

  process.on('SIGINT', killAll);
  process.on('SIGTERM', killAll);
});

function pipeLogs(proc, name, color) {
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${color}[${name}]\x1b[0m ${line}`);
      }
    });
  });
  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`\x1b[31m[${name} ERROR]\x1b[0m ${line}`);
      }
    });
  });
}
