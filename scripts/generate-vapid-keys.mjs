// VAPID key pair banata hai — push notifications ke liye zaroori.
// Chalao: npm run keys
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log("\nYe do lines .env.local me paste karo (aur Vercel ke env vars me bhi):\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log("\nPrivate key kisi ke saath share mat karna.\n");
