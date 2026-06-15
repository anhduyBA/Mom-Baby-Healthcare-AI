import { exec } from "child_process";

exec('netstat -aon | findstr ":5000" | findstr "LISTENING"', (err, stdout, stderr) => {
  if (err) {
    console.log("No process running on port 5000.");
    return;
  }
  const lines = stdout.trim().split("\n");
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid) {
      console.log("Killing PID:", pid);
      exec(`taskkill /f /pid ${pid}`, (killErr, killStdout) => {
        if (killErr) {
          console.error(`Failed to kill process ${pid}:`, killErr);
        } else {
          console.log(`Successfully killed process ${pid}`);
        }
      });
    }
  }
});
