/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import ch from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { getEnvVar } from '#env/env';

import { FirebaseKey } from '../../Firebase.js';

// eslint-disable-next-line no-template-curly-in-string
const template = '<!doctypehtml><html lang=en><meta charset=UTF-8><script src=https://www.gstatic.com/firebasejs/10.7.0/firebase-compat.js></script><style>body{background:#000;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Open Sans","Helvetica Neue",sans-serif}main{display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;margin-top:3rem}#b{display:flex;align-items:center;gap:10px;font-weight:700;border:1px solid #fff;border-radius:3px;padding:10px 20px;cursor:pointer}</style><main><div id=b onclick=g()><svg height=24 viewBox="0 0 24 24"width=24 xmlns=http://www.w3.org/2000/svg><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"fill=#4285F4 /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"fill=#34A853 /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"fill=#FBBC05 /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"fill=#EA4335 /><path d="M1 1h22v22H1z"fill=none /></svg> Login With Google</div><span id=s style=display:none;margin-top:20px;color:#0f0>Login successful! You can now close this window.</span></main><script>const email="__EMAIL__";firebase.initializeApp({apiKey:"' + FirebaseKey + '",authDomain:"shellshockio-181719.firebaseapp.com",databaseURL:"https://shellshockio-181719.firebaseio.com",projectId:"shellshockio-181719",storageBucket:"shellshockio-181719.appspot.com",messagingSenderId:"68327206324"});const auth=firebase.auth(),g=()=>{var e=new firebase.auth.GoogleAuthProvider;auth.signInWithPopup(e).then(o=>o.user.getIdToken().then(e=>email&&o.user.email!==email?(alert(`you called loginWithGoogle with the email ${email}, but you logged in with ${o.user.email} - try again with the correct email`),auth.signOut()):void fetch("/submit-token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:e,idTokenExpires:o.user._delegate.stsTokenManager.expirationTime,refreshToken:o.user.refreshToken,localId:o.user.uid,email:o.user.email})}).then(e=>e.json()).then(e=>{e.ok?(document.querySelector("#s").style.display="",window.close()):alert("login failed on the server: "+e.error)}).catch(e=>alert("Error sending token to server: "+e)))).catch(e=>alert(e.message))}</script>';

export const loginWithGoogle = async (requiredEmail?: string, open = true): Promise<{
    ok: true,
    idToken: string,
    refreshToken: string,
    localId: string
} | { ok: false }> => new Promise<{
    ok: true,
    idToken: string,
    refreshToken: string,
    localId: string
} | { ok: false }>((resolve) => {
    const yolkbotCache = path.join(os.homedir(), '.yolkbot');
    if (!fs.existsSync(yolkbotCache)) fs.mkdirSync(yolkbotCache);

    const accountCache = path.join(yolkbotCache, 'accounts');
    if (!fs.existsSync(accountCache)) fs.mkdirSync(accountCache);

    if (requiredEmail) {
        const safeEmail = requiredEmail?.replace(/[^a-z0-9@._-]/gi, '_');
        const accountFile = path.join(accountCache, `${safeEmail}.json`);

        if (fs.existsSync(accountFile)) {
            const data = JSON.parse(fs.readFileSync(accountFile, 'utf-8'));
            const isTokenExpired = data.idTokenExpires && Date.now() > data.idTokenExpires;
            if (data.refreshToken && data.localId)
                return resolve({ ok: true, idToken: isTokenExpired ? null : data.idToken, refreshToken: data.refreshToken, localId: data.localId });
        }
    }

    const server = http.createServer((req, res) => {
        if (req.url === '/') {
            res.setHeader('Content-Type', 'text/html');
            res.end(template.replace('__EMAIL__', requiredEmail ?? ''));
        } else if (req.url === '/submit-token' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (!data.idToken || !data.refreshToken || !data.localId) throw new Error('missing fields in token data');

                    const cleanEmail = data.email?.toString().replace(/[^a-z0-9@._-]/gi, '_') ?? '';
                    if (cleanEmail && !getEnvVar('YOLKBOT_NO_GOOGLE_CACHE')) {
                        const accountFile = path.join(accountCache, `${cleanEmail}.json`);
                        fs.writeFileSync(accountFile, JSON.stringify(data, null, 4), { flag: 'w+' });
                    }

                    resolve({ ok: true, idToken: data.idToken, refreshToken: data.refreshToken, localId: data.localId });

                    res.end(JSON.stringify({ ok: true }));
                    server.close();
                } catch (e) {
                    console.error(e);
                    resolve({ ok: false });
                    res.end(JSON.stringify({ ok: false }));
                }
            });
        } else {
            res.statusCode = 404;
            res.end('not found');
        }
    });

    server.listen(0, () => {
        const port = (server.address() as any).port;

        console.log(`loginWithGoogle: to complete Google login, visit http://localhost:${port}`);

        if (open) {
            const command = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
            ch.exec(`${command} http://localhost:${port}`);
        }
    });
});