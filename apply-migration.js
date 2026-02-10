#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

// Read migration SQL
const sql = fs.readFileSync('./supabase/migrations/20260209_fix_message_notification_trigger.sql', 'utf8');

// Supabase configuration (from .env.local)
const SUPABASE_URL = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8';

console.log('🔧 Applying migration: 20260209_fix_message_notification_trigger.sql');
console.log('');
console.log('SQL to execute:');
console.log('----------------------------------------');
console.log(sql);
console.log('----------------------------------------');
console.log('');
console.log('⚠️  Please copy the SQL above and paste it into:');
console.log('   Supabase Dashboard → SQL Editor → New query');
console.log('   https://supabase.com/dashboard/project/ybcjkdcdruquqrdahtga/sql/new');
console.log('');
console.log('Then click "Run" to apply the migration.');
console.log('');
console.log('This will fix the message notification trigger to use the correct column names.');
