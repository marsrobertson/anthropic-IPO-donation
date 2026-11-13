// Encrypts the data room contents and writes the result into index.html.
//
//   DATAROOM_PASSWORD='a long passphrase' node encrypt-dataroom.mjs dataroom.html
//
// dataroom.html is plain HTML (headings, links, tables). It is listed in .gitignore:
// never commit the plaintext. Only the encrypted blob inside index.html is public.
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const [src = "dataroom.html", target = "index.html"] = process.argv.slice(2);
const password = process.env.DATAROOM_PASSWORD;
if (!password) { console.error("Set DATAROOM_PASSWORD."); process.exit(1); }
if (password.length < 16) console.warn("Warning: short password. The encrypted blob is public, so anyone can try guesses offline. Use 5+ random words.");

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
  base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, readFileSync(src)));
const blob = Buffer.concat([salt, iv, ct]).toString("base64");

const html = readFileSync(target, "utf8");
const re = /const DATA_ROOM = "[^"]*";/;
if (!re.test(html)) { console.error(`No DATA_ROOM constant found in ${target}.`); process.exit(1); }
writeFileSync(target, html.replace(re, () => `const DATA_ROOM = "${blob}";`));
console.log(`Encrypted ${src} into ${target} (${blob.length} base64 chars).`);
