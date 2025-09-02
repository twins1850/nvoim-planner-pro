#!/usr/bin/env node

/**
 * Security Assessment Script
 * 
 * This script performs a comprehensive security assessment of the
 * English Conversation Management system, identifying potential
 * vulnerabilities and recommending security improvements.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// Configuration
const SECURITY_RULES = {
  // Authentication and authorization
  auth: {
    jwtExpiration: true,
    passwordHashing: true,
    authMiddleware: true,
    roleBasedAccess: true
  },
  
  // Input validation
  validation: {
    requestValidation: true,
    sanitization: true,
    fileValidation: true
  },
  
  // API security
  api: {
    rateLimiting: true,
    corsConfig: true,
    csrfProtection: true,
    securityHeaders: true
  },
  
  // Data security
  data: {
    encryptionAtRest: true,
    encryptionInTransit: true,
    dataMinimization: true
  },
  
  // Error handling
  errors: {
    secureLogs: true,
    noSensitiveInfo: true,
    gracefulHandling: true
  },
  
  // Dependency security
  dependencies: {
    vulnerableDependencies: true,
    npmAudit: true
  }
};

// Security patterns to check
const SECURITY_PATTERNS = {
  auth: {
    jwtExpiration: /expiresIn|exp:|JWT_EXPIRATION/,
    passwordHashing: /bcrypt\.hash|bcrypt\.compare|argon2|pbkdf2/,
    authMiddleware: /auth\(|isAuthenticated|requireAuth|verifyToken/,
    roleBasedAccess: /role[s]?:/
  },
  validation: {
    requestValidation: /validate|validator|joi|yup|zod|check\(/,
    sanitization: /sanitize|escape|xss|purify/,
    fileValidation: /mimetype|fileType|allowedTypes/
  },
  api: {
    rateLimiting: /rateLimit|throttle|limiter/,
    corsConfig: /cors\(|CORS_/,
    csrfProtection: /csrf|xsrf|csurf/,
    securityHeaders: /helmet|X-Content|X-Frame|Content-Security-Policy/
  },
  data: {
    encryptionAtRest: /encrypt|cipher|crypto\./,
    encryptionInTransit: /https:|TLS|SSL|secure:/,
    dataMinimization: /select\(|projection|fields:/
  },
  errors: {
    secureLogs: /logger\.|log\.|console\.error/,
    noSensitiveInfo: /mask|hide|redact|sanitize/,
    gracefulHandling: /try\s*{|catch\s*\(|errorHandler/
  }
};

// Vulnerability patterns to check
const VULNERABILITY_PATTERNS = {
  // Injection vulnerabilities
  injection: {
    sql: /execute\(\s*["'`]|raw\(\s*["'`]|query\(\s*["'`]/,
    nosql: /\$where\s*:/,
    command: /exec\(\s*["'`]|spawn\(\s*["'`]|execSync\(\s*["'`]/
  },
  
  // Authentication vulnerabilities
  auth: {
    hardcodedSecrets: /(password|secret|key|token|auth)\s*[:=]\s*["'`][^\s"'`]+["'`]/,
    insecureAuth: /basic\s+auth|md5\(|sha1\(/
  },
  
  // Data exposure
  exposure: {
    sensitiveLogging: /(password|token|secret|key).*(console\.log|logger)/,
    directoryTraversal: /\.\.\//
  },
  
  // Misconfiguration
  config: {
    debugMode: /debug\s*[:=]\s*true/,
    insecureDefaults: /allowUnauthorized\s*[:=]\s*true|validateCertificate\s*[:=]\s*false/
  }
};

// Main function
async function main() {
  console.log('=== English Conversation Management System ===');
  console.log('Security Assessment Script');
  console.log('=========================================\n');
  
  try {
    // Step 1: Scan source code for security patterns
    console.log('Step 1: Scanning source code for security patterns...');
    const securityResults = await scanSourceCode();
    
    // Step 2: Check for vulnerable dependencies
    console.log('\nStep 2: Checking for vulnerable dependencies...');
    const dependencyResults = await checkDependencies();
    
    // Step 3: Analyze authentication and authorization
    console.log('\nStep 3: Analyzing authentication and authorization...');
    const authResults = await analyzeAuthentication();
    
    // Step 4: Analyze API security
    console.log('\nStep 4: Analyzing API security...');
    const apiResults = await analyzeApiSecurity();
    
    // Step 5: Generate security report
    console.log('\nStep 5: Generating security assessment report...');
    await generateReport({
      security: securityResults,
      dependencies: dependencyResults,
      auth: authResults,
      api: apiResults
    });
    
    console.log('\nSecurity assessment completed successfully!');
  } catch (error) {
    console.error('\nError during security assessment:', error);
    process.exit(1);
  }
}

// Scan source code for security patterns
async function scanSourceCode() {
  const results = {
    securityPatterns: {
      found: {},
      missing: []
    },
    vulnerabilities: {
      found: []
    },
    fileCount: 0,
    lineCount: 0
  };
  
  // Get all TypeScript and JavaScript files
  const sourceFiles = await getAllFiles(path.join(process.cwd(), 'src'), ['.ts', '.js']);
  results.fileCount = sourceFiles.length;
  
  // Initialize found patterns
  Object.keys(SECURITY_PATTERNS).forEach(category => {
    results.securityPatterns.found[category] = {};
    Object.keys(SECURITY_PATTERNS[category]).forEach(pattern => {
      results.securityPatterns.found[category][pattern] = [];
    });
  });
  
  // Scan each file
  for (const file of sourceFiles) {
    const content = await readFile(file, 'utf8');
    const lines = content.split('\n');
    results.lineCount += lines.length;
    
    // Check for security patterns
    Object.keys(SECURITY_PATTERNS).forEach(category => {
      Object.keys(SECURITY_PATTERNS[category]).forEach(pattern => {
        const regex = SECURITY_PATTERNS[category][pattern];
        if (regex.test(content)) {
          results.securityPatterns.found[category][pattern].push(file);
        }
      });
    });
    
    // Check for vulnerabilities
    Object.keys(VULNERABILITY_PATTERNS).forEach(category => {
      Object.keys(VULNERABILITY_PATTERNS[category]).forEach(pattern => {
        const regex = VULNERABILITY_PATTERNS[category][pattern];
        if (regex.test(content)) {
          // Find line numbers
          const matches = [];
          lines.forEach((line, i) => {
            if (regex.test(line)) {
              matches.push({
                line: i + 1,
                content: line.trim()
              });
            }
          });
          
          if (matches.length > 0) {
            results.vulnerabilities.found.push({
              file,
              category,
              pattern,
              matches
            });
          }
        }
      });
    });
  }
  
  // Identify missing security patterns
  Object.keys(SECURITY_RULES).forEach(category => {
    Object.keys(SECURITY_RULES[category]).forEach(pattern => {
      if (SECURITY_RULES[category][pattern] && 
          (!results.securityPatterns.found[category] || 
           !results.securityPatterns.found[category][pattern] ||
           results.securityPatterns.found[category][pattern].length === 0)) {
        results.securityPatterns.missing.push({
          category,
          pattern
        });
      }
    });
  });
  
  return results;
}

// Check for vulnerable dependencies
async function checkDependencies() {
  const results = {
    vulnerabilities: [],
    outdatedDependencies: [],
    totalDependencies: 0
  };
  
  try {
    // Run npm audit
    const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
    const auditData = JSON.parse(auditOutput);
    
    if (auditData.vulnerabilities) {
      Object.keys(auditData.vulnerabilities).forEach(pkg => {
        const vuln = auditData.vulnerabilities[pkg];
        results.vulnerabilities.push({
          package: pkg,
          severity: vuln.severity,
          via: vuln.via,
          effects: vuln.effects,
          fixAvailable: vuln.fixAvailable
        });
      });
    }
    
    // Run npm outdated
    const outdatedOutput = execSync('npm outdated --json', { encoding: 'utf8' });
    const outdatedData = JSON.parse(outdatedOutput);
    
    Object.keys(outdatedData).forEach(pkg => {
      const data = outdatedData[pkg];
      results.outdatedDependencies.push({
        package: pkg,
        current: data.current,
        wanted: data.wanted,
        latest: data.latest,
        type: data.type
      });
    });
    
    // Get total dependencies
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};
    results.totalDependencies = Object.keys(dependencies).length + Object.keys(devDependencies).length;
  } catch (error) {
    console.warn('Warning: Could not run npm audit or npm outdated:', error.message);
  }
  
  return results;
}

// Analyze authentication and authorization
async function analyzeAuthentication() {
  const results = {
    jwtImplementation: {
      found: false,
      secure: false,
      files: []
    },
    passwordHashing: {
      found: false,
      secure: false,
      algorithm: null,
      files: []
    },
    authMiddleware: {
      found: false,
      roleChecks: false,
      files: []
    }
  };
  
  // Look for JWT implementation
  const jwtFiles = await findFiles(path.join(process.cwd(), 'src'), /jwt|token|auth/);
  
  for (const file of jwtFiles) {
    const content = await readFile(file, 'utf8');
    
    // Check JWT implementation
    if (/jwt\.sign|sign\(|jsonwebtoken/.test(content)) {
      results.jwtImplementation.found = true;
      results.jwtImplementation.files.push(file);
      
      // Check if JWT implementation is secure
      if (/expiresIn|exp:|JWT_EXPIRATION/.test(content) && 
          !/algorithm:\s*['"]HS256['"]/.test(content) &&
          !/algorithm:\s*['"]none['"]/.test(content)) {
        results.jwtImplementation.secure = true;
      }
    }
    
    // Check password hashing
    if (/bcrypt\.hash|bcrypt\.compare|argon2|pbkdf2/.test(content)) {
      results.passwordHashing.found = true;
      results.passwordHashing.files.push(file);
      
      // Determine hashing algorithm
      if (/bcrypt/.test(content)) {
        results.passwordHashing.algorithm = 'bcrypt';
        results.passwordHashing.secure = true;
      } else if (/argon2/.test(content)) {
        results.passwordHashing.algorithm = 'argon2';
        results.passwordHashing.secure = true;
      } else if (/pbkdf2/.test(content)) {
        results.passwordHashing.algorithm = 'pbkdf2';
        results.passwordHashing.secure = true;
      } else if (/crypto\.scrypt/.test(content)) {
        results.passwordHashing.algorithm = 'scrypt';
        results.passwordHashing.secure = true;
      } else if (/md5|sha1/.test(content)) {
        results.passwordHashing.algorithm = 'insecure';
        results.passwordHashing.secure = false;
      }
    }
    
    // Check auth middleware
    if (/auth\(|isAuthenticated|requireAuth|verifyToken/.test(content)) {
      results.authMiddleware.found = true;
      results.authMiddleware.files.push(file);
      
      // Check for role-based access control
      if (/role[s]?:|user\.role|req\.user\.role|isAdmin|isPlanner/.test(content)) {
        results.authMiddleware.roleChecks = true;
      }
    }
  }
  
  return results;
}

// Analyze API security
async function analyzeApiSecurity() {
  const results = {
    rateLimiting: {
      found: false,
      files: []
    },
    cors: {
      found: false,
      secure: false,
      files: []
    },
    securityHeaders: {
      found: false,
      headers: [],
      files: []
    },
    inputValidation: {
      found: false,
      files: []
    }
  };
  
  // Look for server configuration files
  const serverFiles = await findFiles(path.join(process.cwd(), 'src'), /server|app|index|config/);
  
  for (const file of serverFiles) {
    const content = await readFile(file, 'utf8');
    
    // Check rate limiting
    if (/rateLimit|throttle|limiter/.test(content)) {
      results.rateLimiting.found = true;
      results.rateLimiting.files.push(file);
    }
    
    // Check CORS configuration
    if (/cors\(|CORS_/.test(content)) {
      results.cors.found = true;
      results.cors.files.push(file);
      
      // Check if CORS is secure
      if (!/origin:\s*['"]\*['"]/.test(content) && 
          /origin:\s*\[/.test(content)) {
        results.cors.secure = true;
      }
    }
    
    // Check security headers
    if (/helmet|X-Content|X-Frame|Content-Security-Policy/.test(content)) {
      results.securityHeaders.found = true;
      results.securityHeaders.files.push(file);
      
      // Identify headers
      const headerMatches = content.match(/X-[A-Za-z-]+|Content-Security-Policy|Strict-Transport-Security/g);
      if (headerMatches) {
        results.securityHeaders.headers = [...new Set(headerMatches)];
      }
    }
  }
  
  // Check input validation
  const validationFiles = await findFiles(path.join(process.cwd(), 'src'), /valid|middleware|controller/);
  
  for (const file of validationFiles) {
    const content = await readFile(file, 'utf8');
    
    if (/validate|validator|joi|yup|zod|check\(/.test(content)) {
      results.inputValidation.found = true;
      results.inputValidation.files.push(file);
    }
  }
  
  return results;
}

// Generate security report
async function generateReport(results) {
  const reportPath = path.join(process.cwd(), 'security-assessment-report.md');
  
  const report = [
    '# English Conversation Management System',
    '## Security Assessment Report',
    `Generated on: ${new Date().toISOString()}`,
    '',
    '## 1. Executive Summary',
    '',
    `This security assessment analyzed ${results.security.fileCount} files with ${results.security.lineCount} lines of code.`,
    '',
    '### Key Findings:',
    '',
    `- **Security Patterns**: ${Object.keys(results.security.securityPatterns.found).reduce((sum, category) => {
      return sum + Object.keys(results.security.securityPatterns.found[category]).reduce((catSum, pattern) => {
        return catSum + (results.security.securityPatterns.found[category][pattern].length > 0 ? 1 : 0);
      }, 0);
    }, 0)} implemented, ${results.security.securityPatterns.missing.length} missing`,
    `- **Vulnerabilities**: ${results.security.vulnerabilities.found.length} potential issues found`,
    `- **Dependencies**: ${results.dependencies.vulnerabilities.length} vulnerable dependencies, ${results.dependencies.outdatedDependencies.length} outdated packages`,
    '',
    '### Security Score:',
    ''
  ];
  
  // Calculate security score
  const securityScore = calculateSecurityScore(results);
  report.push(`${securityScore.score}/100 (${securityScore.rating})`);
  report.push('');
  
  // Add security patterns section
  report.push('## 2. Security Patterns');
  report.push('');
  
  Object.keys(SECURITY_PATTERNS).forEach(category => {
    report.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    report.push('');
    
    Object.keys(SECURITY_PATTERNS[category]).forEach(pattern => {
      const implemented = results.security.securityPatterns.found[category][pattern].length > 0;
      report.push(`- **${pattern}**: ${implemented ? '✅ Implemented' : '❌ Missing'}`);
      
      if (implemented) {
        report.push(`  - Found in ${results.security.securityPatterns.found[category][pattern].length} files`);
      }
    });
    
    report.push('');
  });
  
  // Add vulnerabilities section
  report.push('## 3. Potential Vulnerabilities');
  report.push('');
  
  if (results.security.vulnerabilities.found.length === 0) {
    report.push('No potential vulnerabilities detected.');
  } else {
    results.security.vulnerabilities.found.forEach((vuln, index) => {
      report.push(`### ${index + 1}. ${vuln.category} - ${vuln.pattern}`);
      report.push('');
      report.push(`**File**: ${vuln.file}`);
      report.push('');
      report.push('**Matches**:');
      vuln.matches.forEach(match => {
        report.push(`- Line ${match.line}: \`${match.content}\``);
      });
      report.push('');
    });
  }
  
  // Add dependencies section
  report.push('## 4. Dependency Analysis');
  report.push('');
  report.push(`Total dependencies: ${results.dependencies.totalDependencies}`);
  report.push('');
  
  if (results.dependencies.vulnerabilities.length === 0) {
    report.push('### No vulnerable dependencies detected.');
  } else {
    report.push('### Vulnerable Dependencies');
    report.push('');
    
    results.dependencies.vulnerabilities.forEach(vuln => {
      report.push(`- **${vuln.package}**: ${vuln.severity} severity`);
      report.push(`  - Fix available: ${vuln.fixAvailable ? 'Yes' : 'No'}`);
    });
  }
  
  report.push('');
  
  if (results.dependencies.outdatedDependencies.length > 0) {
    report.push('### Outdated Dependencies');
    report.push('');
    
    results.dependencies.outdatedDependencies.forEach(dep => {
      report.push(`- **${dep.package}**: ${dep.current} → ${dep.latest}`);
    });
    
    report.push('');
  }
  
  // Add authentication section
  report.push('## 5. Authentication & Authorization');
  report.push('');
  
  report.push('### JWT Implementation');
  if (results.auth.jwtImplementation.found) {
    report.push(`- Status: ✅ Found in ${results.auth.jwtImplementation.files.length} files`);
    report.push(`- Security: ${results.auth.jwtImplementation.secure ? '✅ Secure' : '❌ Potential issues'}`);
  } else {
    report.push('- Status: ❌ Not found');
  }
  report.push('');
  
  report.push('### Password Hashing');
  if (results.auth.passwordHashing.found) {
    report.push(`- Status: ✅ Found in ${results.auth.passwordHashing.files.length} files`);
    report.push(`- Algorithm: ${results.auth.passwordHashing.algorithm}`);
    report.push(`- Security: ${results.auth.passwordHashing.secure ? '✅ Secure' : '❌ Insecure'}`);
  } else {
    report.push('- Status: ❌ Not found');
  }
  report.push('');
  
  report.push('### Authorization');
  if (results.auth.authMiddleware.found) {
    report.push(`- Status: ✅ Found in ${results.auth.authMiddleware.files.length} files`);
    report.push(`- Role-based access: ${results.auth.authMiddleware.roleChecks ? '✅ Implemented' : '❌ Not found'}`);
  } else {
    report.push('- Status: ❌ Not found');
  }
  report.push('');
  
  // Add API security section
  report.push('## 6. API Security');
  report.push('');
  
  report.push('### Rate Limiting');
  if (results.api.rateLimiting.found) {
    report.push(`- Status: ✅ Found in ${results.api.rateLimiting.files.length} files`);
  } else {
    report.push('- Status: ❌ Not found');
  }
  report.push('');
  
  report.push('### CORS Configuration');
  if (results.api.cors.found) {
    report.push(`- Status: ✅ Found in ${results.api.cors.files.length} files`);
    report.push(`- Security: ${results.api.cors.secure ? '✅ Secure' : '❌ Potential issues'}`);
  } else {
    report.push('- Status: ❌ Not found');
  }
  report.push('');
  
  report.push('### Security Headers');
  if (results.api.securityHeaders.found) {
    report.push(`- Status: ✅ Found in ${results.api.securityHeaders.files.length} files`);
    report.push('- Headers:');
    results.api.securityHeaders.headers.forEach(header => {
      report.push(`  - ${header}`);
    });
  } else {
    report.push('- Status: ❌ Not found');
  }
  report.push('');
  
  report.push('### Input Validation');
  if (results.api.inputValidation.found) {
    report.push(`- Status: ✅ Found in ${results.api.inputValidation.files.length} files`);
  } else {
    report.push('- Status: ❌ Not found');
  }
  report.push('');
  
  // Add recommendations section
  report.push('## 7. Recommendations');
  report.push('');
  
  // Add missing security patterns recommendations
  if (results.security.securityPatterns.missing.length > 0) {
    report.push('### Missing Security Patterns');
    report.push('');
    
    results.security.securityPatterns.missing.forEach(missing => {
      report.push(`- Implement ${missing.pattern} in ${missing.category} category`);
    });
    
    report.push('');
  }
  
  // Add vulnerability recommendations
  if (results.security.vulnerabilities.found.length > 0) {
    report.push('### Vulnerability Remediation');
    report.push('');
    
    const vulnTypes = [...new Set(results.security.vulnerabilities.found.map(v => `${v.category}.${v.pattern}`))];
    vulnTypes.forEach(type => {
      const [category, pattern] = type.split('.');
      
      switch (category) {
        case 'injection':
          report.push(`- Fix ${pattern} injection vulnerabilities by using parameterized queries or ORM methods`);
          break;
        case 'auth':
          report.push(`- Remove hardcoded secrets and use environment variables or a secure vault`);
          break;
        case 'exposure':
          report.push(`- Remove sensitive data from logs and implement proper data masking`);
          break;
        case 'config':
          report.push(`- Fix insecure configuration settings and disable debug mode in production`);
          break;
        default:
          report.push(`- Address ${pattern} vulnerabilities in ${category} category`);
      }
    });
    
    report.push('');
  }
  
  // Add dependency recommendations
  if (results.dependencies.vulnerabilities.length > 0) {
    report.push('### Dependency Updates');
    report.push('');
    report.push('Run the following command to fix vulnerable dependencies:');
    report.push('');
    report.push('```bash');
    report.push('npm audit fix');
    report.push('```');
    report.push('');
    
    if (results.dependencies.vulnerabilities.some(v => !v.fixAvailable)) {
      report.push('For dependencies without automatic fixes, consider:');
      report.push('');
      report.push('1. Manually updating to non-vulnerable versions');
      report.push('2. Finding alternative packages');
      report.push('3. Implementing additional security controls to mitigate risks');
    }
    
    report.push('');
  }
  
  // Add general recommendations
  report.push('### General Security Improvements');
  report.push('');
  report.push('1. Implement regular security scanning in CI/CD pipeline');
  report.push('2. Conduct periodic code reviews focused on security');
  report.push('3. Implement a security incident response plan');
  report.push('4. Consider adding a Web Application Firewall (WAF)');
  report.push('5. Implement proper logging and monitoring for security events');
  
  // Write report to file
  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`Report generated at: ${reportPath}`);
}

// Calculate security score
function calculateSecurityScore(results) {
  let score = 100;
  
  // Deduct points for missing security patterns
  score -= results.security.securityPatterns.missing.length * 5;
  
  // Deduct points for vulnerabilities
  score -= results.security.vulnerabilities.found.length * 10;
  
  // Deduct points for vulnerable dependencies
  score -= results.dependencies.vulnerabilities.length * 5;
  
  // Deduct points for authentication issues
  if (!results.auth.jwtImplementation.found || !results.auth.jwtImplementation.secure) {
    score -= 10;
  }
  
  if (!results.auth.passwordHashing.found || !results.auth.passwordHashing.secure) {
    score -= 15;
  }
  
  if (!results.auth.authMiddleware.found || !results.auth.authMiddleware.roleChecks) {
    score -= 10;
  }
  
  // Deduct points for API security issues
  if (!results.api.rateLimiting.found) {
    score -= 5;
  }
  
  if (!results.api.cors.found || !results.api.cors.secure) {
    score -= 5;
  }
  
  if (!results.api.securityHeaders.found) {
    score -= 5;
  }
  
  if (!results.api.inputValidation.found) {
    score -= 10;
  }
  
  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));
  
  // Determine rating
  let rating;
  if (score >= 90) {
    rating = 'Excellent';
  } else if (score >= 80) {
    rating = 'Good';
  } else if (score >= 70) {
    rating = 'Fair';
  } else if (score >= 60) {
    rating = 'Poor';
  } else {
    rating = 'Critical';
  }
  
  return { score, rating };
}

// Helper function to get all files with specific extensions
async function getAllFiles(dir, extensions) {
  const files = [];
  
  async function traverse(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  await traverse(dir);
  return files;
}

// Helper function to find files matching a pattern
async function findFiles(dir, pattern) {
  const files = [];
  
  async function traverse(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  await traverse(dir);
  return files;
}

// Run the script
main().catch(console.error);