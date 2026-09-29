import { existsSync } from 'node:fs';
import path from 'node:path';
import type { PlaywrightTestConfig } from '@playwright/test';

export const FRONTEND_URL = 'http://127.0.0.1:3100';
export const API_URL = 'http://127.0.0.1:8011/api';

const venvPython = path.resolve(__dirname, '../../backend/.venv/bin/python');
const python = process.env.FLEET_TEST_PYTHON ?? (existsSync(venvPython) ? venvPython : 'python3');

export const webServer: PlaywrightTestConfig['webServer'] = [
  {
    command: `"${python}" tests/start_backend.py`,
    url: `${API_URL}/`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  {
    command: 'npx next build && npx next start --hostname 127.0.0.1 --port 3100',
    url: FRONTEND_URL,
    env: { NEXT_PUBLIC_API_BASE_URL: API_URL },
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
];
