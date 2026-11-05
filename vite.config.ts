import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
// Public local status uses the same handler as Vercel; no dotenv or secrets are
// loaded into Vite or the browser. Authentication is a separate server script.
const roqquStatus = {
  name: 'roqqu-test-status',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use('/api/demo', async (req, res) => {
      try {
        // @ts-expect-error Server-only handler.
        const {handleDemoRequest}=await import('./server/demo/service.mjs');
        let body='';for await (const chunk of req){body+=chunk;if(body.length>2000000){res.statusCode=413;res.end();return;}}
        const host=req.headers.host||'localhost';
        const response=await handleDemoRequest(new Request('http://'+host+'/api/demo',{method:req.method,headers:req.headers as HeadersInit,...(req.method==='POST'?{body}: {})}));
        res.statusCode=response.status;response.headers.forEach((v:string,k:string)=>res.setHeader(k,v));res.end(await response.text());
      }catch{res.statusCode=503;res.end(JSON.stringify({message:'Persistent storage is unavailable.'}));}
    });
    server.middlewares.use('/api/roqqu', async (req, res) => {
      try {
        // @ts-expect-error Server-only JavaScript module; not part of browser TS.
        const { handleRoqquRequest } = await import('./api/roqqu.mjs');
        const response = await handleRoqquRequest(new Request('http://localhost/api/roqqu'+(req.url?.includes('?')?req.url.slice(req.url.indexOf('?')):''), {method:req.method}));
        res.statusCode=response.status;
        response.headers.forEach((v:string,k:string)=>res.setHeader(k,v));
        res.end(await response.text());
      } catch {res.statusCode=503;res.end(JSON.stringify({status:'error',message:'Connection status is temporarily unavailable.'}));}
    });
  },
};
export default defineConfig({ plugins: [react(), tailwindcss(), roqquStatus] });
