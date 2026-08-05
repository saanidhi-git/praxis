
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { env } from '../../config/env.js';

export interface ExecutionResult {
  passed: number;
  total: number;
  status: 'ok' | 'error' | 'timeout';
  stderr: string;
  runtimeMs: number;
  truncated: boolean;
}

export interface ExecutionRequest {
  source: string;
  tests: string[];
  timeoutMs?: number;
}

export interface CodeExecutor {
  readonly name: string;
  run(req: ExecutionRequest): Promise<ExecutionResult>;
}

const HARNESS = (tests: string[]) => `
import json, sys, io, contextlib

_TESTS = ${JSON.stringify(tests)}

def _main():
    passed = 0
    for t in _TESTS:
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                exec(t, {"solve": solve})
            passed += 1
        except Exception:
            pass
    sys.stderr.write(json.dumps({"passed": passed, "total": len(_TESTS)}))

_main()
`;

class SubprocessExecutor implements CodeExecutor {
  readonly name = 'subprocess';

  async run(req: ExecutionRequest): Promise<ExecutionResult> {
    const timeout = req.timeoutMs ?? env.EXECUTOR_TIMEOUT_MS;
    const dir = await mkdtemp(join(tmpdir(), 'praxis-exec-'));
    const file = join(dir, 'main.py');

    await writeFile(file, `${req.source}\n${HARNESS(req.tests)}`, 'utf8');

    const started = Date.now();

    return new Promise<ExecutionResult>((resolve) => {
      const child = spawn('python', ['-I', '-B', file], {
        cwd: dir,
        env: {
          PATH: process.env.PATH ?? '',
          SYSTEMROOT: process.env.SYSTEMROOT ?? '',
          PYTHONDONTWRITEBYTECODE: '1',
          PYTHONHASHSEED: '0',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      let truncated = false;
      let settled = false;

      const cap = env.EXECUTOR_MAX_OUTPUT_BYTES;

      const collect = (buf: Buffer, into: 'out' | 'err') => {
        const s = buf.toString();
        if (into === 'out') {
          if (stdout.length + s.length > cap) {
            truncated = true;
            child.kill('SIGKILL');
            return;
          }
          stdout += s;
        } else {
          if (stderr.length + s.length > cap) {
            truncated = true;
            child.kill('SIGKILL');
            return;
          }
          stderr += s;
        }
      };

      child.stdout.on('data', (b: Buffer) => collect(b, 'out'));
      child.stderr.on('data', (b: Buffer) => collect(b, 'err'));

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill('SIGKILL');
        resolve({
          passed: 0,
          total: req.tests.length,
          status: 'timeout',
          stderr: `Execution exceeded ${timeout}ms and was terminated.`,
          runtimeMs: timeout,
          truncated,
        });
        void rm(dir, { recursive: true, force: true });
      }, timeout);

      child.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          passed: 0, total: req.tests.length, status: 'error',
          stderr: `Could not start interpreter: ${err.message}`,
          runtimeMs: Date.now() - started, truncated,
        });
        void rm(dir, { recursive: true, force: true });
      });

      child.on('close', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        void rm(dir, { recursive: true, force: true });

        const match = /\{"passed":\s*\d+,\s*"total":\s*\d+\}/.exec(stderr);
        if (match) {
          const parsed = JSON.parse(match[0]) as { passed: number; total: number };
          resolve({
            passed: parsed.passed,
            total: parsed.total,
            status: 'ok',
            stderr: stderr.replace(match[0], '').slice(0, 2000),
            runtimeMs: Date.now() - started,
            truncated,
          });
          return;
        }

        resolve({
          passed: 0, total: req.tests.length, status: 'error',
          stderr: stderr.slice(0, 2000) || 'Execution failed with no output.',
          runtimeMs: Date.now() - started, truncated,
        });
      });
    });
  }
}

class DockerExecutor implements CodeExecutor {
  readonly name = 'docker';
  async run(): Promise<ExecutionResult> {
    throw new Error(
      'Docker adapter not available on this host. Intended flags: ' +
        '--network=none --read-only --user=nobody --pids-limit=64 ' +
        '--memory=128m --cpus=0.5 --security-opt=no-new-privileges. ' +
        'For untrusted code prefer gVisor or a Firecracker microVM.',
    );
  }
}

export function getExecutor(): CodeExecutor {
  return env.EXECUTOR_ADAPTER === 'docker'
    ? new DockerExecutor()
    : new SubprocessExecutor();
}
