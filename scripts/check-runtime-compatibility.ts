import * as fs from 'fs';
import * as path from 'path';

/**
 * Check runtime compatibility of code improvements
 * This script analyzes potential breaking changes
 */

interface CompatibilityIssue {
  file: string;
  line: number;
  issue: string;
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

const issues: CompatibilityIssue[] = [];

// Check 1: Analyze JSON.parse replacements
console.log('🔍 Checking JSON.parse replacements...\n');
const filesToCheck = [
  'src/services/taskService.ts',
  'src/services/inboxService.ts',
  'src/services/fileService.ts',
  'src/services/notificationService.ts',
];

filesToCheck.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for safeJsonParse usage
      if (line.includes('safeJsonParse')) {
        // Verify import exists
        const hasImport = content.includes("import { safeJsonParse } from '@/utils/jsonHelpers'");
        if (!hasImport) {
          issues.push({
            file,
            line: index + 1,
            issue: 'Missing import for safeJsonParse',
            severity: 'high',
            recommendation: "Add: import { safeJsonParse } from '@/utils/jsonHelpers';"
          });
        }
      }
      
      // Check for remaining unsafe JSON.parse
      if (line.includes('JSON.parse') && !line.includes('safeJsonParse')) {
        issues.push({
          file,
          line: index + 1,
          issue: 'Unsafe JSON.parse still in use',
          severity: 'medium',
          recommendation: 'Replace with safeJsonParse(data, fallbackValue)'
        });
      }
    });
  }
});

// Check 2: TypeScript Compatibility
console.log('🔍 Checking TypeScript compatibility...\n');
const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));

if (tsConfig.compilerOptions.exactOptionalPropertyTypes) {
  console.log('⚠️  Warning: exactOptionalPropertyTypes is enabled');
  console.log('   This may cause issues with Slack SDK and Prisma types\n');
}

// Check 3: Environment Variable Access
console.log('🔍 Checking environment variable access patterns...\n');
const envFile = path.join(process.cwd(), 'src/config/environment.ts');
const envContent = fs.readFileSync(envFile, 'utf-8');

// Check for bracket notation access
const bracketAccessRegex = /process\.env\[['"](\w+)['"]\]/g;
let match;
while ((match = bracketAccessRegex.exec(envContent)) !== null) {
  const varName = match[1];
  if (!envContent.includes(`process.env.${varName}`)) {
    console.log(`  ℹ️  Environment variable ${varName} uses bracket notation (line ~${envContent.substring(0, match.index).split('\n').length})`);
  }
}

// Check 4: Database Query Patterns
console.log('🔍 Checking database query patterns...\n');
const dbFiles = [
  'src/services/taskService.ts',
  'src/services/userService.ts',
];

dbFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for N+1 query patterns
    if (content.includes('.findMany') && content.includes('for (') && content.includes('await')) {
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('await') && line.includes('prisma') && 
            (lines[index - 1]?.includes('for (') || lines[index - 2]?.includes('for ('))) {
          issues.push({
            file,
            line: index + 1,
            issue: 'Potential N+1 query pattern detected',
            severity: 'medium',
            recommendation: 'Consider using include or select with nested relations'
          });
        }
      });
    }
  }
});

// Check 5: Memory Leak Prevention
console.log('🔍 Checking memory leak fixes...\n');
const cleanupFile = path.join(process.cwd(), 'src/services/inboxCleanupService.ts');
if (fs.existsSync(cleanupFile)) {
  const content = fs.readFileSync(cleanupFile, 'utf-8');
  
  if (content.includes('stopCleanup()') && content.includes('clearInterval')) {
    console.log('  ✅ Memory leak fix verified in InboxCleanupService\n');
  } else {
    issues.push({
      file: 'src/services/inboxCleanupService.ts',
      line: 0,
      issue: 'Memory leak fix may be incomplete',
      severity: 'high',
      recommendation: 'Ensure stopCleanup() method clears the interval'
    });
  }
}

// Report Summary
console.log('\n📊 Compatibility Check Summary:');
console.log(`Total Issues Found: ${issues.length}`);

if (issues.length > 0) {
  console.log('\n⚠️  Issues to Address:');
  
  const highSeverity = issues.filter(i => i.severity === 'high');
  const mediumSeverity = issues.filter(i => i.severity === 'medium');
  const lowSeverity = issues.filter(i => i.severity === 'low');
  
  if (highSeverity.length > 0) {
    console.log(`\n🔴 High Severity (${highSeverity.length}):`);
    highSeverity.forEach(issue => {
      console.log(`  - ${issue.file}:${issue.line} - ${issue.issue}`);
      console.log(`    → ${issue.recommendation}`);
    });
  }
  
  if (mediumSeverity.length > 0) {
    console.log(`\n🟡 Medium Severity (${mediumSeverity.length}):`);
    mediumSeverity.forEach(issue => {
      console.log(`  - ${issue.file}:${issue.line} - ${issue.issue}`);
      console.log(`    → ${issue.recommendation}`);
    });
  }
  
  if (lowSeverity.length > 0) {
    console.log(`\n🟢 Low Severity (${lowSeverity.length}):`);
    lowSeverity.forEach(issue => {
      console.log(`  - ${issue.file}:${issue.line} - ${issue.issue}`);
    });
  }
  
  console.log('\n💡 Recommendations:');
  console.log('1. Use tsconfig.development.json for development to avoid strict mode issues');
  console.log('2. Gradually migrate to strict TypeScript settings');
  console.log('3. Test all Slack interactions after applying fixes');
  console.log('4. Monitor for any runtime errors in production');
} else {
  console.log('\n✅ No compatibility issues detected!');
  console.log('The code improvements appear to be safe to deploy.');
}

// Write detailed report
const report = {
  timestamp: new Date().toISOString(),
  issues,
  summary: {
    total: issues.length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  },
  recommendations: [
    'Use development TypeScript config for immediate deployment',
    'Plan phased migration to strict TypeScript',
    'Add comprehensive test coverage before strict mode migration',
    'Monitor application logs after deployment',
  ],
};

fs.writeFileSync(
  path.join(process.cwd(), 'compatibility-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n📄 Detailed report saved to: compatibility-report.json');