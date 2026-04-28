# AI Usage

This project uses Google Gemini (`gemini-1.5-flash`) as the implementation provider for both requested model choices from the brief.

## Assignment Substitution

The API will accept model choices such as `openai` and `anthropic`, but the content service routes both through Gemini because it is available on a free tier. Responses should report `model_used` as `gemini-1.5-flash` so the substitution is transparent.

## Development Assistance

Codex was used to initialize the scaffold, align it with the supplied starter-pack guidance, and create the first project structure. All generated code should be reviewed and tested as features are implemented.
