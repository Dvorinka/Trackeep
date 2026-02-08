# AI Assistant Integration

Trackeep now includes an AI assistant powered by Mistral AI that can help you organize and interact with your personal data.

## Features

- **Context-Aware Conversations**: The AI has access to your bookmarks, tasks, files, and notes to provide personalized assistance
- **Chat Sessions**: Create and manage multiple chat sessions for different topics
- **Configurable Context**: Choose which data types the AI can access in each conversation
- **Smart Responses**: Get help with finding information, organizing content, and planning tasks

## Setup

1. **Get a Mistral API Key**:
   - Sign up at [Mistral AI](https://mistral.ai/)
   - Get your API key from the dashboard
   - Add it to your `.env` file: `MISTRAL_API_KEY=your_key_here`

2. **Model Configuration**:
   - Default model: `mistral-small-latest` (cost-effective and capable)
   - Can be changed via `MISTRAL_MODEL` environment variable

## Usage

### Accessing the AI Assistant

1. Navigate to `/app/chat` in your Trackeep instance
2. Click "New Chat" to start a conversation
3. The AI will greet you and offer to help with your data

### Context Settings

Configure what data the AI can access:
- **Bookmarks**: Include saved links and articles
- **Tasks**: Include todo items and progress tracking
- **Files**: Include uploaded documents and media
- **Notes**: Include personal notes and documents

### Example Interactions

**Finding Content**:
```
User: Show me all bookmarks about machine learning
AI: I found 3 bookmarks related to machine learning:
1. "Introduction to Neural Networks" - https://example.com/neural-nets
2. "ML Best Practices" - https://example.com/ml-guide  
3. "Deep Learning Course" - https://example.com/dl-course
```

**Task Management**:
```
User: What tasks do I have due this week?
AI: You have 2 tasks due this week:
1. "Complete project proposal" (High priority) - Due in 2 days
2. "Review documentation" (Medium priority) - Due in 5 days
```

**Organization Help**:
```
User: Help me organize my learning resources
AI: I can see you have 15 bookmarks, 8 files, and 5 notes related to learning. Would you like me to suggest a tagging system or help you create a study plan?
```

## API Endpoints

### Chat Operations

- `POST /api/v1/chat/send` - Send a message
- `GET /api/v1/chat/sessions` - List chat sessions
- `GET /api/v1/chat/sessions/:id/messages` - Get session messages
- `DELETE /api/v1/chat/sessions/:id` - Delete session

### Request/Response Format

**Send Message Request**:
```json
{
  "message": "Your message here",
  "session_id": "optional-session-id",
  "context": {
    "bookmarks": true,
    "tasks": true,
    "files": false,
    "notes": true
  }
}
```

**Chat Response**:
```json
{
  "id": "chat-response-id",
  "message": "AI response here",
  "role": "assistant",
  "session_id": "session-id",
  "timestamp": "2024-01-27T16:30:00Z",
  "model": "mistral-small-latest",
  "token_usage": {
    "prompt_tokens": 150,
    "completion_tokens": 75,
    "total_tokens": 225
  },
  "context_used": ["bookmark:1", "task:3", "note:2"]
}
```

## Data Privacy

- All AI requests are processed securely through Mistral's API
- User data is only shared with the AI when explicitly enabled via context settings
- Chat history is stored locally in your Trackeep database
- No data is shared with third parties beyond the AI service

## Cost Management

The AI assistant uses `mistral-small-latest` which is optimized for cost:
- Approximately $0.60 per 1M input tokens
- Approximately $1.80 per 1M output tokens
- Typical conversations use 200-500 tokens total

To monitor costs:
- Check token usage in chat responses
- Review session history regularly
- Adjust context settings to limit data scope

## Troubleshooting

### Common Issues

**"Mistral API key not configured"**:
- Add `MISTRAL_API_KEY` to your `.env` file
- Restart the backend server

**"Failed to call AI" errors**:
- Check your API key is valid
- Verify internet connectivity
- Check Mistral service status

**Large response times**:
- Reduce context scope (disable some data types)
- Consider breaking complex questions into smaller parts

### Debug Mode

Set `GIN_MODE=debug` to see detailed API logs including:
- Token usage counts
- Context data being sent
- API response times

## Future Enhancements

Planned improvements to the AI assistant:
- Voice input/output support
- Advanced context filtering (date ranges, tags)
- Integration with external services
- Custom prompt templates
- Multi-language support
