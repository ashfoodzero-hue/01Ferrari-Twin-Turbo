// import_wti_1m.mjs — kept for the docs/commands that name it: WTI now runs through the ONE futures importer (import_futures_1m.mjs).
process.argv[2] = 'WTI'
await import('./import_futures_1m.mjs')
