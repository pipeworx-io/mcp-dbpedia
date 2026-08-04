# @pipeworx/dbpedia

DBpedia MCP — structured knowledge extracted from Wikipedia. SPARQL endpoint + Lookup search. Keyless.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `lookup(query, max_results?, type?)` — DBpedia Lookup search (entity-resolution friendly)
- `sparql(query, format?)` — DBpedia SPARQL endpoint
- `resource(uri)` — fetch all triples about a DBpedia resource
- `abstract(label, lang?)` — fetch English/foreign abstract for a topic

## Data source

- Lookup: `https://lookup.dbpedia.org/api/`
- SPARQL: `https://dbpedia.org/sparql`
- Linked Data: `https://dbpedia.org/resource/<Label>`

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

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

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
