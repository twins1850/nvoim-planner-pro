import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { logWithContext } from './logger';

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);

/**
 * Security assessment utility for evaluating application security
 */
export class SecurityAssessment {
  /**
   * Security patterns to check
   */
  private readonly securityPatterns = {
    authentication: [
      /jwt\.sign|sign\(|jsonwebtoken/,
      /bcrypt\.hash|bcrypt\.compare|argon2|pbkdf2/,
      /auth\(|isAuthenticated|requireAuth|verifyToken/
    ],
    authorization: [
      /role[s]?:|user\.role|req\.user\.role|isAdmin|isPlanner/,
      /permissions|can\(|ability|acl/
    ],
    inputValidation: [
      /validate|validator|joi|yup|zod|check\(/,
      /sanitize|escape|xss|purify/
    ],
    apiSecurity: [
      /rateLimit|throttle|limiter/,
      /cors\(|CORS_/,
      /helmet|X-Content|X-Frame|Content-Security-Policy/,
      /csrf|xsrf|csurf/
    ],
    dataProtection: [
      /encrypt|cipher|crypto\./,
      /https:|TLS|SSL|secure:/,
      /mask|hide|redact|sanitize/
    ]
  };

  /**
   * Vulnerability patterns to check
   */
  private readonly vulnerabilityPatterns = {
    critical: [
      /execute\(\s*["'`]|raw\(\s*["'`]|query\(\s*["'`]/, // SQL injection
      /\$where\s*:/, // NoSQL injection
      /exec\(\s*["'`]|spawn\(\s*["'`]|execSync\(\s*["'`]/, // Command injection
      /(password|secret|key|token|auth)\s*[:=]\s*["'`][^\s"'`]+["'`]/, // Hardcoded secrets
      /basic\s+auth|md5\(|sha1\(/ // Insecure auth
    ],
    high: [
      /(password|token|secret|key).*(console\.log|logger)/, // Sensitive logging
      /\.\.\//, // Directory traversal
      /debug\s*[:=]\s*true/, // Debug mode
      /allowUnauthorized\s*[:=]\s*true|validateCertificate\s*[:=]\s*false/ // Insecure defaults
    ],
    medium: [
      /eval\(/, // Eval usage
      /innerHTML|outerHTML/, // Potential XSS
      /document\.write/, // Potential XSS
      /setTimeout\(.*,.*\)/ // Potential code injection
    ]
  };

  /**
   * Perform a basic security assessment
   */
  async performBasicAssessment(): Promise<{
    score: number;
    securityFeatures: string[];
    criticalVulnerabilities: string[];
    highVulnerabilities: string[];
    mediumVulnerabilities: string[];
    recommendations: string[];
  }> {
    try {
      logWithContext('info', 'Performing basic security assessment');
      
      const srcDir = path.join(process.cwd(), 'src');
      const files = await this.getAllFiles(srcDir, ['.ts', '.js']);
      
      // Check for security features
      const securityFeatures: string[] = [];
      const featureMatches: Record<string, string[]> = {};
      
      // Check for vulnerabilities
      const criticalVulnerabilities: string[] = [];
      const highVulnerabilities: string[] = [];
      const mediumVulnerabilities: string[] = [];
      
      // Process each file
      for (const file of files) {
        const content = await readFileAsync(file, 'utf8');
        const relativePath = path.relative(process.cwd(), file);
        
        // Check for security features
        for (const [feature, patterns] of Object.entries(this.securityPatterns)) {
          for (const pattern of patterns) {
            if (pattern.test(content)) {
              if (!securityFeatures.includes(feature)) {
                securityFeatures.push(feature);
              }
              
              if (!featureMatches[feature]) {
                featureMatches[feature] = [];
              }
              
              if (!featureMatches[feature].includes(relativePath)) {
                featureMatches[feature].push(relativePath);
              }
              
              break;
            }
          }
        }
        
        // Check for vulnerabilities
        for (const pattern of this.vulnerabilityPatterns.critical) {
          if (pattern.test(content)) {
            criticalVulnerabilities.push(`${relativePath}: ${pattern.toString()}`);
          }
        }
        
        for (const pattern of this.vulnerabilityPatterns.high) {
          if (pattern.test(content)) {
            highVulnerabilities.push(`${relativePath}: ${pattern.toString()}`);
          }
        }
        
        for (const pattern of this.vulnerabilityPatterns.medium) {
          if (pattern.test(content)) {
            mediumVulnerabilities.push(`${relativePath}: ${pattern.toString()}`);
          }
        }
      }
      
      // Calculate security score
      let score = 100;
      
      // Deduct points for missing security features
      const allFeatures = Object.keys(this.securityPatterns);
      const missingFeatures = allFeatures.filter(f => !securityFeatures.includes(f));
      score -= missingFeatures.length * 10;
      
      // Deduct points for vulnerabilities
      score -= criticalVulnerabilities.length * 15;
      score -= highVulnerabilities.length * 10;
      score -= mediumVulnerabilities.length * 5;
      
      // Ensure score is between 0 and 100
      score = Math.max(0, Math.min(100, score));
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      // Recommendations for missing features
      missingFeatures.forEach(feature => {
        switch (feature) {
          case 'authentication':
            recommendations.push('Implement proper authentication using JWT or similar');
            break;
          case 'authorization':
            recommendations.push('Implement role-based access control');
            break;
          case 'inputValidation':
            recommendations.push('Implement input validation and sanitization');
            break;
          case 'apiSecurity':
            recommendations.push('Implement API security measures like rate limiting and CORS');
            break;
          case 'dataProtection':
            recommendations.push('Implement data protection measures like encryption');
            break;
        }
      });
      
      // Recommendations for vulnerabilities
      if (criticalVulnerabilities.length > 0) {
        recommendations.push('Fix critical vulnerabilities immediately');
      }
      
      if (highVulnerabilities.length > 0) {
        recommendations.push('Address high severity vulnerabilities');
      }
      
      // General recommendations
      recommendations.push('Regularly update dependencies to fix security issues');
      recommendations.push('Implement security headers using Helmet');
      recommendations.push('Use HTTPS for all communications');
      
      return {
        score,
        securityFeatures,
        criticalVulnerabilities,
        highVulnerabilities,
        mediumVulnerabilities,
        recommendations
      };
    } catch (error) {
      logWithContext('error', 'Error performing security assessment', { error });
      throw error;
    }
  }

  /**
   * Check for vulnerable dependencies
   */
  async checkVulnerableDependencies(): Promise<{
    vulnerabilities: any[];
    outdatedDependencies: any[];
  }> {
    try {
      logWithContext('info', 'Checking for vulnerable dependencies');
      
      const vulnerabilities: any[] = [];
      const outdatedDependencies: any[] = [];
      
      try {
        // Run npm audit
        const { stdout: auditOutput } = await execAsync('npm audit --json');
        const auditData = JSON.parse(auditOutput);
        
        if (auditData.vulnerabilities) {
          Object.keys(auditData.vulnerabilities).forEach(pkg => {
            const vuln = auditData.vulnerabilities[pkg];
            vulnerabilities.push({
              package: pkg,
              severity: vuln.severity,
              via: vuln.via,
              effects: vuln.effects,
              fixAvailable: vuln.fixAvailable
            });
          });
        }
        
        // Run npm outdated
        const { stdout: outdatedOutput } = await execAsync('npm outdated --json');
        const outdatedData = JSON.parse(outdatedOutput);
        
        Object.keys(outdatedData).forEach(pkg => {
          const data = outdatedData[pkg];
          outdatedDependencies.push({
            package: pkg,
            current: data.current,
            wanted: data.wanted,
            latest: data.latest,
            type: data.type
          });
        });
      } catch (error) {
        logWithContext('warn', 'Could not run npm audit or npm outdated', { error });
      }
      
      return {
        vulnerabilities,
        outdatedDependencies
      };
    } catch (error) {
      logWithContext('error', 'Error checking vulnerable dependencies', { error });
      throw error;
    }
  }

  /**
   * Get all files with specific extensions
   */
  private async getAllFiles(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    async function traverse(directory: string) {
      const entries = await readdirAsync(directory, { withFileTypes: true });
      
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
}

// Export singleton instance
export const securityAssessment = new SecurityAssessment();