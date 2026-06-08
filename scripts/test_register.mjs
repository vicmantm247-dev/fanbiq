const email = `testuser-${Date.now()}@example.com`;
const body = { email, username: `testuser${Date.now()}`, password: 'Password123!' };
const res = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
console.log('STATUS', res.status);
const text = await res.text();
console.log(text);
