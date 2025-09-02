/**
 * 영어 대화 관리 시스템 시작 스크립트
 * 
 * 이 스크립트는 TypeScript 컴파일 없이 ts-node를 사용하여 서버를 시작합니다.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 환경 변수 로드
require('dotenv').config();

console.log('영어 대화 관리 시스템 시작 중...');

// ts-node로 서버 시작
const server = spawn('npx', ['ts-node', 'src/server.ts'], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  if (code !== 0) {
    console.error(`서버가 코드 ${code}로 종료되었습니다.`);
    process.exit(code);
  }
});

// 종료 시그널 처리
process.on('SIGINT', () => {
  console.log('서버 종료 중...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('서버 종료 중...');
  server.kill('SIGTERM');
});