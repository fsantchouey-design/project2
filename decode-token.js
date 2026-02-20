const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiZnNhbnRjaG91ZXkiLCJlbWFpbCI6ImZzYW50Y2hvdWV5QGdtYWlsLmNvbSJ9.zdtTelcJVURpBJJWfe0Ce7GYd-1d5a2FoInkcZH91nI';

console.log('Token structure:');
console.log('Number of parts:', token.split('.').length);
console.log('\nDecoded parts:');

token.split('.').forEach((part, i) => {
  try {
    if (i < 2) {
      const decoded = Buffer.from(part, 'base64').toString();
      console.log(`Part ${i+1}:`, decoded);
    } else {
      console.log(`Part ${i+1}: [Signature]`, part);
    }
  } catch (e) {
    console.log(`Part ${i+1}: Could not decode -`, e.message);
  }
});


