# backend/docs/

El contrato OpenAPI **ya no vive aquí**. La única copia canónica es:

```
contracts/openapi.yaml
```

Todo el tooling apunta ahí: lint (`make contracts-lint`), diff contra `main` (`make contracts-diff`) y codegen de tipos de web (`npm --prefix web run openapi:types`). Ver `ADR-0003` (docs/architecture/adr/).

*Copia duplicada retirada en #1385 — no recrearla.*
