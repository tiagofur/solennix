# Dependency upgrades PRs

Header: revisar 27 PRs de Dependabot por breaking changes y mergear en orden: seguridad, patches verdes, bump Node+Go, grupos grandes.

## Specs

- S1: "tenemos muchos PRs de upgrade de dependencia, ayudame a poder revisar si generan problemas por bracking changes o si podemos actualizar y hacer merge o corregir y hacer merge"
- S2: "vamos con tu orden sugerido"
- Orden sugerido: seguridad primero (1228,1268,1266,1237), después patches verdes, después bump Node 20->22 y Go 1.25->1.26, al final grupos 1270,1271,1251.

## Tasks

- T1 (S1,S2, route: merge directo seguridad): 1228 go-archive CVE, 1268 brace-expansion, 1266 nanoid, 1237 js-yaml — commit: merge commits via gh
- T2 (S1,S2, route: merge directo patches verdes): 1282,1281,1280,1279,1277,1257,1254,1236,1233,1240,1248,1264,1274,1261 — commit: merges via gh
- T3 (S1,S2, route: corregir entorno): bump Node 20->22 CI + Go 1.25->1.26 CI/go.mod para desbloquear 1278,1148,1251 — commit: chore(ci): bump node/go
- T4 (S1,S2, route: corregir y merge grupos): 1278 vitest major, 1148 jsdom major, 1224 setup-java, 1270 web group, 1271 android group, 1244 remotion group, 1272 dompurify — commit: merges via gh + fixes
- T5 (S1,S2, route: verificación): CI verde en main tras merges — commit: n/a

## Log

- L1: "tenemos muchos PRs de upgrade de dependencia, ayudame a poder revisar si generan problemas por bracking changes o si podemos actualizar y hacer merge o corregir y hacer merge"
- L2: "vamos con tu orden sugerido"
- L3: 27 PRs abiertos inventariados; CI Node 20 y Go 1.25.x bloquean vitest5/jsdom30/backend-group; fallos gobernanza (Check Issue Reference etc.) no son breaking.
- L4: T1 mergeado y verificado: 1228 (go-archive CVE-2026-17106), 1268 (brace-expansion), 1266 (nanoid), 1237 (js-yaml).
- L5: T2 mergeado y verificado (13 merges + 1274 cerrado obsoleto por dependabot, main ya tenia sys/user 0.4.1): 1282,1281,1280,1279,1277,1257,1254,1236,1233,1240,1264,1261,1248. Rebase via @dependabot para 1248/1261/1274; rerun de gobernanza para 1264.
- L6: T3 commiteado local a2b8b148 en rama chore/ci-bump-node-go (6 archivos, 11+/11-): Node 20->22 (5 pins + web/Dockerfile), Go 1.25->1.26 (3 pins + backend/Dockerfile + go.mod 1.25.8->1.26.0). Sin push (decision del usuario).
- L7: T4 mergeado y verificado: 1270 (web 31 updates), 1244 (remotion), 1238 (npm group), 1278 (vitest 4.1.11 patch, ya no 5.0.5), 1272 (dompurify, con reruns simples tras tormenta de concurrencia). 1224 y 1271 cerrados obsoletos por dependabot (main queda setup-java v5; grupo android se resolvio via #1285 con 35 updates). Quedan 1251 (backend Go, bloqueado a Go 1.26) y 1148 (jsdom 30, bloqueado a Node 22).
- L8: T5 verificado: PR #1287 (issue #1286 con status:approved) MERGED con 16 pass; ramas 1251 y 1148 rebaseadas por dependabot con CI fresco verde y MERGED (1148 entro como jsdom 30.1.2). Cero PRs abiertos de dependencias.
- L9: T6 verificado: runs post-merge en main completed/success (incluye Deploy to production). Limpieza: worktree .worktrees/t3-ci-bump removido y rama local chore/ci-bump-node-go borrada.
