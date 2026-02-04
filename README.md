# AGUI Test Suite

Test suite for OpenSearch AI agents supporting OpenAI and AWS Bedrock models.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run setup + tests
npm start
```

## Configuration

Required in `.env`:
- `OPENSEARCH_ENDPOINT` - OpenSearch instance URL
- `OPENSEARCH_USERNAME` / `OPENSEARCH_PASSWORD` - (Optional) Auth credentials
- `OPENAI_API_KEY` - OpenAI API key
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN` - AWS credentials
- `MCP_SERVER_URL` - MCP server endpoint

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Setup agents and run all tests |
| `npm run setup` | Create agents (legacy) |
| `npm run setup:revamp` | Create agents (revamp setup for Bedrock, legacy for OpenAI) |
| `npm test` | Test both agents (parallel) |
| `npm run test:openai` | Test OpenAI agent only |
| `npm run test:bedrock` | Test Bedrock agent only |
| `npm run clean` | Remove output files |

## Run Specific Tests

```bash
# Run individual tests by name
npm test list-indices
npm test what-data image-input

# Run with specific agent
npm run test:openai -- list-indices
npm run test:bedrock -- what-data

# Run sequentially instead of parallel
npm test -- --sequential
```

## Available Tests

- `execute-ppl` - Execute PPL queries
- `frontend-tool-result` - Test frontend tool interactions
- `get-mapping` - Retrieve index mappings
- `image-input` - Test image input handling
- `list-indices` - List OpenSearch indices
- `list-tools` - List available tools
- `parallel-tool-results` - Test parallel tool execution
- `summarize-conversation` - Conversation summarization
- `try-each-backend-tool` - Test backend tools
- `what-data` - Query data information
- `what-page` - Page-related queries

## Output

Test results are saved to `outputs/` directory. Each test validates streaming response and checks for missing events. Streamed chunks are also consolidated in stdout for easier use.
