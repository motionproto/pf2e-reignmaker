const { spawn } = require('child_process');

console.log('Testing spawn with shell: true');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Current directory:', process.cwd());

// Test 1: Simple echo with shell
console.log('\n=== Test 1: Simple echo with shell ===');
try {
  const proc1 = spawn('echo', ['hello world'], {
    shell: true,
    stdio: 'inherit'
  });

  proc1.on('error', (err) => {
    console.error('Test 1 error:', err);
  });

  proc1.on('close', (code) => {
    console.log('Test 1 exited with code:', code);

    // Test 2: npm version
    console.log('\n=== Test 2: npm --version with shell ===');
    const proc2 = spawn('npm', ['--version'], {
      shell: true,
      stdio: 'inherit'
    });

    proc2.on('error', (err) => {
      console.error('Test 2 error:', err);
    });

    proc2.on('close', (code) => {
      console.log('Test 2 exited with code:', code);

      // Test 3: Spawn with cwd change
      console.log('\n=== Test 3: npm with cwd change ===');
      const proc3 = spawn('npm', ['--version'], {
        cwd: '/Users/mark/Documents/repos/reignmaker-sim',
        shell: true,
        stdio: 'inherit'
      });

      proc3.on('error', (err) => {
        console.error('Test 3 error:', err);
      });

      proc3.on('close', (code) => {
        console.log('Test 3 exited with code:', code);
        console.log('\n=== All tests completed ===');
      });
    });
  });
} catch (err) {
  console.error('Caught exception:', err);
}
