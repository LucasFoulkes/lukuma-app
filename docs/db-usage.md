# Database Usage Guide

This guide explains how to interact with the database using `psql`.

## Using `psql` (Direct SQL Access)

The standard PostgreSQL client is the only tool you need.

### Connect to the database:
```bash
psql "postgres://postgres.qetmbprouonlipxwvigt:DkuSPd3Wn72tuK1S@aws-1-us-east-1.pooler.supabase.com:6543/postgres"
```

### Run a quick query:
```bash
psql "postgres://postgres.qetmbprouonlipxwvigt:DkuSPd3Wn72tuK1S@aws-1-us-east-1.pooler.supabase.com:6543/postgres" -c "SELECT * FROM usuario;"
```

### Apply schema changes:
If you update `docs/schema.sql`, you can apply it by piping the file to `psql`:
```bash
psql "postgres://postgres.qetmbprouonlipxwvigt:DkuSPd3Wn72tuK1S@aws-1-us-east-1.pooler.supabase.com:6543/postgres" < docs/schema.sql
```
