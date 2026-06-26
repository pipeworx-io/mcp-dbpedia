# mcp-dbpedia

DBpedia MCP — SPARQL + Lookup over Wikipedia-derived structured data

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 965+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `lookup` | DBpedia Lookup search — find entities by label or alias. |
| `sparql` | Execute a SPARQL query against the DBpedia public endpoint. |
| `resource` | Fetch all triples about a DBpedia resource. |
| `abstract` | Fetch a prose summary for a topic label (e.g. "Eiffel Tower") using Wikipedia\'s REST summary endpoint as fallback; returns title, extract text, and source URL. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "dbpedia": {
      "url": "https://gateway.pipeworx.io/dbpedia/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 965+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Dbpedia data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [All tools and guides](https://github.com/pipeworx-io/examples)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
