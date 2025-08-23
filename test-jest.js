const { execSync } = require('child_process');

try {
  console.log('Running Jest tests...');
  const result = execSync('npx jest --passWithNoTests --verbose', { 
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log(result);
} catch (error) {
  console.error('Jest test output:');
  console.error(error.stdout);
  console.error(error.stderr);
}
