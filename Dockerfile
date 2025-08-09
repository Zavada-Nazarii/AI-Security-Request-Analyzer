# Next.js + SQLite (better-sqlite3) friendly Dockerfile using npm only

FROM node:20-alpine AS base
WORKDIR /app
# Native build deps for better-sqlite3
RUN apk add --no-cache libc6-compat python3 make g++

# 1) Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json ./

# Auto-patch package.json:
# - remove invalid "node:*" deps
# - pin compatible versions (React 18 to satisfy peers like vaul)
# - ensure AI SDK providers and Zod present
# - remove old lockfiles
RUN node -e "\
const fs=require('fs');\
const path='./package.json';\
const p=JSON.parse(fs.readFileSync(path,'utf8'));\
p.name=p.name||'sec-analyzer-app';\
p.private=true;\
p.scripts=p.scripts||{};\
p.scripts.dev=p.scripts.dev||'next dev -p 3000';\
p.scripts.build=p.scripts.build||'next build';\
p.scripts.start=p.scripts.start||'next start -p 3000';\
p.scripts.lint=p.scripts.lint||'next lint';\
p.dependencies=p.dependencies||{};\
delete p.dependencies['node:fs'];\
delete p.dependencies['node:path'];\
p.dependencies['react']='18.3.1';\
p.dependencies['react-dom']='18.3.1';\
p.dependencies['next']='15.2.4';\
p.dependencies['@ai-sdk/xai']='^2.0.3';\
p.dependencies['@ai-sdk/openai']='^2.0.3';\
p.dependencies['zod']='^3.25.76';\
p.dependencies['ai']=p.dependencies['ai']||'^3.4.0';\
p.dependencies['bcryptjs']=p.dependencies['bcryptjs']||'^2.4.3';\
p.dependencies['better-sqlite3']=p.dependencies['better-sqlite3']||'^11.5.0';\
p.dependencies['jose']=p.dependencies['jose']||'^5.6.3';\
p.dependencies['lucide-react']=p.dependencies['lucide-react']||'^0.454.0';\
p.dependencies['recharts']=p.dependencies['recharts']||'^2.12.7';\
p.dependencies['tailwind-merge']=p.dependencies['tailwind-merge']||'^2.5.5';\
p.dependencies['tailwindcss-animate']=p.dependencies['tailwindcss-animate']||'^1.0.7';\
p.dependencies['geist']=p.dependencies['geist']||'^1.3.1';\
fs.writeFileSync(path, JSON.stringify(p,null,2));\
console.log('Patched package.json:\\n', JSON.stringify(p,null,2));\
" \
 && rm -f package-lock.json pnpm-lock.yaml yarn.lock

RUN npm install

# 2) Build
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Auto-fix routing conflicts: move legacy /login and /logout route handlers to /api/*
RUN node -e "\
const fs=require('fs'); const path=require('path');\
function move(from,to){ if(fs.existsSync(from)){ fs.mkdirSync(path.dirname(to), {recursive:true}); fs.renameSync(from,to); console.log('Moved',from,'->',to);} }\
move('app/login/route.ts','app/api/login/route.ts');\
move('app/login/route.js','app/api/login/route.js');\
move('app/logout/route.ts','app/api/logout/route.ts');\
move('app/logout/route.js','app/api/logout/route.js');\
"

RUN npm run build

# 3) Runtime
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p /app/data
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
