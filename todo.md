# TODO

- [ ] Re-evaluate MCP transport strategy.
  - Current implementation uses `stdio` for fast local integration.
  - This choice is **temporary**.
  - Decide whether to keep `stdio` or move to Streamable HTTP based on target usage (single local user vs shared remote server, security, and operations constraints).
